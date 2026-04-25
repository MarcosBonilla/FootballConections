# 🔧 SOLUCIÓN DEFINITIVA - API Backend Football Connections

## ❌ Problema Encontrado

### Error DNS IPv6 con Bun en Windows

```
DNSException: getaddrinfo ENOTFOUND db.aproqvilojuhqjickjfr.supabase.co
syscall: "getaddrinfo"
errno: 4
code: "ENOTFOUND"
```

**Causa raíz:** Bun 1.3.13 en Windows no resuelve correctamente hostnames IPv6 de Supabase.

### Intentos fallidos:
1. ❌ Usar pooler de Supabase (puerto 6543) - Error "Tenant or user not found"
2. ❌ Usar `postgres-js` con configuración hardcoded - Persiste error DNS
3. ❌ Usar `pg` (node-postgres) con Bun - Persiste error DNS
4. ❌ Forzar IPv4 en configuración - No resuelve el problema

---

## ✅ SOLUCIÓN FUNCIONAL

### Stack Final

```
Runtime: Node.js 22.20.0 + tsx
Framework: Hono 4.6.14
Database: Supabase REST API (@supabase/supabase-js 2.104.1)
Server Adapter: @hono/node-server 2.0.0
Validation: Zod + @hono/zod-validator
Cache: Upstash Redis
```

### Configuración Correcta

**1. packages/database/src/index.ts**

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import * as schema from './schema';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

// Supabase REST API client (ESTABLE - USA ESTO)
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Drizzle client (OPCIONAL - puede fallar en Windows)
let pool: Pool | null = null;
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
  });
} catch (error) {
  console.warn('PostgreSQL pool creation failed, using Supabase REST API only');
}

export const db = pool ? drizzle(pool, { schema }) : null;
```

**2. apps/api/src/index.ts**

```typescript
// Support both Bun and Node.js runtimes
async function startServer() {
  if (typeof Bun !== 'undefined') {
    // Bun runtime
    console.log(`🚀 API Server running on http://localhost:${port}`);
  } else {
    // Node.js runtime
    const { serve } = await import('@hono/node-server');
    console.log(`🚀 API Server running on http://localhost:${port}`);
    serve({
      fetch: app.fetch,
      port: Number(port),
    });
  }
}

startServer().catch(console.error);

export default { port, fetch: app.fetch };
```

**3. Comandos de inicio**

```bash
# CORRECTO - Con Node.js
npx tsx --env-file=.env apps/api/src/index.ts

# INCORRECTO - Con Bun (falla DNS en Windows)
bun --hot apps/api/src/index.ts
```

---

## 📊 Estado de Endpoints

### ✅ FUNCIONANDO (100%)

```
GET  /health                          → OK (200)
GET  /api/players/search?q=messi      → OK (200) - Supabase REST API
GET  /api/players/:id                 → OK (200) - Supabase REST API
GET  /api/players/:id/teammates       → OK (200) - Supabase REST API + 2 queries
GET  /api/ratings/leaderboard         → OK (200) - Supabase REST API
GET  /api/ratings/:userId             → OK (200) - Supabase REST API
```

### ⏳ PENDIENTE (Auth requerido)

```
POST /api/auth/signup                 → 501 Not Implemented
POST /api/auth/login                  → 501 Not Implemented
POST /api/auth/logout                 → 501 Not Implemented
GET  /api/auth/me                     → 501 Not Implemented

POST /api/matchmaking/join            → Requiere auth
POST /api/matchmaking/leave           → Requiere auth
GET  /api/matchmaking/status          → Requiere auth
POST /api/matchmaking/match           → Requiere auth

GET  /api/matches                     → Requiere auth
GET  /api/matches/:id                 → Requiere auth
```

---

## 🎯 Patrón de Queries con Supabase REST API

### Búsqueda Simple

```typescript
const { data, error } = await supabase
  .from('players')
  .select('id, name, slug')
  .ilike('normalized_name', `%${query}%`)
  .limit(10);
```

### Con Count

```typescript
const { count } = await supabase
  .from('teammate_edges')
  .select('*', { count: 'exact', head: true })
  .eq('player_id', id);
```

### Con JOIN (2 queries separadas)

```typescript
// Query 1: Obtener edges
const { data: edges } = await supabase
  .from('teammate_edges')
  .select('teammate_id, weight_score')
  .eq('player_id', id)
  .order('weight_score', { ascending: false })
  .limit(10);

// Query 2: Obtener detalles de los jugadores
const teammateIds = edges.map(e => e.teammate_id);
const { data: players } = await supabase
  .from('players')
  .select('id, name')
  .in('id', teammateIds);

// Combinar resultados
const playersMap = new Map(players.map(p => [p.id, p]));
const result = edges.map(e => ({
  ...playersMap.get(e.teammate_id),
  weight_score: e.weight_score
}));
```

### Con Ordering

```typescript
const { data } = await supabase
  .from('player_ratings')
  .select('*')
  .order('elo', { ascending: false })
  .range(offset, offset + limit - 1);
```

---

## 🛠️ Servicios Implementados

### ✅ MatchmakingService (Redis)

**Funcionalidades:**
- Cola FIFO con timestamp en Redis ZSET
- Matching por rango ELO (base 50 + 25 por cada 10s)
- Cleanup automático de entradas expiradas (5 min TTL)
- Estado de cola con posición y tiempo de espera

### ✅ GameValidationService

**Funcionalidades:**
- Validación de existencia de edge en `teammate_edges`
- Validación de jugador no repetido en cadena
- Sugerencias de movimientos válidos (top 5 por weight_score)

### ✅ EloCalculator

**Funcionalidades:**
- K-factor variable (40 < 30 partidas, 20 entre 30-100, 10 > 100)
- Cálculo de expected score
- Actualización de ratings con historial

---

## 📦 Dependencias Clave

```json
{
  "dependencies": {
    "@hono/node-server": "^2.0.0",        // Adapter Node.js
    "@hono/zod-validator": "^0.4.1",      // Validación
    "@supabase/supabase-js": "^2.104.1",  // CRÍTICO - REST API
    "@upstash/redis": "^1.34.3",          // Queue + Rate limit
    "hono": "^4.6.14",                    // Framework
    "pg": "^8.11.3",                      // Opcional (Drizzle)
    "zod": "^3.23.8"                      // Schemas
  },
  "devDependencies": {
    "tsx": "^4.21.0"                      // TypeScript runner Node.js
  }
}
```

---

## 🚀 Inicio Rápido

### Verificar requisitos

```bash
node --version  # >= 22.20.0
npx --version   # >= 10.x
```

### Variables de entorno (.env)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://aproqvilojuhqjickjfr.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...  # Service role key
UPSTASH_REDIS_URL=https://teaching-arachnid-95994.upstash.io
UPSTASH_REDIS_TOKEN=gQAAA...
PORT=3001
```

### Iniciar servidor

```bash
cd C:\Users\wacho\Desktop\FootballConections
npx tsx --env-file=.env apps/api/src/index.ts
```

### Test rápido

```powershell
# Health check
curl http://localhost:3001/health

# Búsqueda de jugador
curl "http://localhost:3001/api/players/search?q=messi&limit=5"

# Detalles de Messi (ID 28003)
curl http://localhost:3001/api/players/28003

# Compañeros de Messi
curl "http://localhost:3001/api/players/28003/teammates?limit=5"
```

---

## ⚠️ Lecciones Aprendidas

### 1. No usar Bun para conexiones PostgreSQL en Windows
- DNS IPv6 no se resuelve correctamente
- Afecta tanto a `postgres-js` como a `pg`
- Node.js maneja DNS correctamente

### 2. Supabase REST API > PostgreSQL directo
- Más estable (HTTPS vs socket TCP)
- Sin problemas de DNS
- Mejor manejo de errores
- Soporte built-in para RLS, Auth, Storage

### 3. Foreign Key Joins en Supabase
- No usar sintaxis `players!fk_name(...)` - puede fallar si FK no está en cache
- Hacer 2 queries separadas y combinar en memoria
- Performance aceptable para < 100 registros

### 4. Runtime Detection
- Detectar `typeof Bun !== 'undefined'` para dual runtime
- Node.js necesita adapter `@hono/node-server`
- Bun puede exportar directamente `{ port, fetch }`

---

## 📝 Próximos Pasos

### Completar FASE 4
1. ✅ Player endpoints con Supabase REST API
2. ✅ Ratings endpoints con Supabase REST API
3. ⏳ **Auth con Supabase Auth SDK**
4. ⏳ **Matchmaking funcional (requiere auth)**
5. ⏳ **Matches endpoints (requiere auth)**

### FASE 5 - PartyKit
- Servidor WebSocket con Durable Objects
- Handlers de mensajes real-time
- Sincronización con PostgreSQL

### FASE 6 - Next.js Frontend
- Game board UI
- Matchmaking queue UI
- Auth integration
- Real-time con PartySocket

---

## 🐛 Troubleshooting

### Error: "getaddrinfo ENOTFOUND"
**Solución:** Usar Node.js en lugar de Bun

### Error: "Tenant or user not found"
**Solución:** Usar REST API directa en lugar de pooler

### Error: "Could not find relationship"
**Solución:** Hacer queries separadas en lugar de JOIN con foreign key

### Error: "Module not found"
**Solución:** Ejecutar `bun install` desde el directorio raíz

---

**Última actualización:** 2026-04-25  
**Estado:** ✅ API funcional con Supabase REST API  
**Próximo milestone:** Auth endpoints con Supabase Auth SDK
