# 📊 ETL del Dataset - FASE 3

## 🎯 Objetivo

Cargar el dataset de jugadores de fútbol de Kaggle en la base de datos PostgreSQL de Supabase.

---

## 📥 Paso 1: Descargar el Dataset

### Opción A: Kaggle Official (Recomendado)

1. **Ve a Kaggle:**
   ```
   https://www.kaggle.com/datasets/xfkzujqjvx97n/football-datasets
   ```

2. **Inicia sesión** con tu cuenta de Kaggle (o crea una gratis)

3. **Descarga el dataset:**
   - Click en el botón "Download" (arriba a la derecha)
   - Se descargará un archivo ZIP (~500MB)

4. **Extrae los archivos:**
   - Descomprime el ZIP
   - Busca estos archivos específicos:
     - `player_profiles.csv` (o `players.csv`)
     - `player_teammates_played_with.csv`

5. **Coloca los CSVs en:**
   ```
   packages/etl/data/
   ```

### Opción B: Dataset Alternativo

Si el link de Kaggle no funciona, puedes usar:
- **Transfermarkt API** (requiere scraping)
- **GitHub**: Buscar repos con datasets de Transfermarkt preprocesados

---

## 🔧 Paso 2: Configurar Variables de Entorno

El script ETL necesita acceso a la base de datos. Asegúrate de que el archivo `.env` en la raíz tenga:

```bash
DATABASE_URL=postgresql://postgres:[TU-PASSWORD]@db.aproqvilojuhqjickjfr.supabase.co:5432/postgres
```

**Ya debería estar configurado desde la FASE 2.**

---

## 🚀 Paso 3: Ejecutar ETL de Jugadores

```bash
# Desde la raíz del proyecto
bun run etl:players
```

**Qué hace este script:**
- Lee `packages/etl/data/player_profiles.csv`
- Normaliza nombres para búsqueda (quita acentos, lowercase)
- Inserta jugadores en la tabla `players`
- Maneja duplicados automáticamente
- Inserta en lotes de 1000 para performance

**Output esperado:**
```
🏃 Iniciando carga de jugadores...
📂 Leyendo archivo: packages/etl/data/player_profiles.csv
✅ 45623 registros leídos del CSV
🔄 Normalizando datos...
✅ 45623 jugadores normalizados
💾 Insertando en base de datos...
  📊 Progreso: 45623/45623 (100%)
✅ ¡Carga completada!
   - Total registros CSV: 45623
   - Jugadores insertados: 45623
   - Tiempo: 8.45s
```

---

## 🔗 Paso 4: Ejecutar ETL de Relaciones

```bash
# Desde la raíz del proyecto
bun run etl:edges
```

**Qué hace este script:**
- Lee `packages/etl/data/player_teammates_played_with.csv`
- Filtra relaciones por calidad (mínimo 90 minutos juntos)
- Resuelve IDs de compañeros desde URLs o nombres
- Crea edges bidireccionales (A→B y B→A)
- Calcula `weight_score` (minutos + goles * 100)
- Inserta en la tabla `teammate_edges`

**Output esperado:**
```
🔗 Iniciando carga de relaciones de compañeros...
📂 Leyendo archivo: packages/etl/data/player_teammates_played_with.csv
✅ 1284560 registros leídos del CSV
🔄 Filtrando por calidad...
✅ 856234 relaciones cumplen criterio de calidad (>= 90 min)
🔍 Resolviendo IDs de compañeros...
✅ 852103 relaciones resueltas, 4131 omitidas
🔄 Creando edges bidireccionales...
✅ 1704206 edges totales (bidireccionales)
💾 Insertando en base de datos...
✅ ¡Carga completada!
   - Total registros CSV: 1284560
   - Filtrados por calidad: 856234
   - Edges insertados: 1704206
   - Tiempo: 45.32s
```

---

## 📊 Paso 5: Verificar Datos Cargados

### Opción A: Drizzle Studio (Visual)

```bash
bun run db:studio
```

Abre `https://local.drizzle.studio` y verifica:
- Tabla `players`: ~45k filas
- Tabla `teammate_edges`: ~1.7M filas

### Opción B: Query en Supabase

En Supabase SQL Editor:

```sql
-- Verificar jugadores cargados
SELECT COUNT(*) as total_players FROM players;

-- Verificar relaciones cargadas
SELECT COUNT(*) as total_edges FROM teammate_edges;

-- Ver ejemplo de jugadores
SELECT id, name, normalized_name 
FROM players 
LIMIT 10;

-- Ver ejemplo de relaciones
SELECT 
  p1.name as player,
  p2.name as teammate,
  te.minutes_played_with,
  te.joint_goal_participation
FROM teammate_edges te
JOIN players p1 ON te.player_id = p1.id
JOIN players p2 ON te.teammate_id = p2.id
LIMIT 10;

-- Buscar un jugador específico (ejemplo: Messi)
SELECT * FROM players 
WHERE normalized_name ILIKE '%messi%';

-- Ver compañeros de un jugador
SELECT 
  p.name as teammate_name,
  te.minutes_played_with,
  te.joint_goal_participation
FROM teammate_edges te
JOIN players p ON te.teammate_id = p.id
WHERE te.player_id = (SELECT id FROM players WHERE name = 'Lionel Messi')
ORDER BY te.weight_score DESC
LIMIT 20;
```

---

## 🛠️ Configuración Avanzada

### Ajustar Filtros de Calidad

Edita `packages/etl/src/load-edges.ts`:

```typescript
// Línea 13-14
const MIN_MINUTES = 90; // Cambiar a 180 para mayor calidad
const MAX_EDGES_PER_PLAYER = 500; // Limitar jugadores muy populares
```

### Re-ejecutar ETL

Si necesitas volver a cargar:

```bash
# Borrar datos existentes (CUIDADO: destructivo)
# En Supabase SQL Editor:
TRUNCATE TABLE teammate_edges CASCADE;
TRUNCATE TABLE players CASCADE;

# Volver a ejecutar
bun run etl:players
bun run etl:edges
```

---

## ❓ Troubleshooting

### Error: "Cannot find module 'csv-parse'"

```bash
bun install
```

### Error: "ENOENT: no such file or directory"

Verifica que los CSVs estén en `packages/etl/data/`:
```bash
ls packages/etl/data/
# Deberías ver: player_profiles.csv, player_teammates_played_with.csv
```

### Error: "relation 'players' does not exist"

Ejecuta primero el script SQL de setup:
```bash
# Revisa FASE 2: scripts/EJECUTAR_EN_SUPABASE.sql
```

### Error: "password authentication failed"

Verifica tu `.env`:
```bash
cat .env | grep DATABASE_URL
# Debe tener tu contraseña correcta
```

### Los datos se cargan muy lento

Ajusta `BATCH_SIZE` en los scripts:
```typescript
const BATCH_SIZE = 2000; // Aumentar para más velocidad
```

---

## ✅ Checklist de Verificación

- [ ] Dataset descargado de Kaggle
- [ ] CSVs colocados en `packages/etl/data/`
- [ ] `DATABASE_URL` configurado correctamente en `.env`
- [ ] Script `etl:players` ejecutado sin errores
- [ ] Script `etl:edges` ejecutado sin errores
- [ ] Datos verificados en Drizzle Studio o Supabase
- [ ] Query de búsqueda de jugador funciona correctamente

**Cuando todos estén ✅ → FASE 3 COMPLETADA** 🎉

---

## 📝 Próximos Pasos

**FASE 4:** Implementar API backend (Hono + Bun)
- Endpoint de búsqueda de jugadores (autocompletado)
- Servicio de matchmaking con Redis
- Validación de jugadas server-side
- Cálculo de ELO

**FASE 5:** Configurar PartyKit para real-time WebSocket

**FASE 6:** Implementar frontend Next.js con componentes del juego
