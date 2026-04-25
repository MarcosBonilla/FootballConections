# Stack Tecnológico — Football Connections Multiplayer

## 1) Resumen ejecutivo del stack

| Capa | Tecnología elegida | Alternativa evaluada |
|------|-------------------|----------------------|
| Frontend | Next.js 15 (App Router) | Remix, SvelteKit |
| UI | Tailwind CSS + shadcn/ui | MUI, Chakra |
| Estado client | Zustand | Jotai, Redux |
| Real-time (partidas) | PartyKit | Socket.io, Supabase Realtime |
| API REST | Hono + Bun | Fastify, Express, Next.js Routes |
| Base de datos | Supabase (PostgreSQL) | Neon + Auth.js |
| ORM | Drizzle ORM | Prisma |
| Cache / Cola | Upstash Redis | Redis cloud, Valkey |
| Auth | Supabase Auth | Clerk, Auth.js |
| ETL dataset | Script Bun/Python | — |
| Deploy frontend | Vercel | Cloudflare Pages |
| Deploy real-time | PartyKit (edge Cloudflare) | Cloudflare Workers |

---

## 2) Decisiones clave y por qué

### 2.1 Next.js 15 — Frontend

**Por qué:** Es el estándar de facto para web apps full-stack con React. El App Router
facilita SSR/SSG para páginas de ranking y perfiles públicos, mientras
que el cliente puro se usa en la pantalla del juego.

**Lo que nos da:**
- Server Components para SEO de perfiles y leaderboard sin JS extra al cliente.
- Route Handlers como puente ligero hacia servicios internos.
- Ecosystem maduro: shadcn, Framer Motion, tRPC, etc.
- Deploy trivial en Vercel (primera clase).

**Por qué no Remix:** Remix es excelente, pero el ecosistema de componentes,
hosting automático y la cantidad de ejemplos de juegos reales con Next.js
inclinan la balanza.

---

### 2.2 PartyKit — Capa real-time (PIEZA CENTRAL)

**Por qué es la elección correcta para este juego:**

PartyKit fue diseñado específicamente para apps multiplayer y colaborativas.
Corre sobre **Cloudflare Durable Objects** (ingresó a Cloudflare en 2024),
lo que implica:

- **Una "party" (sala) por partida.** Cada match tiene su propio objeto con estado persistente en memoria + WebSocket gestionado.
- Latencia de edge: los jugadores conectan al nodo Cloudflare más cercano, la sala vive donde fue creada. Para un juego de turnos (no twitch-shooter), es más que suficiente.
- **WebSocket Hibernation:** el objeto se duerme entre mensajes y Cloudflare mantiene la conexión WS activa sin cobrar CPU inactiva.
- Deploy incluido en el plan free de Cloudflare (o en el tuyo propio sin costes hasta volumen).

**Modelo de uso para este juego:**

```
Cliente A  ──WS──┐                  ┌── WS ── Cliente B
                 └── PartyKit Room ──┘
                    (match_id como room id)
                    Estado: turno actual, cadena, deadline
```

Cuando un jugador hace un movimiento:
1. Envía mensaje WS al room.
2. PartyKit valida contra BD (Supabase) si el edge no tiene la info.
3. PartyKit retransmite el resultado a ambos clientes.
4. Guarda el turno en Supabase (audit trail permanente).

**Por qué no Socket.io:** Socket.io requiere un servidor Node.js dedicado (sticky sessions,
escalado horizontal complejo). PartyKit elimina toda esa infraestructura.

**Por qué no Supabase Realtime:** Supabase Realtime es excelente para cambios de BD
(Postgres Changes), pero no fue diseñado para lógica de juego en el canal. No tiene
el concepto de sala con estado en memoria. Usaremos Supabase Realtime solo como
complemento para actualizaciones simples (ELO, notificaciones).

---

### 2.3 Hono + Bun — API REST

**Por qué Hono:**
- Framework web ultra-ligero TypeScript-first. 0 deps.
- Mismo código corre en Bun, Node.js, Cloudflare Workers o Deno.
- API de middlewares limpia, validación con Zod integrable.
- Rendimiento: nativo sobre Web Standards (Request/Response), no abstrae en capas.

**Por qué Bun:**
- Runtime 4x más rápido que Node.js, 5x más mensajes WS por segundo.
- WebSocket server nativo (`Bun.serve({ websocket: {...} })`), sin `ws` ni paquetes extra.
- TypeScript nativo sin transpilación.
- Incluye test runner, bundler y package manager. Un solo binario.

**Rol de Hono en el proyecto:**
- Endpoints de validación de jugada (puede ser llamado por PartyKit server-side).
- Endpoints de ELO (recalcular y persistir al terminar partida).
- Endpoints de matchmaking REST (join/leave queue).
- Endpoint de búsqueda de jugadores (autocompletado por nombre).

**Por qué no Next.js API Routes para todo:** Los Route Handlers de Next.js son
convenientes para cosas simples, pero Hono es más explícito, testeable y performante
para lógica de negocio crítica como validación de cadenas o ELO.

---

### 2.4 Supabase — Base de datos + Auth + Realtime

**Por qué Supabase (y no Neon + soluciones separadas):**

Supabase es PostgreSQL administrado que incluye en un solo servicio:
- PostgreSQL con extensiones (pgcrypto, uuid-ossp, pg_trgm para búsqueda fuzzy de nombres).
- Auth con providers sociales (Google, Discord) listo sin código extra.
- Realtime para notificaciones secundarias.
- Dashboard y SQL editor para explorar datos en desarrollo.
- SDK para cliente JS (`@supabase/supabase-js`).

Para un MVP de un juego, reducir el número de servicios externos es crítico.
Neon es excelente como Postgres serverless, pero obliga a agregar Auth y Realtime
por separado (más configuración).

**Tablas en Supabase:**
- Todas las definidas en `Documentacion/BD/README.md`
- El grafo de jugadores (players + teammate_edges) cargado desde el dataset Transfermarkt.
- La tabla `players` con `pg_trgm` para búsqueda eficiente de nombres parciales.

**Extensión clave:**
```sql
-- Para buscar jugadores por nombre parcial con typo-tolerance
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_players_name_trgm ON players
  USING GIN (normalized_name gin_trgm_ops);
```

---

### 2.5 Drizzle ORM — Acceso a datos

**Por qué no Prisma:**
- Prisma tiene un cliente generado que no es compatible con edge runtimes (Cloudflare Workers) sin workarounds.
- Prisma genera queries menos óptimas para joins complejos.
- Prisma pesa ~MB en bundle.

**Por qué Drizzle:**
- 0 dependencias externas. Slim y serverless-ready.
- TypeScript-first: el schema es código TS, no un `.prisma` separado.
- API SQL-like: si sabes SQL, sabes Drizzle.
- Compatible con Bun, Node.js, Cloudflare Workers, Vercel Edge.
- 1 sola query generada por operación (nunca N+1 silencioso).
- Integración nativa con Supabase, Neon, PlanetScale.

**Ejemplo de uso clave:**
```typescript
// Buscar compañeros de un jugador
const teammates = await db
  .select()
  .from(teammateEdges)
  .where(eq(teammateEdges.playerId, currentPlayerId))
  .limit(50);
```

---

### 2.6 Upstash Redis — Cola de matchmaking y estado volátil

**Por qué Redis aquí:**
La cola de matchmaking necesita:
- Inserciones y lecturas con latencia < 5ms.
- TTL nativo (si un jugador no consigue match en X segundos, su entrada expira).
- Sets ordenados por ELO para encontrar el oponente más cercano eficientemente.

**Por qué Upstash y no Redis cloud / self-hosted:**
- Serverless y pay-per-request (gratis hasta 10k req/día).
- HTTP y WebSocket compatible: funciona desde Cloudflare Workers y Vercel Edge sin cliente TCP.
- SDK TypeScript de primera clase (`@upstash/redis`).
- Multi-region: un read replica cerca del servidor.

**Uso concreto:**

```
matchmaking_queue (Redis Sorted Set)
  score = ELO del jugador
  member = user_id

TTL de entrada: 30s (si no hay match, se reencola o cancela)
```

Lógica de matchmaking:
1. `ZADD matchmaking_queue {elo} {user_id}` al unirse.
2. Buscar miembro con score más cercano: `ZRANGE BYSCORE elo-50 elo+50 LIMIT 1`.
3. Si hay match: crear partida en Supabase, eliminar ambos de Redis, notificar.
4. Si no hay match: esperar X segundos, ampliar rango, repetir.

También usamos Redis para:
- `match:{match_id}:deadline` con TTL = segundos por turno (si expira, turno perdido).
- `match:{match_id}:state` en memoria durante la partida activa (cache de cadena actual).

---

### 2.7 Supabase Auth — Autenticación

**Por qué Supabase Auth:**
- Integrado con la BD: cada usuario en `auth.users` puede mapearse a nuestra tabla `users`.
- Soporta providers: Google, Discord, GitHub, email/password.
- JWT emitido directamente usable en Drizzle y en PartyKit para autenticar la conexión WS.
- Sin costo adicional (incluido en Supabase).

**Alternativa:** Clerk — mejor DX, componentes de UI de auth listos, pero require plan de pago
para usuarios > 10k y añade dependencia externa al ser un servicio separado.
Para MVP, Supabase Auth es suficiente.

---

### 2.8 Tailwind CSS + shadcn/ui — UI

**Por qué:**
- shadcn/ui son componentes copy-paste (no dependencia de paquete), fáciles de personalizar.
- Tailwind para estilos utility-first, sin CSS-in-JS overhead en runtime.
- La pantalla del juego es relativamente simple: nombre del jugador actual, input, cadena, temporizador, ELOs.

---

### 2.9 Zustand — Estado del cliente

**Por qué:**
- Minimal y sin boilerplate (vs Redux).
- Perfecto para estado del juego en cliente: cadena actual, turno vigente, countdown, mis datos de usuario.
- Se integra bien con WebSocket: el handler WS actualiza el store y React re-renderiza solo lo necesario.

---

## 3) Script ETL (carga del dataset)

Proceso one-time (o periódico si hay nueva versión del dataset):

**Herramienta:** Bun + script TypeScript (o Python si se prefiere pandas para transformaciones complejas).

**Fuentes:**
- CSV `player_profiles` → tabla `players`
- CSV `player_teammates_played_with` → tabla `teammate_edges`

**Pasos:**
1. Descargar CSVs del dataset Kaggle.
2. Parsear y limpiar nombres (normalizar diacríticos, lowercase, trim).
3. Resolver `player_with_url` → `player_id` usando mapa slug→id.
4. Aplicar filtros de calidad (ej. `minutes_played_with >= 90`).
5. Upsert en Supabase con Drizzle.
6. Reconstruir índice `gin_trgm` si hubo cambios masivos.

---

## 4) Diagrama de arquitectura

```
┌─────────────┐     WebSocket      ┌────────────────────────┐
│  Browser    │◄──────────────────►│  PartyKit Room         │
│  Next.js 15 │                    │  (1 room = 1 match)    │
│  + Zustand  │                    │  Estado: turno, cadena │
└──────┬──────┘                    └──────────┬─────────────┘
       │ HTTPS                                │ HTTP (validar jugada, ELO)
       ▼                                      ▼
┌─────────────┐                    ┌──────────────────────┐
│  Next.js    │                    │  Hono + Bun API      │
│  Server     │                    │  /validate, /elo     │
│  (Vercel)   │                    │  /players/search     │
└──────┬──────┘                    └──────────┬───────────┘
       │                                      │
       └─────────────────┬────────────────────┘
                         ▼
              ┌──────────────────────┐
              │  Supabase             │
              │  PostgreSQL           │
              │  players              │
              │  teammate_edges       │
              │  users / matches      │
              │  match_turns          │
              │  rating_history       │
              └──────────┬───────────┘
                         │
              ┌──────────▼───────────┐
              │  Upstash Redis        │
              │  matchmaking_queue   │
              │  match deadlines     │
              │  match state cache   │
              └──────────────────────┘
```

---

## 5) Flujo completo de una partida

### Fase 1 — Matchmaking
1. Usuario pulsa "Play" en Next.js.
2. Next.js llama `POST /matchmaking/join` en Hono API.
3. Hono inserta `{user_id, elo}` en Redis Sorted Set con TTL 30s.
4. Worker (Bun proceso o cron cada 2s) busca par con ELO cercano.
5. Al encontrar par: Hono crea `match` en Supabase, elige `seed_player_id` aleatorio.
6. Hono crea room en PartyKit para ese `match_id`.
7. Ambos clientes reciben URL de room vía respuesta HTTP o Supabase Realtime.

### Fase 2 — Partida activa
1. Ambos jugadores se conectan por WS al mismo PartyKit room.
2. PartyKit emite estado inicial: seed player, de quién es el turno, deadline.
3. Jugador activo escribe nombre en el input → debounce de búsqueda → sugerencias via `GET /players/search?q=...`.
4. Jugador confirma nombre → PartyKit recibe evento `play` con `player_name`.
5. PartyKit llama `POST /validate` en Hono API:
   - Hono resuelve `player_id` por nombre.
   - Hono consulta `teammate_edges` en Supabase: ¿existe edge entre `current` y `candidate`?
   - Hono verifica que `player_id` no esté ya en la cadena del match.
6. Hono responde a PartyKit con `{valid: true/false, player_id, reason}`.
7. PartyKit emite resultado a ambos clientes:
   - Si válido: actualiza cadena, cambia turno, reinicia deadline en Redis.
   - Si inválido: match over, emit `game_over` con winner.
8. PartyKit persiste turno en Supabase (`match_turns` + `match_chain_nodes`).

### Fase 3 — Fin de partida
1. PartyKit emite `game_over` con winner/reason.
2. Hono calcula nuevo ELO para ambos jugadores.
3. Hono actualiza `player_ratings` y `rating_history` en Supabase.
4. Clientes muestran resultado + nuevos ELOs.
5. PartyKit room se cierra.

---

## 6) Decisión de infraestructura por etapa

### MVP (0-500 usuarios simultáneos)

| Servicio | Plan | Coste estimado |
|---------|------|----------------|
| Vercel | Hobby | Gratis |
| Supabase | Free | Gratis |
| PartyKit | Cloudflare free | Gratis |
| Upstash Redis | Free (10k req/día) | Gratis |

**Coste MVP: 0€/mes**

### Escala (500-5000 usuarios simultáneos)

| Servicio | Plan | Coste estimado |
|---------|------|----------------|
| Vercel | Pro | ~$20/mes |
| Supabase | Pro | ~$25/mes |
| PartyKit/Cloudflare | Pay-per-use | ~$5-15/mes |
| Upstash Redis | Pay-per-use | ~$10/mes |

**Coste escala media: ~$60-70/mes**

---

## 7) Riesgos técnicos y mitigaciones por capa

| Riesgo | Capa | Mitigación |
|--------|------|-----------|
| Latencia alta en validación | API | Cachear `teammate_edges` hot en Redis |
| Doble jugada (race condition) | PartyKit | PartyKit Room = single-threaded por diseño |
| Supabase cold start | DB | Connection pooler (Supavisor activado en Supabase) |
| Nombres ambiguos de jugadores | Validación | Búsqueda por `player_id` interno, UI con sugerencias |
| Colas de matchmaking sin match | Redis | TTL + expansión progresiva de rango ELO |
| Disconnects a media partida | PartyKit | WS Hibernation: el room persiste aunque cliente desconecte |

---

## 8) Tecnologías descartadas y razón

| Tecnología | Por qué descartada |
|------------|-------------------|
| Socket.io | Requiere servidor dedicado, sticky sessions, escalado complejo |
| Prisma | No edge-compatible sin workarounds, bundle pesado |
| Firebase/Firestore | Vendor lock-in duro, no SQL, modelo de datos menos apto para grafo |
| Supabase Realtime (como capa de juego) | No tiene estado de sala en memoria, pensado para cambios de BD |
| tRPC | Útil para type-safety, pero capa extra innecesaria con Hono que ya es type-safe |
| MongoDB | No relacional, JOINs del grafo de teammates son más naturales en SQL |
| GraphQL | Overkill para este dominio; REST es suficiente y más simple en Hono |

---

## 9) Herramientas de desarrollo

- **pnpm** ó **bun** como package manager
- **Biome** para lint + format (reemplaza ESLint + Prettier, mucho más rápido)
- **Vitest** ó `bun test` para unit tests (validación, ELO)
- **Playwright** para tests e2e de flujo de partida
- **Drizzle Kit** para migraciones de schema
- **Wrangler** (Cloudflare CLI) para PartyKit local dev
