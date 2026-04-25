import { redis } from '../lib/redis';
import { supabase } from '@football-connections/database';
import { GAME_CONFIG } from '@football-connections/shared';

interface QueueEntry {
  userId: string;
  elo: number;
  joinedAt: number;
  mode: 'casual' | 'ranked';
}

export class MatchmakingService {
  private readonly QUEUE_KEY = 'matchmaking:queue';
  private readonly USER_QUEUE_KEY = (userId: string) => `matchmaking:user:${userId}`;
  private readonly MATCH_RANGE_BASE = GAME_CONFIG.MATCHMAKING_INITIAL_RANGE; // 50 from constants
  private readonly RANGE_INCREMENT = 25; // Aumentar rango cada 10 segundos

  /**
   * Agregar usuario a la cola de matchmaking
   */
  async joinQueue(userId: string, mode: 'casual' | 'ranked' = 'casual'): Promise<number> {
    // Verificar si ya está en cola
    const existing = await redis.get(this.USER_QUEUE_KEY(userId));
    if (existing) {
      throw new Error('Already in queue');
    }

    // Obtener ELO del usuario
    let elo = 1200; // Default
    if (mode === 'ranked') {
      const { data: rating } = await supabase
        .from('player_ratings')
        .select('elo')
        .eq('user_id', userId)
        .single();
      
      elo = rating?.elo || 1200;
    }

    const entry: QueueEntry = {
      userId,
      elo,
      joinedAt: Date.now(),
      mode,
    };

    // Guardar en Redis
    await redis.set(this.USER_QUEUE_KEY(userId), JSON.stringify(entry), {
      ex: 300, // Expirar en 5 minutos
    });

    // Agregar a la cola global
    await redis.zadd(this.QUEUE_KEY, {
      score: Date.now(),
      member: userId,
    });

    // Retornar posición en cola
    const position = await redis.zrank(this.QUEUE_KEY, userId);
    return (position ?? 0) + 1;
  }

  /**
   * Remover usuario de la cola
   */
  async leaveQueue(userId: string): Promise<void> {
    await redis.del(this.USER_QUEUE_KEY(userId));
    await redis.zrem(this.QUEUE_KEY, userId);
  }

  /**
   * Obtener estado del usuario en cola
   */
  async getQueueStatus(userId: string): Promise<{
    inQueue: boolean;
    position?: number;
    waitTimeSeconds?: number;
    estimatedMatch?: string;
  }> {
    const entry = await redis.get(this.USER_QUEUE_KEY(userId));
    
    if (!entry) {
      return { inQueue: false };
    }

    const queueEntry: QueueEntry = JSON.parse(entry);
    const position = await redis.zrank(this.QUEUE_KEY, userId);
    const waitTime = Math.floor((Date.now() - queueEntry.joinedAt) / 1000);

    return {
      inQueue: true,
      position: (position ?? 0) + 1,
      waitTimeSeconds: waitTime,
      estimatedMatch: waitTime > 30 ? 'soon' : 'searching',
    };
  }

  /**
   * Buscar match para un usuario
   */
  async findMatch(userId: string): Promise<{
    matchId: string;
    opponent: string;
  } | null> {
    const entryStr = await redis.get(this.USER_QUEUE_KEY(userId));
    if (!entryStr) {
      throw new Error('Not in queue');
    }

    const entry: QueueEntry = JSON.parse(entryStr);
    const waitTime = Math.floor((Date.now() - entry.joinedAt) / 1000);
    
    // Calcular rango de búsqueda (aumenta con el tiempo de espera)
    const rangeIncrements = Math.floor(waitTime / 10);
    const eloRange = this.MATCH_RANGE_BASE + (rangeIncrements * this.RANGE_INCREMENT);

    // Obtener todos los usuarios en cola (últimos 100)
    const queueMembers = await redis.zrange(this.QUEUE_KEY, 0, 99);

    // Buscar oponente compatible
    for (const opponentId of queueMembers) {
      if (opponentId === userId) continue;

      const opponentEntry = await redis.get(this.USER_QUEUE_KEY(opponentId));
      if (!opponentEntry) continue;

      const opponent: QueueEntry = JSON.parse(opponentEntry);

      // Validar modo de juego
      if (opponent.mode !== entry.mode) continue;

      // Validar rango de ELO (solo en ranked)
      if (entry.mode === 'ranked') {
        const eloDiff = Math.abs(entry.elo - opponent.elo);
        if (eloDiff > eloRange) continue;
      }

      // Match encontrado!
      const matchId = crypto.randomUUID();

      // Remover ambos usuarios de la cola
      await this.leaveQueue(userId);
      await this.leaveQueue(opponentId);

      // Crear match en BD (esto se hará en el servicio de partidas)
      // Por ahora solo retornamos los datos

      return {
        matchId,
        opponent: opponentId,
      };
    }

    return null;
  }

  /**
   * Obtener tamaño actual de la cola
   */
  async getQueueSize(): Promise<number> {
    return await redis.zcard(this.QUEUE_KEY);
  }

  /**
   * Limpiar entradas expiradas de la cola
   */
  async cleanupExpiredEntries(): Promise<number> {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return await redis.zremrangebyscore(this.QUEUE_KEY, 0, fiveMinutesAgo);
  }
}
