import type { Context, Next } from 'hono';
import { redis } from '../lib/redis';

interface RateLimiterOptions {
  max: number;      // Max requests
  window: number;   // Time window in seconds
}

export const rateLimiter = (options: RateLimiterOptions) => {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const endpoint = c.req.path;
    const key = `ratelimit:${ip}:${endpoint}`;

    try {
      const current = await redis.incr(key);
      
      if (current === 1) {
        // First request, set expiration
        await redis.expire(key, options.window);
      }

      if (current > options.max) {
        return c.json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Max ${options.max} requests per ${options.window}s.`,
          retryAfter: options.window,
        }, 429);
      }

      // Add rate limit headers
      c.header('X-RateLimit-Limit', options.max.toString());
      c.header('X-RateLimit-Remaining', Math.max(0, options.max - current).toString());
      c.header('X-RateLimit-Reset', (Date.now() + options.window * 1000).toString());

      await next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // If Redis fails, allow request to proceed
      await next();
    }
  };
};
