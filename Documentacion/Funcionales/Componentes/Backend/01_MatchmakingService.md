# Servicio Backend: MatchmakingService

## Descripción técnica
Servicio que gestiona la cola de matchmaking: agregar jugadores a la cola en Redis, buscar oponentes con ELO similar, crear partidas cuando hay match, y limpiar la cola de entradas expiradas.

## Ubicación
`src/services/matchmaking/MatchmakingService.ts`

---

## Dependencies

```typescript
import { Redis } from '@upstash/redis';
import { db } from '@/db/client';
import { matches, matchmaking_queue } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
```

---

## Service Interface

```typescript
export interface MatchmakingService {
  // Join queue
  joinQueue(userId: string, elo: number): Promise<QueueEntry>;
  
  // Leave queue
  leaveQueue(userId: string): Promise<boolean>;
  
  // Find match for user (llamado por background worker)
  findMatch(userId: string): Promise<MatchResult | null>;
  
  // Get queue status
  getQueueStatus(userId: string): Promise<QueueStatus | null>;
  
  // Cleanup expired entries
  cleanupExpiredEntries(): Promise<number>;
}

interface QueueEntry {
  queueId: string;
  userId: string;
  elo: number;
  queuedAt: Date;
}

interface MatchResult {
  matchId: string;
  player1UserId: string;
  player2UserId: string;
  seedPlayerId: string;
}

interface QueueStatus {
  status: 'queued' | 'matched' | 'cancelled';
  queuedAt: Date;
  estimatedWaitSeconds?: number;
}
```

---

## Implementation

```typescript
export class MatchmakingServiceImpl implements MatchmakingService {
  private redis: Redis;
  private readonly QUEUE_KEY = 'matchmaking_queue';
  private readonly ENTRY_TTL_SECONDS = 30;
  private readonly SEED_PLAYER_POOL = 'seed_players'; // Redis set con IDs populares

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Agregar jugador a la cola de matchmaking
   */
  async joinQueue(userId: string, elo: number): Promise<QueueEntry> {
    // Verificar si el usuario ya está en cola
    const existing = await this.redis.zscore(this.QUEUE_KEY, userId);
    if (existing !== null) {
      throw new Error('User already in queue');
    }

    // Verificar si tiene partida activa
    const activeMatch = await db.query.matches.findFirst({
      where: and(
        eq(matches.status, 'active'),
        or(
          eq(matches.player1UserId, userId),
          eq(matches.player2UserId, userId)
        )
      )
    });

    if (activeMatch) {
      throw new Error('User has active match');
    }

    // Agregar a Redis Sorted Set (score = ELO)
    await this.redis.zadd(this.QUEUE_KEY, {
      score: elo,
      member: userId
    });

    // Registrar en BD para audit trail
    const queueId = nanoid();
    await db.insert(matchmaking_queue).values({
      id: queueId,
      userId,
      eloSnapshot: elo,
      queuedAt: new Date(),
      status: 'queued'
    });

    // Set TTL para auto-cleanup
    await this.redis.expire(`queue:${userId}`, this.ENTRY_TTL_SECONDS);

    return {
      queueId,
      userId,
      elo,
      queuedAt: new Date()
    };
  }

  /**
   * Salir de la cola
   */
  async leaveQueue(userId: string): Promise<boolean> {
    // Eliminar de Redis
    const removed = await this.redis.zrem(this.QUEUE_KEY, userId);

    // Actualizar status en BD
    if (removed > 0) {
      await db.update(matchmaking_queue)
        .set({ status: 'cancelled' })
        .where(eq(matchmaking_queue.userId, userId));
    }

    return removed > 0;
  }

  /**
   * Buscar oponente para un usuario
   * Llamado por background worker cada 2-3 segundos
   */
  async findMatch(userId: string): Promise<MatchResult | null> {
    // Obtener ELO del usuario en cola
    const userElo = await this.redis.zscore(this.QUEUE_KEY, userId);
    if (userElo === null) return null;

    // Calcular tiempo en cola para determinar rango
    const queueEntry = await db.query.matchmaking_queue.findFirst({
      where: eq(matchmaking_queue.userId, userId)
    });
    
    if (!queueEntry) return null;

    const secondsInQueue = Math.floor(
      (Date.now() - queueEntry.queuedAt.getTime()) / 1000
    );
    const range = this.calculateRange(secondsInQueue);

    // Buscar candidatos en rango ELO
    const minElo = userElo - range;
    const maxElo = userElo + range;

    const candidates = await this.redis.zrangebyscore(
      this.QUEUE_KEY,
      minElo,
      maxElo,
      { withScores: true }
    );

    // Filtrar al propio usuario
    const opponents = candidates.filter(c => c.member !== userId);

    if (opponents.length === 0) return null;

    // Elegir oponente más cercano en ELO
    const opponent = opponents.reduce((closest, current) => {
      const closestDiff = Math.abs(closest.score - userElo);
      const currentDiff = Math.abs(current.score - userElo);
      return currentDiff < closestDiff ? current : closest;
    });

    // Crear partida con lock distribuido para evitar race condition
    const matchId = await this.createMatch(
      userId,
      opponent.member as string
    );

    if (!matchId) return null;

    // Eliminar ambos de la cola
    await this.redis.zrem(this.QUEUE_KEY, userId, opponent.member);

    // Actualizar status en BD
    await db.update(matchmaking_queue)
      .set({ status: 'matched' })
      .where(
        or(
          eq(matchmaking_queue.userId, userId),
          eq(matchmaking_queue.userId, opponent.member)
        )
      );

    return {
      matchId,
      player1UserId: userId,
      player2UserId: opponent.member as string,
      seedPlayerId: await this.selectSeedPlayer()
    };
  }

  /**
   * Crear partida en BD con lock distribuido
   */
  private async createMatch(
    player1Id: string,
    player2Id: string
  ): Promise<string | null> {
    const lockKey = `match_creation:${[player1Id, player2Id].sort().join(':')}`;
    
    // Intentar adquirir lock (TTL 5s)
    const lockAcquired = await this.redis.set(lockKey, '1', {
      nx: true,
      ex: 5
    });

    if (!lockAcquired) return null; // Otro worker ya está creando este match

    try {
      const matchId = nanoid();
      const seedPlayer = await this.selectSeedPlayer();

      await db.insert(matches).values({
        id: matchId,
        player1UserId: player1Id,
        player2UserId: player2Id,
        status: 'pending',
        seedPlayerId: seedPlayer,
        currentPlayerId: player1Id, // Player 1 empieza
        currentChainPlayerId: seedPlayer,
        turnNumber: 1,
        turnDeadlineAt: new Date(Date.now() + 20000), // 20s
        createdAt: new Date()
      });

      return matchId;
    } finally {
      // Liberar lock
      await this.redis.del(lockKey);
    }
  }

  /**
   * Seleccionar seed player aleatorio del pool pre-cacheado
   */
  private async selectSeedPlayer(): Promise<string> {
    // Pool de ~100 jugadores populares pre-cargados en Redis Set
    const seedPlayers = await this.redis.srandmember(this.SEED_PLAYER_POOL);
    
    if (!seedPlayers) {
      // Fallback: query directo a BD (no óptimo, pero safe)
      const randomPlayer = await db.query.players.findFirst({
        where: eq(players.isActive, true),
        orderBy: sql`RANDOM()`,
        limit: 1
      });
      return randomPlayer!.id;
    }

    return seedPlayers as string;
  }

  /**
   * Obtener status de un usuario en cola
   */
  async getQueueStatus(userId: string): Promise<QueueStatus | null> {
    const entry = await db.query.matchmaking_queue.findFirst({
      where: eq(matchmaking_queue.userId, userId),
      orderBy: desc(matchmaking_queue.queuedAt)
    });

    if (!entry) return null;

    return {
      status: entry.status as 'queued' | 'matched' | 'cancelled',
      queuedAt: entry.queuedAt,
      estimatedWaitSeconds: this.estimateWait(entry.eloSnapshot)
    };
  }

  /**
   * Cleanup de entradas expiradas (>30s)
   */
  async cleanupExpiredEntries(): Promise<number> {
    const thirtySecondsAgo = new Date(Date.now() - 30000);

    const expiredEntries = await db.query.matchmaking_queue.findMany({
      where: and(
        eq(matchmaking_queue.status, 'queued'),
        lt(matchmaking_queue.queuedAt, thirtySecondsAgo)
      )
    });

    if (expiredEntries.length === 0) return 0;

    // Eliminar de Redis
    const userIds = expiredEntries.map(e => e.userId);
    await this.redis.zrem(this.QUEUE_KEY, ...userIds);

    // Marcar como cancelled en BD
    await db.update(matchmaking_queue)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(matchmaking_queue.status, 'queued'),
          lt(matchmaking_queue.queuedAt, thirtySecondsAgo)
        )
      );

    return expiredEntries.length;
  }

  /**
   * Calcular rango de búsqueda según tiempo en cola
   */
  private calculateRange(secondsInQueue: number): number {
    if (secondsInQueue < 5) return 50;
    if (secondsInQueue < 10) return 75;
    if (secondsInQueue < 15) return 100;
    return 150;
  }

  /**
   * Estimar tiempo de espera (heurística simple)
   */
  private estimateWait(elo: number): number {
    // TODO: implementar heurística basada en histórico
    // Por ahora, retornar estimación genérica
    return 15; // 15 segundos promedio
  }
}
```

---

## Background Worker

**File**: `src/workers/matchmaking-worker.ts`

```typescript
import { MatchmakingServiceImpl } from '@/services/matchmaking/MatchmakingService';
import { redis } from '@/lib/redis';

const matchmakingService = new MatchmakingServiceImpl(redis);

/**
 * Worker que corre cada 2-3 segundos
 * Busca matches para todos los usuarios en cola
 */
export async function runMatchmakingTick() {
  console.log('[Matchmaking] Running tick...');

  // Obtener todos los usuarios en cola
  const usersInQueue = await redis.zrange('matchmaking_queue', 0, -1);

  if (usersInQueue.length === 0) {
    console.log('[Matchmaking] Queue empty');
    return;
  }

  console.log(`[Matchmaking] ${usersInQueue.length} users in queue`);

  // Intentar match para cada usuario
  const matchPromises = usersInQueue.map(async (userId) => {
    try {
      const match = await matchmakingService.findMatch(userId as string);
      
      if (match) {
        console.log(`[Matchmaking] Match created: ${match.matchId}`);
        
        // Notificar a ambos jugadores por WebSocket
        await notifyMatchFound(match);
      }
    } catch (error) {
      console.error(`[Matchmaking] Error finding match for ${userId}:`, error);
    }
  });

  await Promise.allSettled(matchPromises);

  // Cleanup de entradas expiradas
  const cleaned = await matchmakingService.cleanupExpiredEntries();
  if (cleaned > 0) {
    console.log(`[Matchmaking] Cleaned ${cleaned} expired entries`);
  }
}

/**
 * Notificar match encontrado a ambos jugadores
 */
async function notifyMatchFound(match: MatchResult) {
  // Enviar mensaje WebSocket a ambos jugadores
  // Implementación depende del sistema WebSocket usado (PartyKit, etc.)
  
  const message = {
    type: 'match_found',
    match_id: match.matchId,
    seed_player_id: match.seedPlayerId
  };

  // Para PartyKit, enviar a salas de usuario individuales
  await fetch(
    `${process.env.PARTYKIT_URL}/user/${match.player1UserId}`,
    {
      method: 'POST',
      body: JSON.stringify(message)
    }
  );

  await fetch(
    `${process.env.PARTYKIT_URL}/user/${match.player2UserId}`,
    {
      method: 'POST',
      body: JSON.stringify(message)
    }
  );
}

// Ejecutar worker cada 2.5 segundos
setInterval(runMatchmakingTick, 2500);
```

---

## API Endpoints (Hono)

**File**: `src/api/matchmaking.ts`

```typescript
import { Hono } from 'hono';
import { MatchmakingServiceImpl } from '@/services/matchmaking/MatchmakingService';
import { redis } from '@/lib/redis';
import { getAuth } from '@/lib/auth';

const app = new Hono();
const matchmakingService = new MatchmakingServiceImpl(redis);

// Join matchmaking queue
app.post('/join', async (c) => {
  const auth = await getAuth(c);
  if (!auth) return c.json({ error: 'Unauthorized' }, 401);

  const { elo } = await c.req.json();

  try {
    const entry = await matchmakingService.joinQueue(auth.userId, elo);
    return c.json(entry);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// Leave matchmaking queue
app.post('/leave', async (c) => {
  const auth = await getAuth(c);
  if (!auth) return c.json({ error: 'Unauthorized' }, 401);

  const success = await matchmakingService.leaveQueue(auth.userId);
  return c.json({ success });
});

// Get queue status
app.get('/status', async (c) => {
  const auth = await getAuth(c);
  if (!auth) return c.json({ error: 'Unauthorized' }, 401);

  const status = await matchmakingService.getQueueStatus(auth.userId);
  return c.json(status);
});

export default app;
```

---

## Testing Requirements

```typescript
describe('MatchmakingService', () => {
  it('should add user to queue', async () => {
    const entry = await service.joinQueue('user1', 1200);
    expect(entry.userId).toBe('user1');
    
    // Verify Redis
    const score = await redis.zscore('matchmaking_queue', 'user1');
    expect(score).toBe(1200);
  });

  it('should find match for similar ELO', async () => {
    await service.joinQueue('user1', 1200);
    await service.joinQueue('user2', 1210);

    const match = await service.findMatch('user1');
    expect(match).not.toBeNull();
    expect(match.player2UserId).toBe('user2');
  });

  it('should expand range after 5 seconds', async () => {
    await service.joinQueue('user1', 1200);
    await service.joinQueue('user2', 1300); // +100 ELO

    // Simular 5s en cola
    await mockElapsedTime(5);

    const match = await service.findMatch('user1');
    expect(match).not.toBeNull(); // Ahora sí encuentra (rango ±75)
  });

  it('should not match if range too wide', async () => {
    await service.joinQueue('user1', 1200);
    await service.joinQueue('user2', 1400); // +200 ELO

    const match = await service.findMatch('user1');
    expect(match).toBeNull(); // Rango máximo ±150
  });

  it('should prevent duplicate queue entries', async () => {
    await service.joinQueue('user1', 1200);
    
    await expect(
      service.joinQueue('user1', 1200)
    ).rejects.toThrow('already in queue');
  });

  it('should cleanup expired entries', async () => {
    await service.joinQueue('user1', 1200);
    
    // Avanzar 35 segundos
    await mockElapsedTime(35);
    
    const cleaned = await service.cleanupExpiredEntries();
    expect(cleaned).toBe(1);
    
    // Verificar que se eliminó de Redis
    const score = await redis.zscore('matchmaking_queue', 'user1');
    expect(score).toBeNull();
  });
});
```

---

## Performance Considerations

- **Redis Sorted Set** es O(log N) para insert/search, escala bien hasta millones de usuarios
- **Lock distribuido** previene race conditions al crear matches
- **Seed player pool** pre-cacheado evita query pesada por cada match
- **Cleanup periódico** mantiene la cola limpia sin entradas zombie

---

## Monitoring Metrics

Métricas clave a trackear:

- `matchmaking.queue_size` — usuarios en cola en tiempo real
- `matchmaking.average_wait_time` — tiempo promedio hasta encontrar match
- `matchmaking.matches_created_per_minute` — throughput
- `matchmaking.expired_entries` — entradas que expiraron sin match
- `matchmaking.elo_distribution` — distribución de ELO en cola
