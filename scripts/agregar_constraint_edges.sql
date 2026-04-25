-- =====================================================
-- AGREGAR CONSTRAINT ÚNICO A teammate_edges
-- Para permitir upserts sin duplicados
-- =====================================================

-- Crear constraint único en la combinación de player_id y teammate_id
ALTER TABLE teammate_edges 
ADD CONSTRAINT teammate_edges_unique_pair 
UNIQUE (player_id, teammate_id);

-- Verificar que se creó correctamente
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'teammate_edges'::regclass
  AND conname = 'teammate_edges_unique_pair';

-- Mensaje final
DO $$
BEGIN
  RAISE NOTICE '✅ Constraint único agregado a teammate_edges';
  RAISE NOTICE '   - Ahora puedes ejecutar el script ETL de edges';
END $$;
