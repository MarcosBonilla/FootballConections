# Servicio Backend: PartyKitGameRoom

## Descripción técnica
Room de PartyKit que gestiona el estado en memoria de una partida 1v1 en tiempo real. Maneja conexiones WebSocket de ambos jugadores, valida turnos, actualiza el timer, y sincroniza estado entre clientes.

## Ubicación
`partykit/rooms/game.ts`

---

## Room State Interface

```typescript
interface GameRoomState {
  matchId: string;
  player1: PlayerConnection;
  player2: PlayerConnection;
  
  // Game state
  status: 'waiting' | 'active' | 'finished';
  currentPlayerId: string;
  currentChainPlayerId: string;
  chain: ChainNode[];
  turnNumber: number;
  turnDeadlineAt: Date;
  
  // Disconnection handling
  disconnectedPlayers: Set<string>;
  reconnectTimers: Map<string, NodeJS.Timeout>;
  
  // Timer
  timerInterval: NodeJS.Timeout | null;
}

interface PlayerConnection {
  userId: string;
  username: string;
  elo: number;
  connectionId: string;
  lastPingAt: Date;
}

interface ChainNode {
  position: number;
  playerId: string;
  playerName: string;
  playedByUserId: string;
}
```

---

## Implementation

```typescript
import type * as Party from 'partykit/server';
import { GameValidationServiceImpl } from '@/services/game/GameValidationService';
import { ELOCalculatorImpl } from '@/services/game/ELOCalculator';
import { db } from '@/db/client';
import { matches, match_history } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default class GameRoom implements Party.Server {
  state: GameRoomState;
  validationService: GameValidationServiceImpl;
  eloCalculator: ELOCalculatorImpl;

  constructor(public room: Party.Room) {
    this.validationService = new GameValidationServiceImpl();
    this.eloCalculator = new ELOCalculatorImpl();
  }

  /**
   * Inicializar room al primer mensaje
   */
  async onStart() {
    const matchId = this.room.id;
    
    // Cargar estado de la partida desde BD
    const match = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
      with: {
        player1: true,
        player2: true,
        seed_player: true
      }
    });

    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    this.state = {
      matchId,
      player1: {
        userId: match.player1UserId,
        username: match.player1.username,
        elo: match.player1.currentElo,
        connectionId: null,
        lastPingAt: new Date()
      },
      player2: {
        userId: match.player2UserId,
        username: match.player2.username,
        elo: match.player2.currentElo,
        connectionId: null,
        lastPingAt: new Date()
      },
      status: match.status === 'active' ? 'active' : 'waiting',
      currentPlayerId: match.currentPlayerId,
      currentChainPlayerId: match.seedPlayerId,
      chain: [],
      turnNumber: 1,
      turnDeadlineAt: new Date(match.turnDeadlineAt),
      disconnectedPlayers: new Set(),
      reconnectTimers: new Map(),
      timerInterval: null
    };

    // Iniciar timer
    this.startTimer();
  }

  /**
   * Nueva conexión WebSocket
   */
  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const userId = this.getUserIdFromRequest(ctx.request);

    if (!userId) {
      conn.close(1008, 'Unauthorized');
      return;
    }

    // Asignar connectionId al jugador
    if (this.state.player1.userId === userId) {
      this.state.player1.connectionId = conn.id;
      this.state.player1.lastPingAt = new Date();
    } else if (this.state.player2.userId === userId) {
      this.state.player2.connectionId = conn.id;
      this.state.player2.lastPingAt = new Date();
    } else {
      conn.close(1008, 'Player not in this match');
      return;
    }

    // Si estaba desconectado, cancelar timer de reconexión
    if (this.state.disconnectedPlayers.has(userId)) {
      this.state.disconnectedPlayers.delete(userId);
      
      const timer = this.state.reconnectTimers.get(userId);
      if (timer) {
        clearTimeout(timer);
        this.state.reconnectTimers.delete(userId);
      }

      // Notificar reconexión al oponente
      this.broadcast(JSON.stringify({
        type: 'opponent_reconnected',
        user_id: userId
      }), [conn.id]); // Exclude el que se reconectó
    }

    // Enviar estado actual al jugador que se conecta
    conn.send(JSON.stringify({
      type: 'game_state',
      match: this.getMatchSnapshot()
    }));

    // Si ambos jugadores conectados y status 'waiting', iniciar partida
    if (
      this.state.status === 'waiting' &&
      this.state.player1.connectionId &&
      this.state.player2.connectionId
    ) {
      this.state.status = 'active';
      await this.saveMatchState();
      
      this.broadcast(JSON.stringify({
        type: 'game_started'
      }));
    }
  }

  /**
   * Mensaje recibido de un cliente
   */
  async onMessage(message: string, sender: Party.Connection) {
    const msg = JSON.parse(message);
    const userId = this.getUserIdFromConnection(sender);

    if (!userId) return;

    switch (msg.type) {
      case 'play':
        await this.handlePlay(msg.input_text, userId, sender);
        break;

      case 'leave':
        await this.handleLeave(userId);
        break;

      case 'ping':
        this.handlePing(userId);
        break;
    }
  }

  /**
   * Manejar turno (jugada)
   */
  private async handlePlay(inputText: string, userId: string, sender: Party.Connection) {
    // Verificar que sea el turno del jugador
    if (this.state.currentPlayerId !== userId) {
      sender.send(JSON.stringify({
        type: 'error',
        message: 'Not your turn'
      }));
      return;
    }

    // Validar movimiento
    const validation = await this.validationService.validateMove(
      inputText,
      this.state.currentChainPlayerId,
      this.state.chain.map(n => n.playerId)
    );

    if (!validation.valid) {
      // Turno inválido → NO termina la partida, solo muestra error
      // El jugador puede seguir intentando mientras tenga tiempo
      
      // Enviar error al jugador que lo intentó
      sender.send(JSON.stringify({
        type: 'invalid_attempt',
        input: inputText,
        error: validation.error,
        error_message: validation.errorMessage
      }));
      
      // Broadcast al rival para que vea el intento inválido en tiempo real
      const opponentId = this.getOpponentId(userId);
      const opponentConn = this.getConnection(opponentId);
      if (opponentConn) {
        opponentConn.send(JSON.stringify({
          type: 'rival_invalid_attempt',
          input: inputText,
          error: validation.error
        }));
      }
      
      // NO se termina el juego, el timer continúa
      return;
    }

    // Turno válido → agregar a cadena
    const newNode: ChainNode = {
      position: this.state.chain.length + 1,
      playerId: validation.player.id,
      playerName: validation.player.name,
      playedByUserId: userId
    };

    this.state.chain.push(newNode);
    this.state.currentChainPlayerId = validation.player.id;

    // Cambiar turno
    const nextPlayerId = this.getOpponentId(userId);
    this.state.currentPlayerId = nextPlayerId;
    this.state.turnNumber++;
    this.state.turnDeadlineAt = new Date(Date.now() + 20000); // +20s

    // Broadcast a ambos jugadores
    this.broadcast(JSON.stringify({
      type: 'turn_valid',
      position: newNode.position,
      player_id: newNode.playerId,
      player_name: newNode.playerName,
      played_by_user_id: newNode.playedByUserId,
      next_player_id: nextPlayerId,
      turn_deadline: this.state.turnDeadlineAt.toISOString()
    }));

    // Persistir en BD
    await this.saveMatchState();
  }

  /**
   * Manejar abandono voluntario
   */
  private async handleLeave(userId: string) {
    await this.endGame({
      winnerId: this.getOpponentId(userId),
      loserId: userId,
      reason: 'resign'
    });
  }

  /**
   * Manejar ping (keep-alive)
   */
  private handlePing(userId: string) {
    if (this.state.player1.userId === userId) {
      this.state.player1.lastPingAt = new Date();
    } else if (this.state.player2.userId === userId) {
      this.state.player2.lastPingAt = new Date();
    }
  }

  /**
   * Desconexión de jugador
   */
  async onClose(conn: Party.Connection) {
    const userId = this.getUserIdFromConnection(conn);
    if (!userId) return;

    // Marcar como desconectado
    this.state.disconnectedPlayers.add(userId);

    // Notificar al oponente
    this.broadcast(JSON.stringify({
      type: 'opponent_disconnected',
      user_id: userId,
      grace_period_seconds: 10
    }), [conn.id]);

    // Iniciar timer de reconexión (10s)
    const reconnectTimer = setTimeout(async () => {
      // Si sigue desconectado después de 10s → pierde
      if (this.state.disconnectedPlayers.has(userId)) {
        await this.endGame({
          winnerId: this.getOpponentId(userId),
          loserId: userId,
          reason: 'disconnect'
        });
      }
    }, 10000);

    this.state.reconnectTimers.set(userId, reconnectTimer);
  }

  /**
   * Timer de turno (corre cada 1s)
   */
  private startTimer() {
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
    }

    this.state.timerInterval = setInterval(async () => {
      if (this.state.status !== 'active') return;

      const now = Date.now();
      const deadline = this.state.turnDeadlineAt.getTime();

      if (now >= deadline) {
        // Timeout → jugador actual pierde
        await this.endGame({
          winnerId: this.getOpponentId(this.state.currentPlayerId),
          loserId: this.state.currentPlayerId,
          reason: 'timeout'
        });
      }
    }, 1000);
  }

  /**
   * Terminar partida
   */
  private async endGame(params: {
    winnerId: string;
    loserId: string;
    reason: 'timeout' | 'disconnect' | 'resign';  // NO incluye 'invalid_answer'
  }) {
    if (this.state.status === 'finished') return;

    this.state.status = 'finished';

    // Detener timer
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
      this.state.timerInterval = null;
    }

    // Calcular cambios de ELO
    const winner = params.winnerId === this.state.player1.userId 
      ? this.state.player1 
      : this.state.player2;
    const loser = params.loserId === this.state.player1.userId 
      ? this.state.player1 
      : this.state.player2;

    const eloChanges = await this.eloCalculator.calculateEloChange({
      winnerUserId: winner.userId,
      winnerElo: winner.elo,
      loserUserId: loser.userId,
      loserElo: loser.elo
    });

    // Persistir resultado en BD
    await this.saveGameResult({
      ...params,
      eloChanges
    });

    // Broadcast game_over
    this.broadcast(JSON.stringify({
      type: 'game_over',
      winner_user_id: params.winnerId,
      loser_user_id: params.loserId,
      reason: params.reason,
      final_chain: this.state.chain,
      elo_changes: eloChanges,
      invalid_input: params.invalidInput,
      validation_error: params.validationError
    }));
  }

  /**
   * Persistir estado de la partida en BD
   */
  private async saveMatchState() {
    await db.update(matches)
      .set({
        status: this.state.status,
        currentPlayerId: this.state.currentPlayerId,
        currentChainPlayerId: this.state.currentChainPlayerId,
        turnNumber: this.state.turnNumber,
        turnDeadlineAt: this.state.turnDeadlineAt,
        chainSnapshot: this.state.chain,
        updatedAt: new Date()
      })
      .where(eq(matches.id, this.state.matchId));
  }

  /**
   * Guardar resultado final en BD
   */
  private async saveGameResult(params: any) {
    await db.transaction(async (tx) => {
      // Actualizar match
      await tx.update(matches)
        .set({
          status: 'finished',
          winnerUserId: params.winnerId,
          endedAt: new Date(),
          endReason: params.reason,
          finalChain: this.state.chain
        })
        .where(eq(matches.id, this.state.matchId));

      // Insertar en match_history
      await tx.insert(match_history).values({
        matchId: this.state.matchId,
        player1UserId: this.state.player1.userId,
        player2UserId: this.state.player2.userId,
        winnerUserId: params.winnerId,
        loserUserId: params.loserId,
        endReason: params.reason,
        chainLength: this.state.chain.length,
        durationSeconds: Math.floor((Date.now() - this.room.createdAt) / 1000),
        player1EloChange: params.eloChanges[this.state.player1.userId].delta,
        player2EloChange: params.eloChanges[this.state.player2.userId].delta,
        playedAt: new Date()
      });

      // Actualizar ELO de jugadores
      await this.eloCalculator.applyEloChange(params.eloChanges);
    });
  }

  // Helper methods
  private getOpponentId(userId: string): string {
    return userId === this.state.player1.userId 
      ? this.state.player2.userId 
      : this.state.player1.userId;
  }

  private getUserIdFromConnection(conn: Party.Connection): string | null {
    if (this.state.player1.connectionId === conn.id) return this.state.player1.userId;
    if (this.state.player2.connectionId === conn.id) return this.state.player2.userId;
    return null;
  }

  private getConnection(userId: string): Party.Connection | null {
    const connId = userId === this.state.player1.userId 
      ? this.state.player1.connectionId 
      : this.state.player2.connectionId;
    
    if (!connId) return null;
    
    return this.room.getConnection(connId);
  }

  private getUserIdFromRequest(req: Request): string | null {
    // Extract from JWT token or session
    // Implementation depends on auth system
    return null; // TODO
  }

  private getMatchSnapshot() {
    return {
      matchId: this.state.matchId,
      player1: {
        userId: this.state.player1.userId,
        username: this.state.player1.username,
        elo: this.state.player1.elo
      },
      player2: {
        userId: this.state.player2.userId,
        username: this.state.player2.username,
        elo: this.state.player2.elo
      },
      currentPlayerId: this.state.currentPlayerId,
      currentChainPlayer: {
        playerId: this.state.currentChainPlayerId,
        playerName: this.getPlayerName(this.state.currentChainPlayerId)
      },
      chain: this.state.chain,
      turnDeadline: this.state.turnDeadlineAt.toISOString(),
      status: this.state.status
    };
  }

  private getPlayerName(playerId: string): string {
    const node = this.state.chain.find(n => n.playerId === playerId);
    return node?.playerName || 'Seed Player';
  }
}
```

---

## WebSocket Events

### Client → Server (Incoming)

```typescript
// Mensaje de jugada
{
  type: 'play',
  input: string  // Nombre del jugador que el usuario escribe
}

// Abandonar partida
{
  type: 'leave'
}

// Ping de keep-alive
{
  type: 'ping'
}
```

### Server → Client (Outgoing)

```typescript
// Respuesta inválida (NO termina el juego)
{
  type: 'invalid_attempt',
  input: string,                    // Lo que el jugador escribió
  error: 'not_found' | 'no_edge' | 'already_used',
  error_message: string
}

// Intento inválido del rival (vista en tiempo real)
{
  type: 'rival_invalid_attempt',
  input: string,                    // Lo que el rival escribió
  error: 'not_found' | 'no_edge' | 'already_used'
}

// Turno válido (se agregó a la cadena)
{
  type: 'turn_valid',
  position: number,
  player_id: string,
  player_name: string,
  played_by_user_id: string,
  next_player_id: string,
  turn_deadline: string  // ISO timestamp
}

// Juego terminado (solo por timeout o abandono)
{
  type: 'game_over',
  winner_id: string,
  loser_id: string,
  reason: 'timeout' | 'disconnect' | 'leave',  // NO 'invalid_answer'
  final_chain: ChainNode[],
  elo_changes: {
    [userId: string]: { oldElo: number; newElo: number; delta: number }
  }
}

// Rival desconectado
{
  type: 'opponent_disconnected',
  seconds_until_forfeit: number  // 10s
}

// Rival reconectado
{
  type: 'opponent_reconnected'
}

// Estado completo (al conectar)
{
  type: 'game_state',
  ...GameRoomState
}

// Error genérico
{
  type: 'error',
  message: string
}
```

---

## Testing Strategy

```typescript
describe('PartyKitGameRoom', () => {
  it('should initialize game state from database', async () => {
    // Mock match en BD
    // Crear room
    // Verificar state.matchId, player1, player2
  });

  it('should allow valid turn and switch players', async () => {
    // Simular mensaje 'play' con input válido
    // Verificar chain actualizada
    // Verificar currentPlayerId cambió
  });

  it('should send error on invalid turn but NOT end game', async () => {
    // Simular 'play' con input inválido
    // Verificar mensaje 'invalid_attempt' enviado al jugador
    // Verificar mensaje 'rival_invalid_attempt' al rival
    // Verificar que NO se envió 'game_over'
    // Verificar que currentPlayerId NO cambió (sigue siendo su turno)
    // Verificar que el timer sigue corriendo
  });

  it('should allow multiple invalid attempts without ending game', async () => {
    // Simular 10 intentos inválidos consecutivos
    // Verificar que se envían 10 mensajes de error
    // Verificar que el juego NO termina
    // Verificar que el jugador puede enviar un intento válido después
  });

  it('should end game on timeout', async () => {
    // Avanzar timer a deadline
    // Verificar game_over con reason 'timeout'
  });

  it('should handle disconnection with grace period', async () => {
    // Simular onClose
    // Verificar opponent_disconnected emitido
    // Esperar <10s y reconectar → verificar no termina
    // Esperar >10s sin reconectar → verificar termina
  });

  it('should prevent playing out of turn', async () => {
    // Player 2 intenta jugar cuando es turno de Player 1
    // Verificar error message
  });
});
```

---

## Performance Notes

- **Room state en memoria** (Durable Objects) → latencia ultra-baja
- **Broadcast escalable** → PartyKit maneja conexiones eficientemente
- **Persistencia selectiva** → solo se guarda en BD al final de turno y al terminar partida
- **Timer server-side** → clientes sincronizan pero server es source of truth

---

## Deployment

PartyKit se despliega en Cloudflare Workers:

```bash
npx partykit deploy
```

Environment variables required:
- `DATABASE_URL` — Supabase connection string
- `REDIS_URL` — Upstash Redis URL
