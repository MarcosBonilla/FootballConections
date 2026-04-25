-- =====================================================
-- Script OPCIONAL: Seed de Datos de Desarrollo
-- Para ejecutar DESPUÉS de las migraciones
-- =====================================================

-- Este script popula datos de prueba para desarrollo local

-- 1. Crear usuarios de prueba
-- ==================================================

-- Nota: Estos usuarios deben coincidir con usuarios creados en Supabase Auth
-- Este es solo un ejemplo de la estructura

INSERT INTO users (id, username, email, supabase_user_id, is_banned)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'testuser1', 'test1@example.com', '550e8400-e29b-41d4-a716-446655440001', false),
  ('550e8400-e29b-41d4-a716-446655440002', 'testuser2', 'test2@example.com', '550e8400-e29b-41d4-a716-446655440002', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Crear ratings iniciales para usuarios de prueba
-- ==================================================

INSERT INTO player_ratings (user_id, elo, matches_played, wins, losses, draws)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 1200, 0, 0, 0, 0),
  ('550e8400-e29b-41d4-a716-446655440002', 1200, 0, 0, 0, 0)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Jugadores de prueba (solo si no tienes el dataset completo)
-- ==================================================

-- Estos son jugadores famosos para testing rápido
-- Reemplazar con el ETL real del dataset

INSERT INTO players (id, name, slug, normalized_name, is_active)
VALUES 
  (1, 'Lionel Messi', 'lionel-messi', 'lionel messi', true),
  (2, 'Cristiano Ronaldo', 'cristiano-ronaldo', 'cristiano ronaldo', true),
  (3, 'Neymar Jr', 'neymar-jr', 'neymar jr', true),
  (4, 'Kylian Mbappé', 'kylian-mbappe', 'kylian mbappe', true),
  (5, 'Sergio Ramos', 'sergio-ramos', 'sergio ramos', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Relaciones de compañeros de prueba
-- ==================================================

INSERT INTO teammate_edges (player_id, teammate_id, minutes_played_with, joint_goal_participation, weight_score)
VALUES 
  (1, 2, 5000, 50, 5500), -- Messi jugó con Ronaldo (ejemplo ficticio)
  (1, 3, 10000, 120, 11200), -- Messi jugó con Neymar (PSG/Barcelona)
  (3, 4, 8000, 90, 8900), -- Neymar jugó con Mbappé (PSG)
  (4, 3, 8000, 90, 8900), -- Mbappé jugó con Neymar
  (5, 1, 3000, 20, 3200) -- Sergio Ramos jugó con Messi (PSG)
ON CONFLICT (player_id, teammate_id) DO NOTHING;

-- 5. Verificación
-- ==================================================

SELECT COUNT(*) as total_players FROM players;
SELECT COUNT(*) as total_edges FROM teammate_edges;
SELECT COUNT(*) as total_users FROM users;

-- Ver ejemplo de búsqueda fuzzy
SELECT id, name, normalized_name 
FROM players 
WHERE normalized_name % 'mesi' -- búsqueda fuzzy de "Messi"
ORDER BY similarity(normalized_name, 'mesi') DESC
LIMIT 5;
