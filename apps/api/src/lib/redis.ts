import { Redis } from '@upstash/redis';

if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
  throw new Error('UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN must be set');
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// Redis key patterns
export const REDIS_KEYS = {
  matchmakingQueue: 'matchmaking:queue',
  userInQueue: (userId: string) => `matchmaking:user:${userId}`,
  activeMatch: (matchId: string) => `match:${matchId}`,
  userSession: (userId: string) => `session:${userId}`,
  rateLimit: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,
} as const;
