import { Hono } from 'hono';
import { requireAuth, getUserId } from '../middleware/auth';
import { supabase } from '@football-connections/database';
import { NotFoundError } from '../middleware/error-handler';

const app = new Hono();

// GET /api/matches - Listar partidas del usuario
app.get('/', requireAuth, async (c) => {
  const userId = getUserId(c);
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    // Buscar partidas donde el usuario es player1 o player2
    const { data: userMatches, error } = await supabase
      .from('matches')
      .select('*')
      .or(`player1_user_id.eq.${userId},player2_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Supabase error:', error);
      return c.json({ error: 'Failed to fetch matches' }, 500);
    }

    return c.json({
      matches: userMatches || [],
      count: userMatches?.length || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Fetch matches error:', error);
    return c.json({ error: 'Failed to fetch matches' }, 500);
  }
});

// GET /api/matches/:id - Obtener detalles de una partida
app.get('/:id', requireAuth, async (c) => {
  const matchId = c.req.param('id');
  const userId = getUserId(c);

  try {
    // Obtener la partida
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      throw new NotFoundError('Match not found');
    }

    // Verificar que el usuario sea parte de la partida
    if (match.player1_user_id !== userId && match.player2_user_id !== userId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Obtener turns de la partida
    const { data: turns } = await supabase
      .from('match_turns')
      .select('*')
      .eq('match_id', matchId)
      .order('turn_number', { ascending: true });

    // Obtener chain nodes de la partida
    const { data: chainNodes } = await supabase
      .from('match_chain_nodes')
      .select('*')
      .eq('match_id', matchId)
      .order('position', { ascending: true });

    return c.json({
      ...match,
      turns: turns || [],
      chainNodes: chainNodes || [],
    });

  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Fetch match error:', error);
    return c.json({ error: 'Failed to fetch match' }, 500);
  }
});

export default app;
