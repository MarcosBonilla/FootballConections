import type * as Party from 'partykit/server';
import type {
  GameEvent,
  ServerEvent,
  GameState,
  PlayerInfo,
  ChainNode,
  Player,
  EndReason,
} from '../types';
import { supabase } from '@football-connections/database';
import { GAME_CONFIG } from '@football-connections/shared';

interface RoomState {
  matchId: string;
  player1: PlayerInfo;
  player2: PlayerInfo;
  player1ConnectionId: string | null;
  player2ConnectionId: string | null;
  
  status: 'waiting' | 'active' | 'finished';
  currentPlayerId: string;
  currentChainPlayer: Player;
  seedPlayer: Player;
  chain: ChainNode[];
  turnNumber: number;
  turnDeadlineAt: Date;
  
  disconnectedPlayers: Set<string>;
  reconnectTimers: Map<string, ReturnType<typeof setTimeout>>;
  timerInterval: ReturnType<typeof setInterval> | null;
}

export default class GameRoom implements Party.Server {
  state: RoomState | null = null;

  constructor(public room: Party.Room) {}

  /**
   * Inicializar room cuando alguien se conecta
   */
  async onStart() {
    const matchId = this.room.id;
    console.log(`[GameRoom] Starting room for match ${matchId}`);

    // Cargar match de Supabase
    const { data: match, error } = await supabase
      .from('matches')
      .select(`
        *,
        player1:users!player1_user_id(id, username),
        player2:users!player2_user_id(id, username),
        seedPlayer:players!seed_player_id(id, name, position, nationality)
      `)
      .eq('id', matchId)
      .single();

    if (error || !match) {
      console.error(`[GameRoom] Match ${matchId} not found:`, error);
      throw new Error(`Match ${matchId} not found`);
    }

    // Obtener ratings de los jugadores
    const { data: ratings } = await supabase
      .from('player_ratings')
      .select('user_id, elo')
      .in('user_id', [match.player1_user_id, match.player2_user_id]);

    const player1Rating = ratings?.find(r => r.user_id === match.player1_user_id)?.elo || 1200;
    const player2Rating = ratings?.find(r => r.user_id === match.player2_user_id)?.elo || 1200;

    // Cargar cadena existente si hay
    const { data: chainNodes } = await supabase
      .from('match_chain_nodes')
      .select('*, player:players(id, name, position, nationality)')
      .eq('match_id', matchId)
      .order('position', { ascending: true });

    const chain: ChainNode[] = chainNodes?.map(node => ({
      position: node.position,
      player: {
        id: node.player.id,
        name: node.player.name,
        position: node.player.position,
        nationality: node.player.nationality,
      },
      playedByUserId: node.played_by_user_id,
      playedAt: node.created_at,
    })) || [];

    // El jugador actual de la cadena es el último o el seed
    const currentChainPlayer = chain.length > 0 
      ? chain[chain.length - 1].player 
      : {
          id: match.seed_player_id,
          name: match.seedPlayer.name,
          position: match.seedPlayer.position,
          nationality: match.seedPlayer.nationality,
        };

    this.state = {
      matchId,
      player1: {
        userId: match.player1_user_id,
        username: match.player1.username,
        elo: player1Rating,
        connected: false,
      },
      player2: {
        userId: match.player2_user_id,
        username: match.player2.username,
        elo: player2Rating,
        connected: false,
      },
      player1ConnectionId: null,
      player2ConnectionId: null,
      status: match.status,
      currentPlayerId: match.current_player_id,
      currentChainPlayer,
      seedPlayer: {
        id: match.seed_player_id,
        name: match.seedPlayer.name,
        position: match.seedPlayer.position,
        nationality: match.seedPlayer.nationality,
      },
      chain,
      turnNumber: match.turn_number || 1,
      turnDeadlineAt: new Date(match.turn_deadline_at),
      disconnectedPlayers: new Set(),
      reconnectTimers: new Map(),
      timerInterval: null,
    };

    console.log(`[GameRoom] Room initialized for match ${matchId}, status: ${match.status}`);
  }

  /**
   * Nueva conexión WebSocket
   */
  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    if (!this.state) {
      await this.onStart();
    }

    const userId = this.getUserIdFromRequest(ctx.request);
    if (!userId) {
      console.warn('[GameRoom] Connection without userId');
      conn.close(1008, 'Unauthorized');
      return;
    }

    console.log(`[GameRoom] User ${userId} connecting to match ${this.state!.matchId}`);

    // Verificar que el usuario es parte de la partida
    if (userId !== this.state!.player1.userId && userId !== this.state!.player2.userId) {
      console.warn(`[GameRoom] User ${userId} not part of match ${this.state!.matchId}`);
      conn.close(1008, 'Not authorized for this match');
      return;
    }

    // Asignar connectionId
    if (userId === this.state!.player1.userId) {
      this.state!.player1ConnectionId = conn.id;
      this.state!.player1.connected = true;
    } else {
      this.state!.player2ConnectionId = conn.id;
      this.state!.player2.connected = true;
    }

    // Si estaba desconectado, cancelar timer de reconexión
    if (this.state!.disconnectedPlayers.has(userId)) {
      const timer = this.state!.reconnectTimers.get(userId);
      if (timer) {
        clearTimeout(timer);
        this.state!.reconnectTimers.delete(userId);
      }
      this.state!.disconnectedPlayers.delete(userId);
      console.log(`[GameRoom] User ${userId} reconnected`);
    }

    // Enviar estado actual al jugador que se conecta
    this.sendToConnection(conn, {
      type: 'game:state',
      state: this.getGameState(),
    });

    // Notificar al otro jugador
    this.broadcast({
      type: 'player:connected',
      userId,
    }, conn.id);

    // Si ambos están conectados y status es waiting, iniciar juego
    if (this.state!.status === 'waiting' && 
        this.state!.player1.connected && 
        this.state!.player2.connected) {
      await this.startGame();
    }

    // Si el juego está activo, iniciar/verificar timer
    if (this.state!.status === 'active' && !this.state!.timerInterval) {
      this.startTimer();
    }
  }

  /**
   * Mensaje recibido de un cliente
   */
  async onMessage(message: string, sender: Party.Connection) {
    if (!this.state) return;

    try {
      const event: GameEvent = JSON.parse(message);
      const userId = this.getUserIdFromConnection(sender);

      if (!userId) {
        console.warn('[GameRoom] Message from unknown user');
        return;
      }

      console.log(`[GameRoom] Event ${event.type} from ${userId}`);

      switch (event.type) {
        case 'player:ready':
          await this.handlePlayerReady(userId, sender);
          break;

        case 'player:move':
          await this.handlePlayerMove(userId, event.playerName, sender);
          break;

        case 'player:surrender':
          await this.handleSurrender(userId);
          break;

        case 'ping':
          this.sendToConnection(sender, { type: 'pong' });
          break;

        default:
          console.warn(`[GameRoom] Unknown event type: ${(event as any).type}`);
      }
    } catch (error) {
      console.error('[GameRoom] Error processing message:', error);
      this.sendToConnection(sender, {
        type: 'error',
        message: 'Failed to process message',
      });
    }
  }

  /**
   * Desconexión de un cliente
   */
  async onClose(conn: Party.Connection) {
    if (!this.state) return;

    const userId = this.getUserIdFromConnection(conn);
    if (!userId) return;

    console.log(`[GameRoom] User ${userId} disconnected`);

    // Marcar como desconectado
    if (userId === this.state.player1.userId) {
      this.state.player1.connected = false;
      this.state.player1ConnectionId = null;
    } else {
      this.state.player2.connected = false;
      this.state.player2ConnectionId = null;
    }

    // Si el juego no ha terminado, iniciar timer de reconexión
    if (this.state.status === 'active') {
      this.state.disconnectedPlayers.add(userId);

      const timer = setTimeout(async () => {
        console.log(`[GameRoom] User ${userId} did not reconnect, ending game`);
        await this.endGame(
          userId === this.state!.player1.userId ? this.state!.player2.userId : this.state!.player1.userId,
          'disconnect'
        );
      }, GAME_CONFIG.DISCONNECT_GRACE_PERIOD_MS);

      this.state.reconnectTimers.set(userId, timer);
    }

    // Notificar al otro jugador
    this.broadcast({
      type: 'player:disconnected',
      userId,
    });
  }

  /**
   * Iniciar el juego
   */
  private async startGame() {
    if (!this.state || this.state.status !== 'waiting') return;

    console.log(`[GameRoom] Starting game ${this.state.matchId}`);

    // Determinar quién juega primero (menor user_id)
    const firstPlayerId = this.state.player1.userId < this.state.player2.userId 
      ? this.state.player1.userId 
      : this.state.player2.userId;

    this.state.currentPlayerId = firstPlayerId;
    this.state.status = 'active';
    this.state.turnDeadlineAt = new Date(Date.now() + GAME_CONFIG.TURN_TIME_SECONDS * 1000);

    // Actualizar en BD
    await supabase
      .from('matches')
      .update({
        status: 'active',
        current_player_id: firstPlayerId,
        turn_deadline_at: this.state.turnDeadlineAt.toISOString(),
        started_at: new Date().toISOString(),
      })
      .eq('id', this.state.matchId);

    // Notificar a ambos jugadores
    this.broadcast({
      type: 'game:start',
      firstPlayerId,
      seedPlayer: this.state.seedPlayer,
    });

    // Iniciar timer
    this.startTimer();
  }

  /**
   * Manejar movimiento de jugador
   */
  private async handlePlayerMove(userId: string, playerName: string, sender: Party.Connection) {
    if (!this.state || this.state.status !== 'active') {
      this.sendToConnection(sender, {
        type: 'error',
        message: 'Game is not active',
      });
      return;
    }

    // Verificar que es el turno del jugador
    if (userId !== this.state.currentPlayerId) {
      this.sendToConnection(sender, {
        type: 'error',
        message: 'Not your turn',
      });
      return;
    }

    // Verificar que no expiró el tiempo
    if (Date.now() > this.state.turnDeadlineAt.getTime()) {
      console.log(`[GameRoom] Move arrived after timeout for ${userId}`);
      await this.endGame(
        userId === this.state.player1.userId ? this.state.player2.userId : this.state.player1.userId,
        'timeout'
      );
      return;
    }

    console.log(`[GameRoom] Processing move: ${playerName} by ${userId}`);

    // Buscar jugador por nombre (fuzzy search)
    const { data: players, error: searchError } = await supabase
      .from('players')
      .select('id, name, position, nationality')
      .ilike('name', `%${playerName.trim()}%`)
      .limit(1);

    if (searchError || !players || players.length === 0) {
      this.sendToConnection(sender, {
        type: 'game:move:invalid',
        reason: 'Player not found',
      });
      return;
    }

    const nextPlayer = players[0];

    // Validar que es compañero del jugador actual
    const { data: edge, error: edgeError } = await supabase
      .from('teammate_edges')
      .select('weight_score')
      .eq('player_id', this.state.currentChainPlayer.id)
      .eq('teammate_id', nextPlayer.id)
      .single();

    if (edgeError || !edge) {
      this.sendToConnection(sender, {
        type: 'game:move:invalid',
        reason: 'Players never played together',
      });
      return;
    }

    // Validar que no fue usado antes
    const usedBefore = this.state.chain.some(node => node.player.id === nextPlayer.id) ||
                       this.state.seedPlayer.id === nextPlayer.id;

    if (usedBefore) {
      this.sendToConnection(sender, {
        type: 'game:move:invalid',
        reason: 'Player already used in this match',
      });
      return;
    }

    // ✅ Movimiento válido
    const newNode: ChainNode = {
      position: this.state.chain.length + 1,
      player: nextPlayer,
      playedByUserId: userId,
      playedAt: new Date().toISOString(),
    };

    this.state.chain.push(newNode);
    this.state.currentChainPlayer = nextPlayer;

    // Cambiar turno
    const nextUserId = userId === this.state.player1.userId 
      ? this.state.player2.userId 
      : this.state.player1.userId;

    this.state.currentPlayerId = nextUserId;
    this.state.turnNumber++;
    this.state.turnDeadlineAt = new Date(Date.now() + GAME_CONFIG.TURN_TIME_SECONDS * 1000);

    // Guardar en BD
    await Promise.all([
      supabase.from('match_chain_nodes').insert({
        match_id: this.state.matchId,
        player_id: nextPlayer.id,
        position: newNode.position,
        played_by_user_id: userId,
      }),
      supabase.from('match_turns').insert({
        match_id: this.state.matchId,
        user_id: userId,
        turn_number: this.state.turnNumber - 1,
        player_id: nextPlayer.id,
        time_taken_ms: GAME_CONFIG.TURN_TIME_SECONDS * 1000 - (this.state.turnDeadlineAt.getTime() - Date.now()),
      }),
      supabase.from('matches').update({
        current_player_id: nextUserId,
        turn_number: this.state.turnNumber,
        turn_deadline_at: this.state.turnDeadlineAt.toISOString(),
      }).eq('id', this.state.matchId),
    ]);

    // Notificar a ambos jugadores
    this.broadcast({
      type: 'game:move:valid',
      node: newNode,
      nextPlayer,
    });

    // Reiniciar timer
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
    }
    this.startTimer();
  }

  /**
   * Manejar rendición
   */
  private async handleSurrender(userId: string) {
    if (!this.state || this.state.status !== 'active') return;

    console.log(`[GameRoom] User ${userId} surrendered`);

    const winnerId = userId === this.state.player1.userId 
      ? this.state.player2.userId 
      : this.state.player1.userId;

    await this.endGame(winnerId, 'resign');
  }

  /**
   * Manejar player ready
   */
  private async handlePlayerReady(userId: string, sender: Party.Connection) {
    console.log(`[GameRoom] User ${userId} ready`);
    // El juego se inicia automáticamente en onConnect cuando ambos están conectados
  }

  /**
   * Iniciar timer del turno
   */
  private startTimer() {
    if (!this.state) return;

    this.state.timerInterval = setInterval(() => {
      if (!this.state || this.state.status !== 'active') {
        if (this.state?.timerInterval) {
          clearInterval(this.state.timerInterval);
          this.state.timerInterval = null;
        }
        return;
      }

      const timeLeft = Math.max(0, Math.floor((this.state.turnDeadlineAt.getTime() - Date.now()) / 1000));

      // Enviar update cada segundo
      this.broadcast({
        type: 'game:turn',
        playerId: this.state.currentPlayerId,
        timeLeft,
      });

      // Si se acabó el tiempo, terminar juego
      if (timeLeft === 0) {
        const winnerId = this.state.currentPlayerId === this.state.player1.userId
          ? this.state.player2.userId
          : this.state.player1.userId;

        this.endGame(winnerId, 'timeout');
      }
    }, 1000);
  }

  /**
   * Terminar juego y calcular ELO
   */
  private async endGame(winnerId: string, reason: EndReason) {
    if (!this.state || this.state.status === 'finished') return;

    console.log(`[GameRoom] Ending game ${this.state.matchId}, winner: ${winnerId}, reason: ${reason}`);

    this.state.status = 'finished';

    // Detener timer
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
      this.state.timerInterval = null;
    }

    // Limpiar timers de reconexión
    this.state.reconnectTimers.forEach(timer => clearTimeout(timer));
    this.state.reconnectTimers.clear();

    const loserId = winnerId === this.state.player1.userId 
      ? this.state.player2.userId 
      : this.state.player1.userId;

    // Calcular ELO (llamar a API REST)
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    
    try {
      const response = await fetch(`${apiUrl}/internal/matches/${this.state.matchId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerId, loserId, reason }),
      });

      if (!response.ok) {
        console.error('[GameRoom] Failed to complete match:', await response.text());
      }

      const result = await response.json();

      // Notificar resultado a ambos jugadores
      this.broadcast({
        type: 'game:end',
        winner: winnerId,
        reason,
        eloChanges: result.eloChanges,
      });

    } catch (error) {
      console.error('[GameRoom] Error completing match:', error);
      
      // Notificar sin ELO changes
      this.broadcast({
        type: 'game:end',
        winner: winnerId,
        reason,
        eloChanges: {
          winner: { userId: winnerId, oldElo: 0, newElo: 0, delta: 0 },
          loser: { userId: loserId, oldElo: 0, newElo: 0, delta: 0 },
        },
      });
    }
  }

  /**
   * Obtener estado actual del juego
   */
  private getGameState(): GameState {
    if (!this.state) {
      throw new Error('State not initialized');
    }

    return {
      matchId: this.state.matchId,
      status: this.state.status,
      players: {
        player1: this.state.player1,
        player2: this.state.player2,
      },
      currentPlayerId: this.state.currentPlayerId,
      currentChainPlayer: this.state.currentChainPlayer,
      chain: this.state.chain,
      turnNumber: this.state.turnNumber,
      turnDeadlineAt: this.state.turnDeadlineAt.toISOString(),
      timeLeft: Math.max(0, Math.floor((this.state.turnDeadlineAt.getTime() - Date.now()) / 1000)),
    };
  }

  /**
   * Enviar mensaje a una conexión específica
   */
  private sendToConnection(conn: Party.Connection, event: ServerEvent) {
    conn.send(JSON.stringify(event));
  }

  /**
   * Broadcast a todas las conexiones (excepto excluded)
   */
  private broadcast(event: ServerEvent, excludedConnectionId?: string) {
    const message = JSON.stringify(event);
    
    this.room.getConnections().forEach(conn => {
      if (excludedConnectionId && conn.id === excludedConnectionId) return;
      conn.send(message);
    });
  }

  /**
   * Extraer userId del request (desde query param o header)
   */
  private getUserIdFromRequest(request: Request): string | null {
    const url = new URL(request.url);
    return url.searchParams.get('userId');
  }

  /**
   * Obtener userId de una conexión
   */
  private getUserIdFromConnection(conn: Party.Connection): string | null {
    if (!this.state) return null;

    if (conn.id === this.state.player1ConnectionId) {
      return this.state.player1.userId;
    }
    if (conn.id === this.state.player2ConnectionId) {
      return this.state.player2.userId;
    }

    return null;
  }
}
