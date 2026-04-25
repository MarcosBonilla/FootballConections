import { MATCH_STATUS, END_REASON, INVALID_REASON } from '../constants';

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  supabaseUserId: string;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Player types (dataset)
export interface Player {
  id: number;
  name: string;
  slug: string | null;
  normalizedName: string;
  isActive: boolean;
}

// Match types
export type MatchStatus = typeof MATCH_STATUS[keyof typeof MATCH_STATUS];
export type EndReason = typeof END_REASON[keyof typeof END_REASON];
export type InvalidReason = typeof INVALID_REASON[keyof typeof INVALID_REASON];

export interface Match {
  id: string;
  player1UserId: string;
  player2UserId: string;
  status: MatchStatus;
  seedPlayerId: number;
  currentPlayerId: string | null;
  currentChainPlayerId: number | null;
  turnNumber: number;
  turnDeadlineAt: Date | null;
  winnerUserId: string | null;
  endReason: EndReason | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

// PartyKit WebSocket message types
export interface WSMessage {
  type: string;
  payload?: any;
  timestamp: number;
}

export interface PlayerSubmitMessage extends WSMessage {
  type: 'submit_player';
  payload: {
    playerName: string;
  };
}

export interface TurnResultMessage extends WSMessage {
  type: 'turn_result';
  payload: {
    isValid: boolean;
    player?: Player;
    chain: Player[];
    invalidReason?: InvalidReason;
    nextTurnUserId: string;
    turnDeadline: number;
  };
}

export interface MatchEndMessage extends WSMessage {
  type: 'match_end';
  payload: {
    winnerUserId: string;
    endReason: EndReason;
    finalChain: Player[];
    eloChanges: {
      [userId: string]: {
        before: number;
        after: number;
        delta: number;
      };
    };
  };
}

// ELO types
export interface PlayerRating {
  userId: string;
  elo: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  updatedAt: Date;
}

export interface ELOCalculation {
  winner: {
    before: number;
    after: number;
    delta: number;
  };
  loser: {
    before: number;
    after: number;
    delta: number;
  };
}
