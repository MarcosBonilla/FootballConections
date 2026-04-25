# Servicio Backend: ELOCalculator

## Descripción técnica
Servicio que implementa el algoritmo de rating ELO con K-factor variable según experiencia del jugador. Calcula cambios de ELO al finalizar partidas y los persiste atómicamente en la base de datos.

## Ubicación
`src/services/game/ELOCalculator.ts`

---

## Dependencies

```typescript
import { db } from '@/db/client';
import { users, match_history } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Redis } from '@upstash/redis';
```

---

## Service Interface

```typescript
export interface ELOCalculator {
  /**
   * Calcular cambios de ELO para una partida finalizada
   */
  calculateEloChange(params: EloCalculationParams): Promise<EloChangeResult>;
  
  /**
   * Aplicar cambios de ELO a los usuarios (persiste en BD)
   */
  applyEloChange(changes: EloChangeResult): Promise<void>;
  
  /**
   * Obtener K-factor basado en número de partidas jugadas
   */
  getKFactor(matchesPlayed: number): number;
}

interface EloCalculationParams {
  winnerUserId: string;
  winnerElo: number;
  loserUserId: string;
  loserElo: number;
}

interface EloChangeResult {
  [userId: string]: {
    before: number;
    after: number;
    delta: number;
    matchesPlayed: number;
  };
}
```

---

## Implementation

```typescript
export class ELOCalculatorImpl implements ELOCalculator {
  private redis: Redis;
  
  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Fórmula ELO estándar con K-factor variable
   * 
   * Expected score: E_a = 1 / (1 + 10^((R_b - R_a) / 400))
   * New rating: R'_a = R_a + K * (S_a - E_a)
   * 
   * donde:
   * - R_a, R_b = ELO actual de cada jugador
   * - K = K-factor (32, 24, o 16 según experiencia)
   * - S_a = resultado real (1 para ganador, 0 para perdedor)
   * - E_a = resultado esperado (probabilidad de ganar)
   */
  async calculateEloChange(params: EloCalculationParams): Promise<EloChangeResult> {
    const { winnerUserId, winnerElo, loserUserId, loserElo } = params;

    // Obtener número de partidas jugadas por cada jugador
    const [winnerMatches, loserMatches] = await Promise.all([
      this.getMatchesPlayed(winnerUserId),
      this.getMatchesPlayed(loserUserId)
    ]);

    // Calcular K-factor para cada jugador
    const winnerK = this.getKFactor(winnerMatches);
    const loserK = this.getKFactor(loserMatches);

    // Expected scores
    const winnerExpected = this.calculateExpectedScore(winnerElo, loserElo);
    const loserExpected = this.calculateExpectedScore(loserElo, winnerElo);

    // Actual scores (ganador = 1, perdedor = 0)
    const winnerActual = 1;
    const loserActual = 0;

    // Calcular cambios
    const winnerDelta = Math.round(winnerK * (winnerActual - winnerExpected));
    const loserDelta = Math.round(loserK * (loserActual - loserExpected));

    // Nuevos ratings
    const winnerNewElo = winnerElo + winnerDelta;
    const loserNewElo = loserElo + loserDelta;

    return {
      [winnerUserId]: {
        before: winnerElo,
        after: winnerNewElo,
        delta: winnerDelta,
        matchesPlayed: winnerMatches
      },
      [loserUserId]: {
        before: loserElo,
        after: loserNewElo,
        delta: loserDelta,
        matchesPlayed: loserMatches
      }
    };
  }

  /**
   * Calcular expected score (probabilidad de ganar)
   * E_a = 1 / (1 + 10^((R_b - R_a) / 400))
   */
  private calculateExpectedScore(eloA: number, eloB: number): number {
    return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  }

  /**
   * Obtener K-factor basado en experiencia
   * - 32 para jugadores novatos (0-20 partidas)
   * - 24 para jugadores intermedios (21-50 partidas)
   * - 16 para jugadores experimentados (51+ partidas)
   */
  getKFactor(matchesPlayed: number): number {
    if (matchesPlayed <= 20) return 32;
    if (matchesPlayed <= 50) return 24;
    return 16;
  }

  /**
   * Obtener número de partidas jugadas por un usuario
   */
  private async getMatchesPlayed(userId: string): Promise<number> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        matchesPlayed: true
      }
    });

    return user?.matchesPlayed || 0;
  }

  /**
   * Aplicar cambios de ELO a los usuarios (transacción atómica)
   */
  async applyEloChange(changes: EloChangeResult): Promise<void> {
    const userIds = Object.keys(changes);

    await db.transaction(async (tx) => {
      // Bloquear filas para evitar race conditions
      for (const userId of userIds) {
        const change = changes[userId];

        // Actualizar ELO y contador de partidas
        await tx
          .update(users)
          .set({
            currentElo: change.after,
            highestElo: Math.max(change.after, change.before), // Track all-time high
            matchesPlayed: change.matchesPlayed + 1,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
      }
    });

    // Actualizar leaderboard en Redis (asíncrono, no-blocking)
    this.updateLeaderboard(changes).catch((err) => {
      console.error('Failed to update leaderboard:', err);
    });
  }

  /**
   * Actualizar leaderboard en Redis (Sorted Set)
   */
  private async updateLeaderboard(changes: EloChangeResult): Promise<void> {
    const LEADERBOARD_KEY = 'leaderboard:global';

    for (const [userId, change] of Object.entries(changes)) {
      await this.redis.zadd(LEADERBOARD_KEY, {
        score: change.after,
        member: userId
      });
    }
  }
}
```

---

## Example Calculations

### Caso 1: Jugadores de ELO similar
```typescript
Winner: 1200 ELO, 10 partidas (K=32)
Loser:  1210 ELO, 15 partidas (K=32)

Expected winner: 1 / (1 + 10^((1210-1200)/400)) = 0.486
Expected loser:  1 / (1 + 10^((1200-1210)/400)) = 0.514

Winner delta: 32 * (1 - 0.486) = +16
Loser delta:  32 * (0 - 0.514) = -16

New ratings: Winner 1216, Loser 1194
```

### Caso 2: Underdog gana
```typescript
Winner: 1150 ELO, 5 partidas (K=32)
Loser:  1400 ELO, 60 partidas (K=16)

Expected winner: 1 / (1 + 10^((1400-1150)/400)) = 0.181
Expected loser:  1 / (1 + 10^((1150-1400)/400)) = 0.819

Winner delta: 32 * (1 - 0.181) = +26
Loser delta:  16 * (0 - 0.819) = -13

New ratings: Winner 1176, Loser 1387
```

### Caso 3: Favorito gana (resultado esperado)
```typescript
Winner: 1400 ELO, 60 partidas (K=16)
Loser:  1150 ELO, 5 partidas (K=32)

Expected winner: 0.819
Expected loser:  0.181

Winner delta: 16 * (1 - 0.819) = +3
Loser delta:  32 * (0 - 0.181) = -6

New ratings: Winner 1403, Loser 1144
```

---

## Testing Requirements

```typescript
describe('ELOCalculator', () => {
  let calculator: ELOCalculatorImpl;

  beforeEach(() => {
    calculator = new ELOCalculatorImpl(redis);
  });

  it('should calculate symmetric deltas for equal ELO', async () => {
    const result = await calculator.calculateEloChange({
      winnerUserId: 'user1',
      winnerElo: 1200,
      loserUserId: 'user2',
      loserElo: 1200
    });

    expect(result.user1.delta).toBeCloseTo(16, 0);
    expect(result.user2.delta).toBeCloseTo(-16, 0);
  });

  it('should give more points for underdog victory', async () => {
    const result = await calculator.calculateEloChange({
      winnerUserId: 'underdog',
      winnerElo: 1100,
      loserUserId: 'favorite',
      loserElo: 1400
    });

    expect(result.underdog.delta).toBeGreaterThan(20); // Gran victoria
    expect(result.favorite.delta).toBeLessThan(-10); // Gran pérdida
  });

  it('should use K=32 for novice players', () => {
    expect(calculator.getKFactor(10)).toBe(32);
    expect(calculator.getKFactor(20)).toBe(32);
  });

  it('should use K=24 for intermediate players', () => {
    expect(calculator.getKFactor(30)).toBe(24);
    expect(calculator.getKFactor(50)).toBe(24);
  });

  it('should use K=16 for experienced players', () => {
    expect(calculator.getKFactor(51)).toBe(16);
    expect(calculator.getKFactor(100)).toBe(16);
  });

  it('should apply ELO changes atomically', async () => {
    const changes = {
      user1: { before: 1200, after: 1216, delta: 16, matchesPlayed: 10 },
      user2: { before: 1210, after: 1194, delta: -16, matchesPlayed: 15 }
    };

    await calculator.applyEloChange(changes);

    // Verificar BD
    const user1 = await db.query.users.findFirst({ where: eq(users.id, 'user1') });
    expect(user1.currentElo).toBe(1216);
    expect(user1.matchesPlayed).toBe(11);

    const user2 = await db.query.users.findFirst({ where: eq(users.id, 'user2') });
    expect(user2.currentElo).toBe(1194);
    expect(user2.matchesPlayed).toBe(16);
  });

  it('should update Redis leaderboard', async () => {
    const changes = {
      user1: { before: 1200, after: 1216, delta: 16, matchesPlayed: 10 }
    };

    await calculator.applyEloChange(changes);

    const score = await redis.zscore('leaderboard:global', 'user1');
    expect(score).toBe(1216);
  });

  it('should track highest ELO achieved', async () => {
    // User tenía 1300 de highest, ahora sube a 1320
    const changes = {
      user1: { before: 1310, after: 1320, delta: 10, matchesPlayed: 30 }
    };

    await calculator.applyEloChange(changes);

    const user = await db.query.users.findFirst({ where: eq(users.id, 'user1') });
    expect(user.highestElo).toBe(1320);
  });
});
```

---

## Performance Optimizations

### Caching de Matches Played
Para queries frecuentes, cachear `matchesPlayed` en Redis:

```typescript
private async getMatchesPlayed(userId: string): Promise<number> {
  const CACHE_KEY = `user:${userId}:matches_played`;
  const CACHE_TTL = 300; // 5 minutos

  // Intentar cache
  const cached = await this.redis.get(CACHE_KEY);
  if (cached !== null) return Number(cached);

  // Query DB
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { matchesPlayed: true }
  });

  const matches = user?.matchesPlayed || 0;

  // Cachear
  await this.redis.setex(CACHE_KEY, CACHE_TTL, matches);

  return matches;
}
```

### Batch Updates para Leaderboard
Si hay múltiples partidas terminando simultáneamente:

```typescript
private async updateLeaderboard(changes: EloChangeResult): Promise<void> {
  const LEADERBOARD_KEY = 'leaderboard:global';

  const updates = Object.entries(changes).map(([userId, change]) => ({
    score: change.after,
    member: userId
  }));

  // Batch ZADD
  await this.redis.zadd(LEADERBOARD_KEY, ...updates);
}
```

---

## ELO Distribution Tracking

Para analítica, trackear distribución de ELO:

```typescript
async getEloDistribution(): Promise<{ [range: string]: number }> {
  const ranges = [
    { min: 0, max: 800, label: 'Beginner' },
    { min: 800, max: 1000, label: 'Intermediate' },
    { min: 1000, max: 1200, label: 'Advanced' },
    { min: 1200, max: 1400, label: 'Expert' },
    { min: 1400, max: Infinity, label: 'Master' }
  ];

  const distribution: { [range: string]: number } = {};

  for (const range of ranges) {
    const count = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          gte(users.currentElo, range.min),
          lt(users.currentElo, range.max)
        )
      );

    distribution[range.label] = count[0].count;
  }

  return distribution;
}
```

---

## Dependencies

```json
{
  "drizzle-orm": "^0.36.0",
  "@upstash/redis": "^1.28.0"
}
```
