import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { supabase } from '@football-connections/database';

const app = new Hono();

// Schema de validación para búsqueda
const searchSchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().min(1).max(50).default(10),
});

// GET /api/players/search?q=messi&limit=10
app.get('/search', zValidator('query', searchSchema), async (c) => {
  const { q, limit } = c.req.valid('query');

  try {
    // Búsqueda usando Supabase REST API (más confiable que conexión directa)
    const { data, error } = await supabase
      .from('players')
      .select('id, name, slug, normalized_name')
      .ilike('normalized_name', `%${q.toLowerCase()}%`)
      .limit(limit);

    if (error) {
      console.error('Supabase search error:', error);
      return c.json({ error: 'Search failed' }, 500);
    }

    return c.json({
      query: q,
      results: data || [],
      count: data?.length || 0,
    });

  } catch (error) {
    console.error('Player search error:', error);
    return c.json({ error: 'Search failed' }, 500);
  }
});

// GET /api/players/:id - Obtener detalles de un jugador
app.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  if (isNaN(id)) {
    return c.json({ error: 'Invalid player ID' }, 400);
  }

  try {
    // Buscar jugador usando Supabase REST API
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (playerError || !player) {
      return c.json({ error: 'Player not found' }, 404);
    }

    // Contar compañeros
    const { count } = await supabase
      .from('teammate_edges')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', id);

    return c.json({
      ...player,
      teammatesCount: count || 0,
    });

  } catch (error) {
    console.error('Player fetch error:', error);
    return c.json({ error: 'Failed to fetch player' }, 500);
  }
});

// GET /api/players/:id/teammates - Obtener compañeros de un jugador
app.get('/:id/teammates', async (c) => {
  const id = parseInt(c.req.param('id'));
  const limit = parseInt(c.req.query('limit') || '20');

  if (isNaN(id)) {
    return c.json({ error: 'Invalid player ID' }, 400);
  }

  try {
    // Obtener edges con Supabase
    const { data: edges, error: edgesError } = await supabase
      .from('teammate_edges')
      .select('teammate_id, minutes_played_with, joint_goal_participation, weight_score')
      .eq('player_id', id)
      .order('weight_score', { ascending: false })
      .limit(limit);

    if (edgesError) {
      console.error('Edges fetch error:', edgesError);
      return c.json({ error: 'Failed to fetch teammates' }, 500);
    }

    if (!edges || edges.length === 0) {
      return c.json({
        playerId: id,
        teammates: [],
        count: 0,
      });
    }

    // Obtener detalles de los jugadores compañeros
    const teammateIds = edges.map(e => e.teammate_id);
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, normalized_name')
      .in('id', teammateIds);

    if (playersError) {
      console.error('Players fetch error:', playersError);
      return c.json({ error: 'Failed to fetch players' }, 500);
    }

    // Combinar datos
    const playersMap = new Map(players?.map(p => [p.id, p]) || []);
    const formattedTeammates = edges.map(edge => {
      const player = playersMap.get(edge.teammate_id);
      return {
        id: edge.teammate_id,
        name: player?.name || 'Unknown',
        normalized_name: player?.normalized_name || '',
        minutes_played_with: edge.minutes_played_with,
        joint_goal_participation: edge.joint_goal_participation,
        weight_score: edge.weight_score,
      };
    });

    return c.json({
      playerId: id,
      teammates: formattedTeammates,
      count: formattedTeammates.length,
    });

  } catch (error) {
    console.error('Teammates fetch error:', error);
    return c.json({ error: 'Failed to fetch teammates' }, 500);
  }
});

export default app;
