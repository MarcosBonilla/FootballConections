import { supabase } from '@football-connections/database';

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  edge?: {
    minutesPlayed: number;
    goalParticipation: number;
    weightScore: number;
  };
}

export class GameValidationService {
  /**
   * Validar que un jugador sea un compañero válido del jugador actual
   */
  async validateMove(
    currentPlayerId: number,
    nextPlayerId: number
  ): Promise<ValidationResult> {
    try {
      // Verificar que existe una relación en teammate_edges
      const { data: edges, error } = await supabase
        .from('teammate_edges')
        .select('minutes_played_with, joint_goal_participation, weight_score')
        .eq('player_id', currentPlayerId)
        .eq('teammate_id', nextPlayerId)
        .limit(1);

      if (error || !edges || edges.length === 0) {
        return {
          isValid: false,
          reason: 'Players never played together',
        };
      }

      const edge = edges[0];

      return {
        isValid: true,
        edge: {
          minutesPlayed: edge.minutes_played_with,
          goalParticipation: edge.joint_goal_participation,
          weightScore: edge.weight_score,
        },
      };

    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        reason: 'Validation failed',
      };
    }
  }

  /**
   * Validar que un jugador no haya sido usado antes en la cadena
   */
  async validatePlayerNotInChain(
    matchId: string,
    playerId: number
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('match_chain_nodes')
        .select('id', { count: 'exact', head: true })
        .eq('match_id', matchId)
        .eq('player_id', playerId);

      if (error) {
        console.error('Chain validation error:', error);
        return false;
      }

      return !data || data.length === 0;

    } catch (error) {
      console.error('Chain validation error:', error);
      return false;
    }
  }

  /**
   * Validar jugada completa (edge existe + no usado previamente)
   */
  async validateFullMove(
    matchId: string,
    currentPlayerId: number,
    nextPlayerId: number
  ): Promise<ValidationResult> {
    // 1. Verificar que el jugador no haya sido usado
    const notInChain = await this.validatePlayerNotInChain(matchId, nextPlayerId);
    
    if (!notInChain) {
      return {
        isValid: false,
        reason: 'Player already used in this match',
      };
    }

    // 2. Verificar que existe la relación
    return await this.validateMove(currentPlayerId, nextPlayerId);
  }

  /**
   * Obtener sugerencias de jugadores válidos
   */
  async getSuggestions(
    matchId: string,
    currentPlayerId: number,
    limit: number = 5
  ): Promise<Array<{
    id: number;
    name: string;
    weightScore: number;
  }>> {
    try {
      // Primero obtener los jugadores ya usados
      const { data: usedPlayers } = await supabase
        .from('match_chain_nodes')
        .select('player_id')
        .eq('match_id', matchId);

      const usedPlayerIds = usedPlayers?.map(p => p.player_id) || [];

      // Obtener teammates del jugador actual
      const { data: teammates, error } = await supabase
        .from('teammate_edges')
        .select('teammate_id, weight_score')
        .eq('player_id', currentPlayerId)
        .order('weight_score', { ascending: false })
        .limit(limit * 2); // Traer más para filtrar

      if (error || !teammates) {
        return [];
      }

      // Filtrar los ya usados y obtener nombres
      const validTeammates = teammates
        .filter(t => !usedPlayerIds.includes(t.teammate_id))
        .slice(0, limit);

      if (validTeammates.length === 0) {
        return [];
      }

      // Obtener nombres de los jugadores
      const { data: players } = await supabase
        .from('players')
        .select('id, name')
        .in('id', validTeammates.map(t => t.teammate_id));

      if (!players) {
        return [];
      }

      // Combinar datos
      const playerMap = new Map(players.map(p => [p.id, p.name]));
      
      return validTeammates.map(t => ({
        id: t.teammate_id,
        name: playerMap.get(t.teammate_id) || 'Unknown',
        weightScore: t.weight_score,
      }));

    } catch (error) {
      console.error('Suggestions error:', error);
      return [];
    }
  }
}
