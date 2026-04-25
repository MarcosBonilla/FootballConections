// Types para WebSocket messages
export type GameEvent =
  | { type: 'player:join'; userId: string; username: string }
  | { type: 'player:ready' }
  | { type: 'player:move'; playerName: string }
  | { type: 'player:surrender' }
  | { type: 'ping' };

export type ServerEvent =
  | { type: 'game:state'; state: GameState }
  | { type: 'game:start'; firstPlayerId: string; seedPlayer: Player }
  | { type: 'game:turn'; playerId: string; timeLeft: number }
  | { type: 'game:move:valid'; node: ChainNode; nextPlayer: Player }
  | { type: 'game:move:invalid'; reason: string }
  | { type: 'game:end'; winner: string; reason: EndReason; eloChanges: EloChanges }
  | { type: 'player:connected'; userId: string }
  | { type: 'player:disconnected'; userId: string }
  | { type: 'error'; message: string }
  | { type: 'pong' };

export type EndReason = 'timeout' | 'resign' | 'disconnect';

export interface GameState {
  matchId: string;
  status: 'waiting' | 'active' | 'finished';
  players: {
    player1: PlayerInfo;
    player2: PlayerInfo;
  };
  currentPlayerId: string;
  currentChainPlayer: Player;
  chain: ChainNode[];
  turnNumber: number;
  turnDeadlineAt: string; // ISO timestamp
  timeLeft: number; // seconds
}

export interface PlayerInfo {
  userId: string;
  username: string;
  elo: number;
  connected: boolean;
}

export interface Player {
  id: number;
  name: string;
  position?: string;
  nationality?: string;
}

export interface ChainNode {
  position: number;
  player: Player;
  playedByUserId: string;
  playedAt: string;
}

export interface EloChanges {
  winner: { userId: string; oldElo: number; newElo: number; delta: number };
  loser: { userId: string; oldElo: number; newElo: number; delta: number };
}
