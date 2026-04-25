import { db } from '@football-connections/database';
import { Redis } from '@upstash/redis';

// Database client (ya configurado en el package database)
export { db };

// Redis client para matchmaking y cache
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});
