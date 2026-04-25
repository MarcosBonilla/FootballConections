import { Hono } from 'hono';
import { supabase } from '@football-connections/database';
import { EloCalculator } from '../services/elo-calculator';

const app = new Hono();
const eloCalculator = new EloCalculator();

// POST /internal/matches/:matchId/complete - Completar partida y calcular ELO
app.post('/matches/:matchId/complete', async (c) => {
  const matchId = c.req.param('matchId');
  const { winnerId, loserId, reason } = await c.req.json<{
    winnerId: string;
    loserId: string;
    reason: 'timeout' | 'resign' | 'disconnect';
  }>();

  try {
    // Actualizar match en BD
    await supabase
      .from('matches')
      .update({
        status: 'finished',
        winner_id: winnerId,
        end_reason: reason,
        finished_at: new Date().toISOString(),
      })
      .eq('id', matchId);

    // Calcular y aplicar cambios de ELO
    const eloResult = await eloCalculator.calculateEloChange(matchId, winnerId, loserId);

    return c.json({
      success: true,
      eloChanges: {
        winner: {
          userId: winnerId,
          oldElo: eloResult.winnerNewElo - eloResult.winnerEloChange,
          newElo: eloResult.winnerNewElo,
          delta: eloResult.winnerEloChange,
        },
        loser: {
          userId: loserId,
          oldElo: eloResult.loserNewElo - eloResult.loserEloChange,
          newElo: eloResult.loserNewElo,
          delta: eloResult.loserEloChange,
        },
      },
    });

  } catch (error) {
    console.error('Complete match error:', error);
    return c.json({ error: 'Failed to complete match' }, 500);
  }
});

export default app;
