import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').unique().notNull(),
  email: text('email').unique().notNull(),
  supabaseUserId: uuid('supabase_user_id').unique().notNull(),
  isBanned: boolean('is_banned').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  usernameIdx: index('idx_users_username').on(table.username),
  supabaseUserIdx: index('idx_users_supabase_user_id').on(table.supabaseUserId),
}));
