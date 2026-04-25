# Servicio Backend: GameValidationService

## Descripción técnica
Servicio que valida movimientos durante la partida: verifica que el jugador existe, que ha jugado con el jugador actual de la cadena, que no está repetido en la cadena, y que tiene suficientes minutos compartidos.

## Ubicación
`src/services/game/GameValidationService.ts`

---

## Dependencies

```typescript
import { db } from '@/db/client';
import { players, teammate_edges, matches, match_history } from '@/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
```

---

## Service Interface

```typescript
export interface GameValidationService {
  // Validar movimiento
  validateMove(
    inputText: string,
    currentChainPlayerId: string,
    alreadyUsedPlayerIds: string[]
  ): Promise<ValidationResult>;
  
  // Normalizar nombre de jugador
  normalizeName(name: string): string;
}

interface ValidationResult {
  valid: boolean;
  player?: {
    id: string;
    name: string;
  };
  error?: 'not_found' | 'no_edge' | 'already_used' | 'insufficient_minutes';
  errorMessage?: string;
}
```

---

## Implementation

```typescript
export class GameValidationServiceImpl implements GameValidationService {
  
  /**
   * Validar un movimiento del jugador
   */
  async validateMove(
    inputText: string,
    currentChainPlayerId: string,
    alreadyUsedPlayerIds: string[]
  ): Promise<ValidationResult> {
    
    // 1. Normalizar input (quitar diacríticos, lowercase, trim)
    const normalizedInput = this.normalizeName(inputText);
    
    // 2. Buscar jugador por nombre (fuzzy match con umbral alto)
    const player = await this.findPlayerByName(normalizedInput);
    
    if (!player) {
      return {
        valid: false,
        error: 'not_found',
        errorMessage: `Player "${inputText}" not found`
      };
    }
    
    // 3. Verificar que no esté ya usado en la cadena
    if (alreadyUsedPlayerIds.includes(player.id)) {
      return {
        valid: false,
        error: 'already_used',
        errorMessage: `${player.name} already used in this chain`
      };
    }
    
    // 4. Verificar que existe edge con el jugador actual
    const edge = await this.findTeammateEdge(currentChainPlayerId, player.id);
    
    if (!edge) {
      return {
        valid: false,
        error: 'no_edge',
        errorMessage: `${player.name} never played with current player`
      };
    }
    
    // 5. Verificar minutos mínimos (≥ 90 minutos juntos)
    if (edge.minutesTogether < 90) {
      return {
        valid: false,
        error: 'insufficient_minutes',
        errorMessage: `Insufficient playtime: ${edge.minutesTogether} minutes (minimum 90)`
      };
    }
    
    // Validación exitosa
    return {
      valid: true,
      player: {
        id: player.id,
        name: player.name
      }
    };
  }
  
  /**
   * Buscar jugador por nombre con fuzzy matching
   */
  private async findPlayerByName(normalizedName: string): Promise<{ id: string; name: string } | null> {
    // Usar PostgreSQL similarity (pg_trgm extension)
    const results = await db
      .select({
        id: players.id,
        name: players.name,
        similarity: sql<number>`similarity(${players.normalizedName}, ${normalizedName})`
      })
      .from(players)
      .where(sql`similarity(${players.normalizedName}, ${normalizedName}) > 0.7`)
      .orderBy(sql`similarity(${players.normalizedName}, ${normalizedName}) DESC`)
      .limit(1);
    
    if (results.length === 0) return null;
    
    return {
      id: results[0].id,
      name: results[0].name
    };
  }
  
  /**
   * Buscar edge entre dos jugadores
   */
  private async findTeammateEdge(
    player1Id: string,
    player2Id: string
  ): Promise<{ minutesTogether: number } | null> {
    // Buscar edge en ambas direcciones (tabla simétrica posible)
    const edge = await db
      .select({
        minutesTogether: teammate_edges.minutesTogether
      })
      .from(teammate_edges)
      .where(
        or(
          and(
            eq(teammate_edges.player1Id, player1Id),
            eq(teammate_edges.player2Id, player2Id)
          ),
          and(
            eq(teammate_edges.player1Id, player2Id),
            eq(teammate_edges.player2Id, player1Id)
          )
        )
      )
      .limit(1);
    
    if (edge.length === 0) return null;
    
    return {
      minutesTogether: edge[0].minutesTogether
    };
  }
  
  /**
   * Normalizar nombre de jugador
   * Removes diacritics, lowercase, trim
   */
  normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD') // Decompose diacritics
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .trim()
      .replace(/\s+/g, ' '); // Collapse multiple spaces
  }
}
```

---

## Database Schema Notes

La tabla `players` debe tener un campo `normalizedName` pre-calculado:

```sql
ALTER TABLE players ADD COLUMN normalized_name TEXT;

-- Poblar con nombres normalizados
UPDATE players 
SET normalized_name = lower(unaccent(name));

-- Índice para búsquedas rápidas
CREATE INDEX idx_players_normalized_name_trgm 
ON players USING gin (normalized_name gin_trgm_ops);
```

---

## Usage in PartyKit Room

```typescript
// En PartyKitGameRoom cuando llega mensaje 'play'
import { GameValidationServiceImpl } from '@/services/game/GameValidationService';

const validationService = new GameValidationServiceImpl();

async onMessage(message: string, sender: Connection) {
  const msg = JSON.parse(message);
  
  if (msg.type === 'play') {
    const { input_text } = msg;
    
    // Obtener estado de la partida
    const match = this.state.match;
    
    // Validar movimiento
    const validation = await validationService.validateMove(
      input_text,
      match.currentChainPlayerId,
      match.chain.map(node => node.playerId)
    );
    
    if (!validation.valid) {
      // Respuesta inválida → NO termina la partida
      // Solo envía mensaje de error al jugador
      sender.send(JSON.stringify({
        type: 'invalid_attempt',
        input: input_text,
        error: validation.error,
        error_message: validation.errorMessage
      }));
      
      // Broadcast al rival para que vea el intento en tiempo real
      const opponentId = this.getOpponentId(sender.id);
      const opponentConn = this.getConnection(opponentId);
      if (opponentConn) {
        opponentConn.send(JSON.stringify({
          type: 'rival_invalid_attempt',
          input: input_text,
          error: validation.error
        }));
      }
      
      // NO se termina el juego, el jugador puede seguir intentando
      return;
    }
    
    // Validación exitosa → agregar a cadena
    const newNode = {
      position: match.chain.length + 1,
      playerId: validation.player.id,
      playerName: validation.player.name,
      playedByUserId: sender.id
    };
    
    this.state.match.chain.push(newNode);
    this.state.match.currentChainPlayerId = validation.player.id;
    
    // Cambiar turno
    const nextPlayerId = this.getOpponentId(sender.id);
    this.state.match.currentPlayerId = nextPlayerId;
    this.state.match.turnDeadlineAt = new Date(Date.now() + 20000);
    
    // Broadcast turn_valid
    this.broadcast(JSON.stringify({
      type: 'turn_valid',
      position: newNode.position,
      player_id: newNode.playerId,
      player_name: newNode.playerName,
      played_by_user_id: newNode.playedByUserId,
      next_player_id: nextPlayerId,
      turn_deadline: this.state.match.turnDeadlineAt.toISOString()
    }));
    
    // Persistir en BD
    await this.saveMatchState();
  }
}
```

---

## Testing Requirements

```typescript
describe('GameValidationService', () => {
  let service: GameValidationServiceImpl;
  
  beforeEach(() => {
    service = new GameValidationServiceImpl();
  });
  
  it('should validate correct move', async () => {
    const result = await service.validateMove(
      'Sergio Busquets',
      'lionel-messi-id',
      []
    );
    
    expect(result.valid).toBe(true);
    expect(result.player.name).toBe('Sergio Busquets');
  });
  
  it('should reject non-existent player', async () => {
    const result = await service.validateMove(
      'Fake Player XYZ',
      'lionel-messi-id',
      []
    );
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('not_found');
  });
  
  it('should reject already used player', async () => {
    const result = await service.validateMove(
      'Sergio Busquets',
      'lionel-messi-id',
      ['sergio-busquets-id']
    );
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('already_used');
  });
  
  it('should reject player with no teammate edge', async () => {
    const result = await service.validateMove(
      'Cristiano Ronaldo',
      'lionel-messi-id',
      []
    );
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('no_edge');
  });
  
  it('should reject player with insufficient minutes', async () => {
    // Mock edge con solo 50 minutos
    const result = await service.validateMove(
      'Young Player',
      'lionel-messi-id',
      []
    );
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('insufficient_minutes');
  });
  
  it('should normalize names with diacritics', () => {
    expect(service.normalizeName('José María')).toBe('jose maria');
    expect(service.normalizeName('Müller')).toBe('muller');
    expect(service.normalizeName('  Extra   Spaces  ')).toBe('extra spaces');
  });
  
  it('should fuzzy match similar names', async () => {
    // "mesi" debería encontrar "Lionel Messi"
    const result = await service.validateMove(
      'mesi',
      'current-player-id',
      []
    );
    
    // Depende del threshold, pero debería encontrarlo
    expect(result.player?.name).toContain('Messi');
  });
});
```

---

## Performance Considerations

### Query Optimization
- **GIN index** en `normalized_name` hace fuzzy search muy rápido (O(log N))
- **Single query** para buscar edges en ambas direcciones
- **Pre-computed** `normalized_name` evita normalización en query time

### Caching Strategy
Para jugadores muy populares (ej. Messi, Ronaldo), cachear sus edges en Redis:

```typescript
// Cache edges de jugadores top 100
const CACHE_TTL = 3600; // 1 hora

async findTeammateEdge(player1Id: string, player2Id: string) {
  const cacheKey = `edge:${[player1Id, player2Id].sort().join(':')}`;
  
  // Intentar cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Query DB
  const edge = await db.query...
  
  // Cachear si existe
  if (edge) {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(edge));
  }
  
  return edge;
}
```

---

## Error Messages (i18n-ready)

```typescript
const ERROR_MESSAGES = {
  not_found: {
    en: 'Player not found',
    es: 'Jugador no encontrado'
  },
  no_edge: {
    en: 'Players never played together',
    es: 'Los jugadores nunca jugaron juntos'
  },
  already_used: {
    en: 'Player already used in this chain',
    es: 'Jugador ya usado en esta cadena'
  },
  insufficient_minutes: {
    en: 'Insufficient playtime together',
    es: 'Minutos insuficientes juntos'
  }
};
```

---

## Dependencies

```typescript
{
  "drizzle-orm": "^0.36.0",
  "@upstash/redis": "^1.28.0"
}
```
