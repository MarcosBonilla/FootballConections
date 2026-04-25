// Game constants
export const GAME_CONFIG = {
  TURN_TIME_SECONDS: 20,
  DISCONNECT_GRACE_PERIOD_MS: 10000, // 10 seconds grace period for reconnection
  MATCHMAKING_TIMEOUT_SECONDS: 60,
  MATCHMAKING_INITIAL_RANGE: 50,
  MATCHMAKING_RANGE_INCREMENT: 25,
  MATCHMAKING_MAX_WAIT_TIME_MS: 5 * 60 * 1000,
  ELO_DEFAULT: 1200,
  ELO_INITIAL_K_FACTOR: 32,
  ELO_RANGE_INITIAL: 50,
  ELO_RANGE_EXPANSION_STEP: 25,
  ELO_RANGE_EXPANSION_INTERVAL_MS: 5000,
} as const;

export const MATCH_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  FINISHED: 'finished',
  ABORTED: 'aborted',
} as const;

export const END_REASON = {
  TIMEOUT: 'timeout',
  RESIGN: 'resign',
  DISCONNECT: 'disconnect',
} as const;

export const INVALID_REASON = {
  NOT_FOUND: 'not_found',
  NOT_TEAMMATE: 'not_teammate',
  ALREADY_USED: 'already_used',
  TIMEOUT: 'timeout',
} as const;
