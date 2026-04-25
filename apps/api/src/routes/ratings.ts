import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { supabase } from '@football-connections/database';

const app = new Hono();

// Schema de validación
const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  orderBy: z.enum(['elo', 'wins', 'matches']).default('elo'),
});

// GET /api/ratings/leaderboard - Ranking global
app.get('/leaderboard', zValidator('query', leaderboardQuerySchema), async (c) => {
  const { limit, offset, orderBy } = c.req.valid('query');

  try {
    const orderColumn = {
      'elo': 'elo',
      'wins': 'wins',
      'matches': 'matches_played',
    }[orderBy];

    const { data: rankings, error } = await supabase
      .from('player_ratings')
      .select('*')
      .order(orderColumn, { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Leaderboard fetch error:', error);
      return c.json({ error: 'Failed to fetch leaderboard' }, 500);
    }

    // Calcular ranking position y win rate
    const rankingsWithStats = rankings?.map((rating, index) => ({
      ...rating,
      rank: offset + index + 1,
      winRate: rating.matches_played > 0 
        ? ((rating.wins / rating.matches_played) * 100).toFixed(1)
        : '0.0',
    })) || [];

    return c.json({
      ratings: rankingsWithStats,
      count: rankingsWithStats.length,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return c.json({ error: 'Failed to fetch leaderboard' }, 500);
  }
});

// GET /api/ratings/:userId - Obtener rating de un usuario
app.get('/:userId', async (c) => {
  const userId = c.req.param('userId');

  try {
    const { data: rating, error } = await supabase
      .from('player_ratings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !rating) {
      // Devolver rating por defecto si no existe
      return c.json({
        user_id: userId,
        elo: 1200,
        matches_played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: '0.0',
      });
    }

    return c.json({
      ...rating,
      winRate: rating.matches_played > 0
        ? ((rating.wins / rating.matches_played) * 100).toFixed(1)
        : '0.0',
    });

  } catch (error) {
    console.error('Rating fetch error:', error);
    return c.json({ error: 'Failed to fetch rating' }, 500);
  }
});

export default app;
