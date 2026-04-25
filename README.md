# ⚽ Football Connections

Juego multiplayer 1v1 de cadena de compañeros de fútbol con matchmaking ELO.

## 🎯 Estado del Proyecto

✅ **FASE 1**: Setup inicial (Bun, monorepo, Next.js 15)  
✅ **FASE 2**: Base de datos (8 tablas, 19 índices, RLS)  
✅ **FASE 3**: ETL (92,671 jugadores + 413,676 relaciones)  
✅ **FASE 4**: API REST (17 endpoints, auth, matchmaking, ELO) → **COMPLETADA**  
⏳ **FASE 5**: PartyKit WebSocket → En espera

📄 Ver: [FASE_4_COMPLETADA.md](Documentacion/FASE_4_COMPLETADA.md)

---

## 🚀 Stack Tecnológico

### Frontend (En Desarrollo)
- **Framework**: Next.js 15.3.2 (App Router) + React 19
- **Styling**: Tailwind CSS + shadcn/ui
- **Estado**: Zustand
- **Real-time**: PartyKit WebSocket client

### Backend API (✅ Funcional)
- **Runtime**: Node.js 22.20.0 + tsx ⚠️ NO Bun (DNS IPv6 issue)
- **Framework**: Hono 4.6.14 con @hono/node-server
- **Database**: Supabase REST API (@supabase/supabase-js)
- **Auth**: Supabase Auth
- **Cache**: Upstash Redis (matchmaking queue)
- **Validation**: Zod

### Infraestructura
- **Database**: Supabase PostgreSQL (92K players, 413K edges)
- **Real-time**: PartyKit (Cloudflare Durable Objects)
- **ORM**: Drizzle ORM (migraciones)

---

## 📦 Estructura del Proyecto

```
football-connections/
├── apps/
│   ├── web/         # [TODO] Next.js frontend
│   ├── api/         # ✅ Hono API (Node.js 22)
│   └── partykit/    # [TODO] PartyKit real-time
├── packages/
│   ├── database/    # ✅ Supabase client + Drizzle schema
│   ├── shared/      # ✅ Constantes compartidas
│   └── etl/         # ✅ ETL completado (92K players)
├── Documentacion/   # ✅ 400+ KB de specs
└── scripts/         # Scripts de setup
```

---

## 🛠️ Setup Inicial

### 1. Instalar dependencias

```bash
bun install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Variables requeridas:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - UPSTASH_REDIS_REST_URL
# - UPSTASH_REDIS_REST_TOKEN
```

### 3. Base de Datos (Ya Completada)

✅ La base de datos ya está configurada con:
- 8 tablas creadas
- 92,671 jugadores cargados
- 413,676 relaciones de compañeros

Si necesitas recrearla:

```bash
bun run db:generate
bun run db:migrate
bun run etl:players  # Cargar jugadores
bun run etl:edges    # Cargar relaciones
```

---

## 🏃 Desarrollo

### API REST (Puerto 3001)

⚠️ **IMPORTANTE**: Usar Node.js, NO Bun (problema DNS IPv6)

```powershell
# Iniciar API (recomendado)
npx tsx --env-file=.env apps/api/src/index.ts

# O con el script incluido
.\apps\api\start-server.ps1
```

**NO USAR**: `bun --hot apps/api/src/index.ts` (falla con Supabase)

**Ver**: `Documentacion/SOLUCION_DEFINITIVA_API.md`

---

### PartyKit WebSocket Server (Puerto 1999)

✅ **NUEVO**: Servidor real-time para partidas 1v1

```bash
# Iniciar PartyKit
bun run dev:party
```

Servidor levanta en `http://localhost:1999`

**Ver**: `apps/partykit/README.md` y `Documentacion/FASE_5_COMPLETADA.md`

---

### Frontend Next.js (Puerto 3000 - En Desarrollo)

```bash
bun run dev:web
```

**Estado**: FASE 6 pendiente (25 componentes a implementar)

---

## 🧪 Testing API

```powershell
# Health check
curl http://localhost:3001/health

# Buscar jugador
curl "http://localhost:3001/api/players/search?q=messi"

# Detalles de jugador
curl http://localhost:3001/api/players/28003

# Leaderboard
curl http://localhost:3001/api/ratings/leaderboard?limit=10
```

---

## 📚 Documentación

Toda la documentación técnica está en `/Documentacion`:

- **BD**: Modelo de datos y especificaciones de base de datos
- **Stack**: Decisiones técnicas del stack
- **Funcionales**: Especificaciones de componentes y flujos (29 componentes)
- **Agentes**: Sistema de agentes para desarrollo
- **FASE_4_COMPLETADA.md**: 🔥 Resumen completo de la API funcional
- **SOLUCION_DEFINITIVA_API.md**: 🔧 Diagnóstico y solución del problema DNS

---

## 🎮 Cómo Jugar (Cuando Frontend Esté Listo)

1. Regístrate o inicia sesión
2. Presiona "Play" para entrar a la cola de matchmaking
3. Espera a que el sistema encuentre un oponente con ELO similar
4. Recibe un jugador inicial random (ej: Mbappé)
5. En tu turno, escribe el nombre de un compañero válido del jugador actual
6. Tienes 20 segundos por turno
7. Pierde quien se quede sin tiempo

**Regla importante**: Solo pierdes por timeout o desconexión. Los intentos inválidos NO terminan la partida.

---

## 🐛 Troubleshooting

### Error: DNSException ENOTFOUND (Bun + Supabase)

**Problema**: Bun 1.3.13 no puede resolver hostnames IPv6 de Supabase en Windows.

**Solución**: Usar Node.js 22 con tsx (ver comando arriba).

**Referencia**: [SOLUCION_DEFINITIVA_API.md](Documentacion/SOLUCION_DEFINITIVA_API.md)

### Puerto 3001 ocupado

```powershell
Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
```

---

## 📊 Métricas del Proyecto

- **Jugadores**: 92,671
- **Relaciones**: 413,676
- **Endpoints API**: 17 implementados
- **Servicios**: 3 core (matchmaking, validation, elo)
- **Middleware**: 4 (auth, cors, error-handler, rate-limiter)
- **Docs**: 400+ KB de especificaciones
- **Tiempo ETL**: ~8 minutos

---

## 🎓 Lecciones Aprendidas

1. **Bun DNS Issue**: Bun no es production-ready para PostgreSQL en Windows
2. **Supabase REST > PostgreSQL**: REST API más estable que conexión directa
3. **Foreign Key Joins**: Requieren cache warmup, 2-query pattern más confiable
4. **Email Validation**: Supabase requiere dominios MX reales en signup

---

## �️ Roadmap

- [x] **FASE 1**: Monorepo con Turborepo (Completada)
- [x] **FASE 2**: Base de Datos Supabase + Drizzle (Completada)
- [x] **FASE 3**: ETL Dataset Kaggle (Completada)
- [x] **FASE 4**: API REST con Hono (Completada)
  - 17 endpoints funcionales
  - 3 servicios core
  - 4 middleware
  - Autenticación JWT
- [x] **FASE 5**: PartyKit WebSocket Server (Completada)
  - GameRoom Durable Object (680 líneas)
  - 8 eventos cliente, 9 eventos servidor
  - Validación server-side
  - Sistema de timer (20s por turno)
  - Manejo de desconexión (10s grace period)
  - Integración con ELO
- [ ] **FASE 6**: Frontend Next.js 15 (Pendiente)
  - 25 componentes a implementar
  - 6 componentes core de juego
  - 6 componentes de autenticación
  - 13 componentes de layout/landing
- [ ] **FASE 7**: Testing E2E (Pendiente)
- [ ] **FASE 8**: Deploy a Producción (Pendiente)

---

## 📄 Licencia

MIT

## 👥 Equipo

Proyecto desarrollado para el curso de Desarrollo de Aplicaciones Web.
