import { supabase } from '@football-connections/database';

export interface EloResult {
  winnerId: string;
  loserId: string;
  winnerEloChange: number;
  loserEloChange: number;
  winnerNewElo: number;
  loserNewElo: number;
}

export class EloCalculator {
  // Factor K según la cantidad de partidas jugadas
  private readonly K_HIGH = 40;    // < 30 partidas
  private readonly K_MEDIUM = 20;  // 30-100 partidas
  private readonly K_LOW = 10;     // > 100 partidas

  /**
   * Calcular probabilidad de victoria
   */
  private getExpectedScore(playerElo: number, opponentElo: number): number {
    return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  }

  /**
   * Obtener factor K según experiencia del jugador
   */
  private getKFactor(matchesPlayed: number): number {
    if (matchesPlayed < 30) return this.K_HIGH;
    if (matchesPlayed < 100) return this.K_MEDIUM;
    return this.K_LOW;
  }

  /**
   * Calcular cambios de ELO después de una partida
   */
  async calculateEloChange(
    matchId: string,
    winnerId: string,
    loserId: string
  ): Promise<EloResult> {
    // Obtener ratings actuales
    const [winnerRating, loserRating] = await Promise.all([
      this.getRating(winnerId),
      this.getRating(loserId),
    ]);

    // Calcular expectativas
    const winnerExpected = this.getExpectedScore(
      winnerRating.elo,
      loserRating.elo
    );
    const loserExpected = this.getExpectedScore(
      loserRating.elo,
      winnerRating.elo
    );

    // Obtener factores K
    const winnerK = this.getKFactor(winnerRating.matches_played);
    const loserK = this.getKFactor(loserRating.matches_played);

    // Calcular cambios
    const winnerChange = Math.round(winnerK * (1 - winnerExpected));
    const loserChange = Math.round(loserK * (0 - loserExpected));

    const winnerNewElo = winnerRating.elo + winnerChange;
    const loserNewElo = loserRating.elo + loserChange;

    // Actualizar en BD
    await this.updateRatings(
      matchId,
      {
        userId: winnerId,
        oldElo: winnerRating.elo,
        newElo: winnerNewElo,
        change: winnerChange,
        matchesPlayed: winnerRating.matches_played,
        wins: winnerRating.wins,
        won: true,
      },
      {
        userId: loserId,
        oldElo: loserRating.elo,
        newElo: loserNewElo,
        change: loserChange,
        matchesPlayed: loserRating.matches_played,
        losses: loserRating.losses,
        won: false,
      }
    );

    return {
      winnerId,
      loserId,
      winnerEloChange: winnerChange,
      loserEloChange: loserChange,
      winnerNewElo,
      loserNewElo,
    };
  }

  /**
   * Obtener rating de un jugador (o crear uno nuevo)
   */
  private async getRating(userId: string) {
    const { data: rating } = await supabase
      .from('player_ratings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Si no tiene rating, crear uno nuevo
    if (!rating) {
      const { data: newRating, error } = await supabase
        .from('player_ratings')
        .insert({
          user_id: userId,
          elo: 1200,
          matches_played: 0,
          wins: 0,
          losses: 0,
          draws: 0,
        })
        .select()
        .single();
      
      if (error || !newRating) {
        throw new Error('Failed to create rating');
      }

      return newRating;
    }

    return rating;
  }

  /**
   * Actualizar ratings en la BD
   */
  private async updateRatings(
    matchId: string,
    winner: {
      userId: string;
      oldElo: number;
      newElo: number;
      change: number;
      matchesPlayed: number;
      wins: number;
      won: boolean;
    },
    loser: {
      userId: string;
      oldElo: number;
      newElo: number;
      change: number;
      matchesPlayed: number;
      losses: number;
      won: boolean;
    }
  ) {
    // Actualizar rating del ganador
    await supabase
      .from('player_ratings')
      .update({
        elo: winner.newElo,
        matches_played: winner.matchesPlayed + 1,
        wins: winner.wins + 1,
      })
      .eq('user_id', winner.userId);

    // Actualizar rating del perdedor
    await supabase
      .from('player_ratings')
      .update({
        elo: loser.newElo,
        matches_played: loser.matchesPlayed + 1,
        losses: loser.losses + 1,
      })
      .eq('user_id', loser.userId);

    // Guardar historial
    await supabase
      .from('rating_history')
      .insert([
        {
          user_id: winner.userId,
          match_id: matchId,
          elo_before: winner.oldElo,
          elo_after: winner.newElo,
          delta: winner.change,
        },
        {
          user_id: loser.userId,
          match_id: matchId,
          elo_before: loser.oldElo,
          elo_after: loser.newElo,
          delta: loser.change,
        },
      ]);
  }

  /**
   * Calcular ELO para empate (draw)
   */
  async calculateDrawElo(
    matchId: string,
    player1Id: string,
    player2Id: string
  ): Promise<{
    player1Change: number;
    player2Change: number;
    player1NewElo: number;
    player2NewElo: number;
  }> {
    const [player1Rating, player2Rating] = await Promise.all([
      this.getRating(player1Id),
      this.getRating(player2Id),
    ]);

    const player1Expected = this.getExpectedScore(
      player1Rating.elo,
      player2Rating.elo
    );
    const player2Expected = this.getExpectedScore(
      player2Rating.elo,
      player1Rating.elo
    );

    const player1K = this.getKFactor(player1Rating.matches_played);
    const player2K = this.getKFactor(player2Rating.matches_played);

    // En empate, el resultado es 0.5 para ambos
    const player1Change = Math.round(player1K * (0.5 - player1Expected));
    const player2Change = Math.round(player2K * (0.5 - player2Expected));

    const player1NewElo = player1Rating.elo + player1Change;
    const player2NewElo = player2Rating.elo + player2Change;

    // Actualizar ambos como draws
    await supabase
      .from('player_ratings')
      .update({
        elo: player1NewElo,
        matches_played: player1Rating.matches_played + 1,
        draws: player1Rating.draws + 1,
      })
      .eq('user_id', player1Id);

    await supabase
      .from('player_ratings')
      .update({
        elo: player2NewElo,
        matches_played: player2Rating.matches_played + 1,
        draws: player2Rating.draws + 1,
      })
      .eq('user_id', player2Id);

    await supabase
      .from('rating_history')
      .insert([
        {
          user_id: player1Id,
          match_id: matchId,
          elo_before: player1Rating.elo,
          elo_after: player1NewElo,
          delta: player1Change,
        },
        {
          user_id: player2Id,
          match_id: matchId,
          elo_before: player2Rating.elo,
          elo_after: player2NewElo,
          delta: player2Change,
        },
      ]);

    return {
      player1Change,
      player2Change,
      player1NewElo,
      player2NewElo,
    };
  }
}
