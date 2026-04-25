import { pgTable, uuid, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { matches } from './matches';

export const playerRatings = pgTable('player_ratings', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  elo: integer('elo').default(1200).notNull(),
  matchesPlayed: integer('matches_played').default(0).notNull(),
  wins: integer('wins').default(0).notNull(),
  losses: integer('losses').default(0).notNull(),
  draws: integer('draws').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ratingHistory = pgTable('rating_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  matchId: uuid('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  eloBefore: integer('elo_before').notNull(),
  eloAfter: integer('elo_after').notNull(),
  delta: integer('delta').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_rating_history_user').on(table.userId),
  matchIdx: index('idx_rating_history_match').on(table.matchId),
  createdAtIdx: index('idx_rating_history_created_at').on(table.createdAt),
}));
