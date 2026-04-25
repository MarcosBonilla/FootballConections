import { pgTable, uuid, bigint, text, timestamp, integer, index, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { players } from './players';

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  player1UserId: uuid('player1_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  player2UserId: uuid('player2_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['pending', 'active', 'finished', 'aborted'] }).notNull().default('pending'),
  seedPlayerId: bigint('seed_player_id', { mode: 'number' }).notNull().references(() => players.id),
  currentPlayerId: uuid('current_player_id').references(() => users.id),
  currentChainPlayerId: bigint('current_chain_player_id', { mode: 'number' }).references(() => players.id),
  turnNumber: integer('turn_number').default(0).notNull(),
  turnDeadlineAt: timestamp('turn_deadline_at'),
  winnerUserId: uuid('winner_user_id').references(() => users.id),
  endReason: text('end_reason', { enum: ['timeout', 'resign', 'disconnect'] }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  finishedAt: timestamp('finished_at'),
}, (table) => ({
  statusIdx: index('idx_matches_status').on(table.status),
  player1Idx: index('idx_matches_player1').on(table.player1UserId),
  player2Idx: index('idx_matches_player2').on(table.player2UserId),
  createdAtIdx: index('idx_matches_created_at').on(table.createdAt),
}));

export const matchTurns = pgTable('match_turns', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  turnNumber: integer('turn_number').notNull(),
  actingUserId: uuid('acting_user_id').notNull().references(() => users.id),
  inputText: text('input_text').notNull(),
  resolvedPlayerId: bigint('resolved_player_id', { mode: 'number' }).references(() => players.id),
  isValid: boolean('is_valid').notNull(),
  invalidReason: text('invalid_reason', { 
    enum: ['not_found', 'not_teammate', 'already_used', 'timeout'] 
  }),
  responseMs: integer('response_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  matchTurnIdx: index('idx_match_turns_match_turn').on(table.matchId, table.turnNumber),
  matchIdx: index('idx_match_turns_match_id').on(table.matchId),
}));

export const matchChainNodes = pgTable('match_chain_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  playerId: bigint('player_id', { mode: 'number' }).notNull().references(() => players.id),
  playedByUserId: uuid('played_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  matchPositionIdx: index('idx_match_chain_match_position').on(table.matchId, table.position),
  uniquePlayerPerMatch: index('idx_match_chain_unique_player').on(table.matchId, table.playerId),
}));
