# Football Connections API

API REST backend para el juego Football Connections.

## Stack Técnico

- **Runtime**: Node.js 22+ (mejor compatibilidad DNS que Bun en Windows)
- **Framework**: Hono 4.6+ (web framework ligero y rápido)
- **Database**: Supabase REST API (evita problemas de DNS IPv6)
- **Validation**: Zod + @hono/zod-validator
- **Cache/Queue**: Upstash Redis

## Instalación

```bash
# Desde el directorio raíz del proyecto
bun install
```

## Ejecución

### Opción 1: PowerShell Script (Recomendado)
```powershell
cd apps/api
.\start-server.ps1
```

### Opción 2: Comando directo
```bash
# Desde el directorio raíz
npx tsx --env-file=.env apps/api/src/index.ts
```

### Opción 3: Con Bun (si no tienes problemas de DNS)
```bash
cd apps/api
bun run dev
```

## Endpoints Disponibles

### Health Check
- `GET /health` - Estado del servidor

### Players
- `GET /api/players/search?q=messi&limit=10` - Búsqueda de jugadores (fuzzy)
- `GET /api/players/:id` - Detalles de un jugador
- `GET /api/players/:id/teammates?limit=20` - Compañeros de un jugador

### Ratings
- `GET /api/ratings/leaderboard?limit=20&orderBy=elo` - Ranking global
- `GET /api/ratings/:userId` - Rating de un usuario

### Auth (Pendiente implementación)
- `POST /api/auth/signup` - Registro (501 Not Implemented)
- `POST /api/auth/login` - Login (501 Not Implemented)
- `POST /api/auth/logout` - Logout (501 Not Implemented)
- `GET /api/auth/me` - Usuario actual (501 Not Implemented)

### Matchmaking (Pendiente auth)
- `POST /api/matchmaking/join` - Unirse a la cola
- `POST /api/matchmaking/leave` - Salir de la cola
- `GET /api/matchmaking/status` - Estado en la cola
- `POST /api/matchmaking/match` - Buscar match

### Matches (Pendiente auth)
- `GET /api/matches` - Historial de partidas
- `GET /api/matches/:id` - Detalles de una partida

## Configuración

Archivo `.env` en la raíz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://aproqvilojuhqjickjfr.supabase.co
SUPABASE_SERVICE_KEY=tu-service-key

# Upstash Redis
UPSTASH_REDIS_URL=https://teaching-arachnid-95994.upstash.io
UPSTASH_REDIS_TOKEN=tu-token

# App
PORT=3001
```

## Notas Técnicas

### Por qué Node.js en lugar de Bun

Aunque Bun es más rápido, tiene problemas con DNS IPv6 en Windows cuando se conecta a Supabase:

```
DNSException: getaddrinfo ENOTFOUND db.aproqvilojuhqjickjfr.supabase.co
```

Node.js + tsx resuelve este problema correctamente.

### Por qué Supabase REST API en lugar de PostgreSQL directo

La conexión directa a PostgreSQL de Supabase tiene problemas de DNS en algunos entornos Windows. Usar Supabase REST API (@supabase/supabase-js) proporciona:

- ✅ Mayor estabilidad (HTTPS en lugar de conexión PostgreSQL)
- ✅ Sin problemas de DNS
- ✅ Mejor manejo de errores
- ✅ Funcionalidad completa (queries, RPC, storage)

## Estructura del Código

```
apps/api/src/
├── index.ts              # Entry point, configuración del servidor
├── middleware/
│   ├── auth.ts           # Middleware de autenticación
│   ├── error-handler.ts  # Manejo global de errores
│   └── rate-limiter.ts   # Rate limiting con Redis
├── routes/
│   ├── auth.ts           # Endpoints de autenticación
│   ├── players.ts        # Endpoints de jugadores (✅ completo)
│   ├── matchmaking.ts    # Endpoints de matchmaking
│   ├── matches.ts        # Endpoints de partidas
│   └── ratings.ts        # Endpoints de ratings (✅ completo)
└── services/
    ├── matchmaking-service.ts    # Lógica de cola Redis (✅ completo)
    ├── game-validation-service.ts # Validación de movimientos (✅ completo)
    └── elo-calculator.ts          # Cálculo de ELO (✅ completo)
```

## Siguientes Pasos

1. **Implementar Supabase Auth** en `/api/auth/*`
2. **Integrar PartyKit** para WebSocket real-time
3. **Completar matchmaking** con auth funcional
4. **Tests unitarios** para servicios
