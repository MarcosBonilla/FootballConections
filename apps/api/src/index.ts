import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// Routes
import authRoutes from './routes/auth';
import playersRoutes from './routes/players';
import matchmakingRoutes from './routes/matchmaking';
import matchesRoutes from './routes/matches';
import ratingsRoutes from './routes/ratings';
import internalRoutes from './routes/internal';

// Middleware
import { errorHandler } from './middleware/error-handler';
import { rateLimiter } from './middleware/rate-limiter';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ],
  credentials: true,
}));

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Rate limiting on sensitive endpoints
app.use('/api/auth/*', rateLimiter({ max: 5, window: 60 })); // 5 req/min
app.use('/api/matchmaking/*', rateLimiter({ max: 10, window: 60 })); // 10 req/min

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/players', playersRoutes);
app.route('/api/matchmaking', matchmakingRoutes);
app.route('/api/matches', matchesRoutes);
app.route('/api/ratings', ratingsRoutes);

// Internal routes (for PartyKit and internal services)
app.route('/internal', internalRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// Global error handler
app.onError(errorHandler);

const port = process.env.PORT || 3001;

// Support both Bun and Node.js runtimes
async function startServer() {
  if (typeof Bun !== 'undefined') {
    // Bun runtime - export handled at module level
    console.log(`🚀 API Server running on http://localhost:${port}`);
  } else {
    // Node.js runtime
    const { serve } = await import('@hono/node-server');
    console.log(`🚀 API Server running on http://localhost:${port}`);
    serve({
      fetch: app.fetch,
      port: Number(port),
    });
  }
}

startServer().catch(console.error);

export default { port, fetch: app.fetch };
