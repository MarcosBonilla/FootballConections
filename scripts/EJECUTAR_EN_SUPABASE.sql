-- =====================================================
-- SCRIPT COMPLETO DE SETUP DE BASE DE DATOS
-- Football Connections - Ejecutar en Supabase SQL Editor
-- =====================================================

-- PASO 1: Habilitar Extensiones
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- PASO 2: Crear Tablas
-- =====================================================

CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"supabase_user_id" uuid NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_supabase_user_id_unique" UNIQUE("supabase_user_id")
);

CREATE TABLE IF NOT EXISTS "players" (
	"id" bigint PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"normalized_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"source_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "teammate_edges" (
	"player_id" bigint NOT NULL,
	"teammate_id" bigint NOT NULL,
	"minutes_played_with" bigint,
	"joint_goal_participation" bigint,
	"ppg_played_with" text,
	"weight_score" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player1_user_id" uuid NOT NULL,
	"player2_user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"seed_player_id" bigint NOT NULL,
	"current_player_id" uuid,
	"current_chain_player_id" bigint,
	"turn_number" integer DEFAULT 0 NOT NULL,
	"turn_deadline_at" timestamp,
	"winner_user_id" uuid,
	"end_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp
);

CREATE TABLE IF NOT EXISTS "match_chain_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"player_id" bigint NOT NULL,
	"played_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "match_turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"turn_number" integer NOT NULL,
	"acting_user_id" uuid NOT NULL,
	"input_text" text NOT NULL,
	"resolved_player_id" bigint,
	"is_valid" boolean NOT NULL,
	"invalid_reason" text,
	"response_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "player_ratings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"elo" integer DEFAULT 1200 NOT NULL,
	"matches_played" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "rating_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"match_id" uuid NOT NULL,
	"elo_before" integer NOT NULL,
	"elo_after" integer NOT NULL,
	"delta" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);


-- PASO 3: Crear Foreign Keys
-- =====================================================

DO $$ BEGIN
 ALTER TABLE "teammate_edges" ADD CONSTRAINT "teammate_edges_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "teammate_edges" ADD CONSTRAINT "teammate_edges_teammate_id_players_id_fk" FOREIGN KEY ("teammate_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "match_chain_nodes" ADD CONSTRAINT "match_chain_nodes_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "match_chain_nodes" ADD CONSTRAINT "match_chain_nodes_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "match_chain_nodes" ADD CONSTRAINT "match_chain_nodes_played_by_user_id_users_id_fk" FOREIGN KEY ("played_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "match_turns" ADD CONSTRAINT "match_turns_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "match_turns" ADD CONSTRAINT "match_turns_acting_user_id_users_id_fk" FOREIGN KEY ("acting_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "match_turns" ADD CONSTRAINT "match_turns_resolved_player_id_players_id_fk" FOREIGN KEY ("resolved_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_player1_user_id_users_id_fk" FOREIGN KEY ("player1_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_player2_user_id_users_id_fk" FOREIGN KEY ("player2_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_seed_player_id_players_id_fk" FOREIGN KEY ("seed_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_current_player_id_users_id_fk" FOREIGN KEY ("current_player_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_current_chain_player_id_players_id_fk" FOREIGN KEY ("current_chain_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_user_id_users_id_fk" FOREIGN KEY ("winner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "player_ratings" ADD CONSTRAINT "player_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "rating_history" ADD CONSTRAINT "rating_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "rating_history" ADD CONSTRAINT "rating_history_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;


-- PASO 4: Crear Índices
-- =====================================================

CREATE INDEX IF NOT EXISTS "idx_users_username" ON "users" USING btree ("username");
CREATE INDEX IF NOT EXISTS "idx_users_supabase_user_id" ON "users" USING btree ("supabase_user_id");
CREATE INDEX IF NOT EXISTS "idx_players_normalized_name" ON "players" USING btree ("normalized_name");
CREATE INDEX IF NOT EXISTS "idx_players_slug" ON "players" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "idx_teammate_edges_player_id" ON "teammate_edges" USING btree ("player_id");
CREATE INDEX IF NOT EXISTS "idx_teammate_edges_teammate_id" ON "teammate_edges" USING btree ("teammate_id");
CREATE INDEX IF NOT EXISTS "idx_match_chain_match_position" ON "match_chain_nodes" USING btree ("match_id","position");
CREATE INDEX IF NOT EXISTS "idx_match_chain_unique_player" ON "match_chain_nodes" USING btree ("match_id","player_id");
CREATE INDEX IF NOT EXISTS "idx_match_turns_match_turn" ON "match_turns" USING btree ("match_id","turn_number");
CREATE INDEX IF NOT EXISTS "idx_match_turns_match_id" ON "match_turns" USING btree ("match_id");
CREATE INDEX IF NOT EXISTS "idx_matches_status" ON "matches" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_matches_player1" ON "matches" USING btree ("player1_user_id");
CREATE INDEX IF NOT EXISTS "idx_matches_player2" ON "matches" USING btree ("player2_user_id");
CREATE INDEX IF NOT EXISTS "idx_matches_created_at" ON "matches" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "idx_rating_history_user" ON "rating_history" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_rating_history_match" ON "rating_history" USING btree ("match_id");
CREATE INDEX IF NOT EXISTS "idx_rating_history_created_at" ON "rating_history" USING btree ("created_at");

-- Índice adicional para búsqueda fuzzy de jugadores
CREATE INDEX IF NOT EXISTS idx_players_name_trgm 
  ON players USING gin (normalized_name gin_trgm_ops);

-- Índice para matches activos
CREATE INDEX IF NOT EXISTS idx_matches_active 
  ON matches (status) 
  WHERE status = 'active';


-- PASO 5: Configurar Row Level Security (RLS)
-- =====================================================

-- RLS en tabla users: usuarios solo ven su propio perfil completo
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = supabase_user_id::text);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = supabase_user_id::text);

-- RLS en player_ratings: cualquiera puede ver, solo backend puede modificar
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view ratings" ON player_ratings;
CREATE POLICY "Anyone can view ratings"
  ON player_ratings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role can manage ratings" ON player_ratings;
CREATE POLICY "Service role can manage ratings"
  ON player_ratings FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');


-- PASO 6: Crear Triggers para updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para player_ratings
DROP TRIGGER IF EXISTS update_player_ratings_updated_at ON player_ratings;
CREATE TRIGGER update_player_ratings_updated_at 
  BEFORE UPDATE ON player_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- PASO 7: Verificación
-- =====================================================

-- Ver extensiones habilitadas
SELECT extname, extversion FROM pg_extension 
WHERE extname IN ('pg_trgm', 'uuid-ossp', 'pgcrypto');

-- Ver tablas creadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Ver políticas RLS
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('users', 'player_ratings');

-- Comentarios
COMMENT ON EXTENSION pg_trgm IS 'Fuzzy search for player names';
COMMENT ON TABLE users IS 'User accounts linked to Supabase Auth';
COMMENT ON TABLE players IS 'Football players dataset from Kaggle';
COMMENT ON TABLE teammate_edges IS 'Graph of players who played together';
COMMENT ON TABLE matches IS 'Game matches between two players';
COMMENT ON TABLE match_turns IS 'Individual turns/moves within a match';
COMMENT ON TABLE match_chain_nodes IS 'Chain of players built during a match';
COMMENT ON TABLE player_ratings IS 'ELO ratings for each user';
COMMENT ON TABLE rating_history IS 'History of ELO changes per match';

-- Mensaje final
DO $$
BEGIN
  RAISE NOTICE '✅ Base de datos configurada correctamente!';
  RAISE NOTICE '   - 8 tablas creadas';
  RAISE NOTICE '   - 17 índices creados';
  RAISE NOTICE '   - 3 extensiones habilitadas';
  RAISE NOTICE '   - RLS configurado en users y player_ratings';
  RAISE NOTICE '   - Triggers de updated_at activos';
END $$;
