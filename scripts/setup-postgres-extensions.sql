-- =====================================================
-- Script de Configuración Inicial de PostgreSQL
-- Para ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Habilitar extensiones necesarias
-- ==================================================

-- Extensión para búsqueda fuzzy de nombres de jugadores
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Extensión para UUIDs (probablemente ya habilitada por Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extensión para funciones de cifrado
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Configurar Row Level Security (RLS)
-- ==================================================

-- RLS en tabla users: usuarios solo ven su propio perfil completo
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = supabase_user_id::text);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = supabase_user_id::text);

-- RLS en player_ratings: cualquiera puede ver, solo backend puede modificar
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings"
  ON player_ratings FOR SELECT
  TO authenticated
  USING (true);

-- Service role (backend) puede hacer todo
CREATE POLICY "Service role can manage ratings"
  ON player_ratings FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- 3. Crear índices adicionales para rendimiento
-- ==================================================

-- Índice para búsqueda fuzzy de jugadores por nombre
CREATE INDEX IF NOT EXISTS idx_players_name_trgm 
  ON players USING gin (normalized_name gin_trgm_ops);

-- Índice para búsqueda de matches activos
CREATE INDEX IF NOT EXISTS idx_matches_active 
  ON matches (status) 
  WHERE status = 'active';

-- 4. Crear función para actualizar timestamp
-- ==================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a tabla users
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger a tabla player_ratings
CREATE TRIGGER update_player_ratings_updated_at 
  BEFORE UPDATE ON player_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Verificación
-- ==================================================

-- Ver extensiones habilitadas
SELECT extname, extversion FROM pg_extension 
WHERE extname IN ('pg_trgm', 'uuid-ossp', 'pgcrypto');

-- Ver políticas RLS creadas
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('users', 'player_ratings');

COMMENT ON EXTENSION pg_trgm IS 'Fuzzy search for player names';
