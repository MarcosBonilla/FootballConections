import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth, getUserId } from '../middleware/auth';
import { MatchmakingService } from '../services/matchmaking-service';
import { BadRequestError } from '../middleware/error-handler';

const app = new Hono();
const matchmakingService = new MatchmakingService();

// Schema de validación
const joinQueueSchema = z.object({
  mode: z.enum(['casual', 'ranked']).default('casual'),
});

// POST /api/matchmaking/join - Entrar a la cola
app.post('/join', requireAuth, zValidator('json', joinQueueSchema), async (c) => {
  const userId = getUserId(c);
  const { mode } = c.req.valid('json');

  try {
    const position = await matchmakingService.joinQueue(userId, mode);

    return c.json({
      message: 'Joined matchmaking queue',
      position,
      mode,
      estimatedWaitSeconds: position * 5, // Estimación: 5 segundos por persona
    });

  } catch (error) {
    if (error instanceof Error) {
      throw new BadRequestError(error.message);
    }
    throw error;
  }
});

// POST /api/matchmaking/leave - Salir de la cola
app.post('/leave', requireAuth, async (c) => {
  const userId = getUserId(c);

  try {
    await matchmakingService.leaveQueue(userId);

    return c.json({
      message: 'Left matchmaking queue',
    });

  } catch (error) {
    console.error('Leave queue error:', error);
    return c.json({ error: 'Failed to leave queue' }, 500);
  }
});

// GET /api/matchmaking/status - Ver estado en la cola
app.get('/status', requireAuth, async (c) => {
  const userId = getUserId(c);

  try {
    const status = await matchmakingService.getQueueStatus(userId);

    return c.json(status);

  } catch (error) {
    console.error('Queue status error:', error);
    return c.json({ error: 'Failed to get queue status' }, 500);
  }
});

// POST /api/matchmaking/match - Buscar match (usado internamente o por polling)
app.post('/match', requireAuth, async (c) => {
  const userId = getUserId(c);

  try {
    const match = await matchmakingService.findMatch(userId);

    if (!match) {
      return c.json({
        message: 'No match found yet',
        inQueue: true,
      });
    }

    return c.json({
      message: 'Match found!',
      match,
    });

  } catch (error) {
    console.error('Find match error:', error);
    return c.json({ error: 'Failed to find match' }, 500);
  }
});

export default app;
