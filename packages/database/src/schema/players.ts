import { pgTable, bigint, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const players = pgTable('players', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull(),
  slug: text('slug'),
  normalizedName: text('normalized_name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sourceUpdatedAt: timestamp('source_updated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  normalizedNameIdx: index('idx_players_normalized_name').using('gin', table.normalizedName),
  slugIdx: index('idx_players_slug').on(table.slug),
}));

export const teammateEdges = pgTable('teammate_edges', {
  playerId: bigint('player_id', { mode: 'number' }).notNull().references(() => players.id, { onDelete: 'cascade' }),
  teammateId: bigint('teammate_id', { mode: 'number' }).notNull().references(() => players.id, { onDelete: 'cascade' }),
  minutesPlayedWith: bigint('minutes_played_with', { mode: 'number' }),
  jointGoalParticipation: bigint('joint_goal_participation', { mode: 'number' }),
  ppgPlayedWith: text('ppg_played_with'),
  weightScore: bigint('weight_score', { mode: 'number' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  playerIdx: index('idx_teammate_edges_player_id').on(table.playerId),
  teammateIdx: index('idx_teammate_edges_teammate_id').on(table.teammateId),
}));
