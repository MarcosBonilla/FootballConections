# Índice de Componentes - Football Connections

Este directorio contiene las especificaciones técnicas de todos los componentes Frontend y Backend del juego, derivadas de las [especificaciones funcionales transversales](../Transversal/).

---

## 📊 Resumen de Componentes

### Frontend (25 componentes)
- **Game Core**: 6 componentes
- **Autenticación**: 6 componentes
- **Layout/Navigation**: 5 componentes
- **Landing/Error Pages**: 6 componentes
- **UI Auxiliares**: 2 componentes

### Backend (4 servicios)
- **Servicios de negocio**: 4 servicios
- **API Endpoints**: Integrados en servicios

**Total:** 29 componentes especificados

---

## 🎨 Componentes Frontend

### 🎮 Game Core (6 componentes)

Componentes principales del flujo de juego en tiempo real.

#### 1. [MatchmakingQueue](./Frontend/01_MatchmakingQueue.md)
**Propósito:** Gestión completa de la cola de matchmaking con visualización de estado de búsqueda.

**Características principales:**
- Cola automática al montar el componente
- Expansión de rango ELO cada 5 segundos (±50 → ±75 → ±100 → ±150)
- WebSocket listener para `match_found` event
- Timer visual con contador de tiempo transcurrido
- Timeout después de 60 segundos
- Botón de cancelación

**Stack técnico:**
- Zustand para state management
- Motion/Framer para animaciones
- WebSocket para notificaciones real-time

**Dependencias:**
- `stores/matchmakingStore.ts`
- `hooks/useMatchmakingWebSocket.ts`
- `/api/matchmaking/join`, `/api/matchmaking/leave`

---

### Flujo de Partida

#### 2. [GameBoard](./Frontend/02_GameBoard.md)
**Propósito:** Contenedor principal del juego que orquesta todos los sub-componentes.

**Características principales:**
- Inicialización de estado desde PartyKit room
- Manejo de turnos (enable/disable input según turno)
- WebSocket integration para eventos de juego
- Timer client-side sincronizado con servidor
- Transición automática a ResultModal al finalizar

**Stack técnico:**
- Zustand store (`stores/gameStore.ts`)
- WebSocket room connection
- Composición de 5 sub-componentes

**Integra:**
- GameTimer
- PlayerInput (con autocomplete)
- ChainDisplay
- ResultModal
- LeaveButton

---

#### 3. [PlayerAutocomplete](./Frontend/03_PlayerAutocomplete.md)
**Propósito:** Input con autocompletado en tiempo real para nombres de jugadores.

**Características principales:**
- Debounce de 300ms en búsqueda
- Fuzzy matching con PostgreSQL `pg_trgm`
- Navegación por teclado (arrows, Enter, Escape, Tab)
- Máximo 5 sugerencias simultáneas
- Highlighting de caracteres coincidentes
- Auto-focus cuando es tu turno

**Stack técnico:**
- `use-debounce` hook
- PostgreSQL similarity search
- Motion para animaciones de dropdown

**API:**
- `POST /api/players/autocomplete`
  ```typescript
  body: { query, currentPlayerId, limit }
  response: PlayerSuggestion[]
  ```

---

#### 4. [GameTimer](./Frontend/04_GameTimer.md)
**Propósito:** Timer visual con animación de pulso cuando quedan < 5 segundos.

**Características principales:**
- Display circular con anillo de progreso
- Cambio de color automático (white → red en 5s)
- Animación de pulso (scale + opacity) cuando < 5s y es tu turno
- Formato tabular-nums para evitar layout shift
- Screen reader announcements

**Stack técnico:**
- Motion para animaciones
- SVG circle con strokeDashoffset animado
- `useReducedMotion` para accesibilidad

**Props:**
```typescript
{ seconds: number, color: 'white' | 'red', isMyTurn: boolean }
```

---

#### 5. [ChainDisplay](./Frontend/05_ChainDisplay.md)
**Propósito:** Visualización de la cadena completa de jugadores con animaciones.

**Características principales:**
- Lista vertical scrollable (max-height 96)
- Diferenciación visual de jugadas propias (verde) vs oponente (rojo)
- Badge "Latest" en último nodo
- Auto-scroll al último elemento agregado
- Virtualización opcional para cadenas > 100 jugadores

**Stack técnico:**
- Motion AnimatePresence para enter/exit animations
- Optional: @tanstack/react-virtual para listas largas
- tailwind-scrollbar para estilizado de scrollbar

**Estructura de nodo:**
```typescript
interface ChainNode {
  position: number;
  playerId: string;
  playerName: string;
  playedByUserId: string;
}
```

---

#### 6. [ResultModal](./Frontend/06_ResultModal.md)
**Propósito:** Modal de resultado con animación de cambio de ELO.

**Características principales:**
- Estado visual diferenciado: Victoria (🏆 verde) vs Derrota (😔 rojo)
- Animación CountUp para ELO delta (1.5s duration)
- Chain summary con expand/collapse (muestra 5, expande a todos)
- Badge animado con delta (+16 / -16)
- No se puede cerrar con Escape (forzar botón "Back to Menu")

**Stack técnico:**
- Headless UI Dialog (o `<dialog>` nativo)
- react-countup para animación de números
- Optional: canvas-confetti para efectos de victoria

**Props:**
```typescript
interface GameResult {
  winner: 'you' | 'opponent';
  reason: 'timeout' | 'disconnect' | 'resign';  // Solo timeout, disconnect o resign
  eloChange: { before: number; after: number; delta: number };
}
```

---

### 🔐 Autenticación (6 componentes)

Componentes para registro, login, y gestión de sesiones con OAuth.

#### 7. [LoginForm](./Frontend/07_LoginForm.md)
**Propósito:** Formulario de login con email/password y OAuth (Google, Discord).

**Características principales:**
- Validación con zod + react-hook-form
- Rate limiting visual (5 intentos / 15 minutos con countdown)
- "Remember me" checkbox
- OAuth buttons integrados
- Generic error messages (security)

**Stack técnico:**
- NextAuth.js v5 para auth
- react-hook-form + zod
- Motion para animaciones

---

#### 8. [RegisterForm](./Frontend/08_RegisterForm.md)
**Propósito:** Formulario de registro con validación en tiempo real.

**Características principales:**
- Username availability check (debounced 500ms)
- Password strength indicator (weak/medium/strong)
- Confirm password validation
- Terms & conditions checkbox
- OAuth sign-up integrado

**Validación:**
- Username: 3-20 chars, alphanumeric + underscore
- Email: valid format + availability check
- Password: ≥8 chars, uppercase, lowercase, number

---

#### 9. [ForgotPasswordForm](./Frontend/09_ForgotPasswordForm.md)
**Propósito:** Solicitud de reset de contraseña por email.

**Características principales:**
- Always shows success (security - no email enumeration)
- 60-second countdown antes de resend
- Rate limiting: 3 requests / 15min
- Success state con confirmación

**Flujo:**
Email input → Submit → Success screen → Resend option (después de 60s)

---

#### 10. [ResetPasswordForm](./Frontend/10_ResetPasswordForm.md)
**Propósito:** Establecer nueva contraseña usando token del email.

**Características principales:**
- Token validation al montar componente
- 4 estados token: validating, valid, expired, invalid
- Password strength indicator
- Auto-redirect a login después de 3s
- Token de un solo uso (marked as used)

**Security:**
Token solo puede usarse UNA VEZ, se marca como usado inmediatamente.

---

#### 11. [OAuthButtons](./Frontend/22_OAuthButtons.md)
**Propósito:** Botones reutilizables para OAuth (Google y Discord).

**Características principales:**
- Loading states independientes
- Error handling con mensajes inline
- Brand guidelines compliance (Google/Discord)
- PKCE flow con NextAuth
- Callback redirect configurableStacktécnico:**
- NextAuth.js v5 providers
- Motion para animations
- Official brand icons (SVG)

**Providers:**
- Google OAuth 2.0
- Discord OAuth

---

#### 12. [EmailVerificationBanner](./Frontend/23_EmailVerificationBanner.md)
**Propósito:** Banner persistente para usuarios con email no verificado.

**Características principales:**
- Resend verification email con 60s cooldown
- Rate limiting: 3 resends / día
- Dismiss temporal (24 horas)
- Auto-polling cada 10s para verificar estado
- Success state visual

**Reglas:**
- Banner solo si `emailVerified === null`
- No-dismissible después de 7 días sin verificar
- Banner desaparece automáticamente al verificar

---

### 🧭 Layout & Navigation (5 componentes)

Componentes globales de navegación y UI persistentes.

#### 13. [Header](./Frontend/11_Header.md)
**Propósito:** Header global con 3 estados distintos según contexto.

**3 Estados:**
1. **Unauthenticated**: Logo + "Play Now" + "Sign In"
2. **Authenticated**: Logo + Nav + Avatar + ELO + Dropdown
3. **During Match**: Logo + "Leave Match" only

**Características:**
- Sticky con backdrop-blur al scroll >50px
- Responsive: Hamburger menu en mobile (<768px)
- Dropdown menu: Profile, Match History, Settings, Sign Out
- Focus trap en mobile drawer

---

#### 14. [Footer](./Frontend/12_Footer.md)
**Propósito:** Footer global con 4-column layout y renderizado condicional.

**Layout:**
- Column 1: Logo + tagline
- Column 2: Quick Links (Play, Leaderboard, How to Play, Contact)
- Column 3: Community (Discord, Twitter, GitHub)
- Column 4: Legal (Terms, Privacy)

**Conditional rendering:**
Hidden en: `/auth/*`, `/404`, `/500`, durante match activa

---

#### 15. [MobileDrawer](./Frontend/13_MobileDrawer.md)
**Propósito:** Slide-in navigation para mobile devices (<768px).

**Características:**
- Slide animation desde left (translateX)
- User section con avatar + username + ELO
- Nav items con stagger animation (50ms delay)
- Swipe-to-close gesture (threshold -100px)
- Close via: X button, backdrop click, Escape, nav click

**Stack técnico:**
- Headless UI Dialog
- Framer Motion drag
- Focus trap

---

#### 16. [UserAvatar](./Frontend/14_UserAvatar.md)
**Propósito:** Avatar con fallback automático a iniciales.

**Características:**
- 5 tamaños: xs (32px), sm (40px), md (64px), lg (80px), xl (128px)
- Fallback logic: Image → Error → Initials
- Color generation: Hash username para color consistente (8 colores)
- Initials: Primeras 2 letras uppercase

**Optimización:**
- `React.memo` recomendado (leaderboard con ~100 avatars)
- Next/Image con lazy loading
- Image domains config para OAuth avatars

---

#### 17. [ELOBadge](./Frontend/15_ELOBadge.md)
**Propósito:** Display de ELO en tiempo real con rank y animaciones.

**4 Variantes:**
- `default`: Pill badge con "ELO: 1450 ●"
- `compact`: Mobile "1450 ●"
- `large`: Profile card con big number + rank label
- `minimal`: Just number + icon inline

**Rank System (6 tiers):**
- <1000: Beginner (Gray ○)
- 1000-1199: Amateur (Green ●)
- 1200-1399: Intermediate (Blue ●)
- 1400-1599: Advanced (Purple ●)
- 1600-1799: Expert (Orange ◆)
- 1800+: Master (Gold ★)

**Animaciones:**
- CountUp: Old ELO → New ELO (1s)
- Delta badge: "+15" por 5 segundos
- Shake effect: Cambios grandes (±20)

**Stack:**
- `react-countup` library
- Zustand store integration
- Real-time WebSocket updates

---

### 🎨 Landing & Error Pages (6 componentes)

Páginas auxiliares, landing page, y error states.

#### 18. [HeroSection](./Frontend/16_HeroSection.md)
**Propósito:** Hero de landing page con animated player chain preview.

**Características:**
- Title con fade-in animation
- Subtitle descriptivo
- 2 CTAs: "Play Now" + "Watch Demo"
- Animated player chain (horizontal auto-scroll loop)
- Stats counter section (Active Players, Matches, Online)

**Animaciones:**
- Title entry: opacity + y translate
- Chain scroll: infinite translateX animation
- Stats CountUp: triggers on scroll into view

**Stack:**
- Framer Motion
- CountUp
- react-intersection-observer

---

#### 19. [ContactForm](./Frontend/17_ContactForm.md)
**Propósito:** Formulario de contacto con rate limiting.

**Características:**
- 4 topics: General, Bug Report, Feature Request, Account Issue
- Rate limiting: 3 mensajes / hora (con countdown visual)
- Character counter (20-1000 chars)
- Success state con "Message Sent" confirmation
- Alternative contact methods (email, Discord)

**Validación:**
- Name: 2-50 chars
- Email: valid format
- Message: 20-1000 chars

**Backend:**
Rate limiting con Redis, email service con Resend.

---

#### 20. [NotFoundPage (404)](./Frontend/18_NotFoundPage.md)
**Propósito:** Página 404 con diseño temático de fútbol.

**Características:**
- "OFFSIDE!" title con football emoji
- Glitch animation en "404" number
- Bouncing football animation
- Quick links: Leaderboard, How to Play, Contact
- CTAs: "Go Home" + "Play Now"

**SEO:**
- `noindex, nofollow` meta tag
- Status code 404 automático (Next.js `not-found.tsx`)

---

#### 21. [ServerErrorPage (500)](./Frontend/19_ServerErrorPage.md)
**Propósito:** Página 500 con tracking ID y retry functionality.

**Características:**
- Tracking ID único: `FC-2026-04-25-A3F7B`
- Retry button con countdown (3s, 2s, 1s)
- Copy tracking ID to clipboard
- Contact support con tracking ID
- Dev-only error stack trace

**Estados especiales:**
- Maintenance mode con ETA countdown
- Database connection error con auto-retry
- Generic server error

**Logging:**
TodasErrores logueadas con tracking ID para debugging.

---

#### 22. [FeaturesGrid](./Frontend/20_FeaturesGrid.md)
**Propósito:** Grid de características del juego (2x2 layout).

**4 Features por defecto:**
1. 🌐 Real-time Multiplayer
2. 📊 ELO Ranking System
3. 🔍 Smart Autocomplete
4. ⚡ Fast & Fair (30s turns)

**Características:**
- Fade-in animation al scroll
- Hover effect: scale + glow
- Stagger animation (0.1s delay entre cards)
- Configurable columns (2, 3, or 4)

**Stack:**
- Framer Motion
- react-intersection-observer
- Color-coded cards por feature

---

#### 23. [HowToPlaySteps](./Frontend/21_HowToPlaySteps.md)
**Propósito:** Tutorial interactivo de gameplay (7 pasos).

**7 Steps:**
1. Get Matched (matchmaking)
2. Random Starting Player
3. Name a Teammate
4. Keep the Chain Going
5. Avoid Repetitions
6. Watch the Clock (30s)
7. Win & Earn ELO

**Características:**
- Step indicators (dots con progress)
- Next/Prev navigation
- Keyboard navigation (arrow keys)
- Autoplay mode (5s per step)
- Visual examples por cada paso
- Pro tips opcionales

**Variante:**
Modal tutorial para first-time users (check localStorage).

---

### 🧩 UI Auxiliares (2 componentes)

Componentes reutilizables de UI genérica.

#### 24. [StatsCounter](./Frontend/24_StatsCounter.md)
**Propósito:** Contador animado para estadísticas numéricas.

**Características:**
- CountUp animation con duración configurable
- 3 tamaños: sm, md, lg
- 6 colores: blue, green, yellow, red, purple, gray
- Prefix/suffix opcionales (e.g., "$", "+", "%")
- Icon opcional
- Enable on scroll into view

**Uso común:**
- Landing hero (Active Players, Matches, Online)
- Dashboard stats cards
- Profile ELO display
- Leaderboard counters

**Stack:**
- `react-countup` library
- react-intersection-observer
- Framer Motion

---

#### 25. [EmptyState](./Frontend/25_EmptyState.md)
**Propósito:** Estado vacío genérico para listas/tablas sin datos.

**Características:**
- 9 illustrations predefinidas (inbox, search, error, locked, etc.)
- 3 tamaños: sm, md, lg
- CTA button opcional
- Title + description
- AnimatePresence para smooth entry

**Casos de uso:**
- Match history vacío
- Search sin resultados
- Leaderboard vacío
- Notifications vacías
- Error states
- Feature locked (verify email)

---

## ⚙️ Servicios Backend

### Matchmaking

#### 1. [MatchmakingService](./Backend/01_MatchmakingService.md)
**Propósito:** Gestión de cola de matchmaking en Redis con algoritmo de emparejamiento.

**Características principales:**
- Cola implementada como Redis Sorted Set (score = ELO)
- Background worker que corre cada 2-3 segundos
- Expansión progresiva de rango de búsqueda
- Lock distribuido para evitar race conditions al crear matches
- TTL de 30 segundos para cleanup automático
- Seed player pool pre-cacheado en Redis Set

**Operaciones:**
```typescript
- joinQueue(userId, elo) → QueueEntry
- leaveQueue(userId) → boolean
- findMatch(userId) → MatchResult | null
- cleanupExpiredEntries() → number
```

**Redis structures:**
- `matchmaking_queue` (Sorted Set): score = ELO, member = userId
- `seed_players` (Set): pool de ~100 jugadores populares
- `match_creation:{user1}:{user2}` (String con TTL 5s): lock distribuido

**Endpoints:**
- `POST /api/matchmaking/join`
- `POST /api/matchmaking/leave`
- `GET /api/matchmaking/status`

---

### Validación de Juego

#### 2. [GameValidationService](./Backend/02_GameValidationService.md)
**Propósito:** Validación de movimientos durante la partida.

**Características principales:**
- Fuzzy matching con PostgreSQL `pg_trgm` (similarity > 0.7)
- Normalización de nombres (remove diacritics, lowercase, trim)
- Verificación de edge en `teammate_edges` con minutos ≥ 90
- Validación de no repetición en cadena
- Cache de edges populares en Redis (TTL 1h)

**Pipeline de validación:**
1. Normalizar input text
2. Buscar jugador por nombre (fuzzy)
3. Verificar que no esté ya usado
4. Verificar edge con jugador actual
5. Verificar minutos mínimos (≥ 90)

**Operaciones:**
```typescript
- validateMove(inputText, currentPlayerId, usedPlayerIds) → ValidationResult
- normalizeName(name) → string
```

**Errores posibles:**
- `not_found` — jugador no existe
- `no_edge` — nunca jugaron juntos
- `already_used` — repetido en cadena
- `insufficient_minutes` — < 90 minutos juntos

**PostgreSQL requirements:**
```sql
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_players_normalized_name_trgm 
  ON players USING gin (normalized_name gin_trgm_ops);
```

---

### Real-time Game Room

#### 3. [PartyKitGameRoom](./Backend/03_PartyKitGameRoom.md)
**Propósito:** Room de PartyKit (Cloudflare Durable Objects) que maneja estado en memoria de partida.

**Características principales:**
- Estado en memoria con Durable Objects (ultra-low latency)
- Timer server-side que corre cada 1 segundo
- Manejo de desconexiones con grace period de 10 segundos
- Validación de turnos con GameValidationService
- Broadcast de eventos a ambos jugadores
- Persistencia selectiva en BD (solo al final de turno y al terminar)

**Room state:**
```typescript
interface GameRoomState {
  matchId: string;
  player1/player2: PlayerConnection;
  status: 'waiting' | 'active' | 'finished';
  currentPlayerId: string;
  currentChainPlayerId: string;
  chain: ChainNode[];
  turnDeadlineAt: Date;
  disconnectedPlayers: Set<string>;
  timerInterval: NodeJS.Timeout;
}
```

**Mensajes WebSocket:**
- **Client → Server**:
  - `play` — jugada del usuario
  - `leave` — abandono voluntario
  - `ping` — keep-alive

- **Server → Client**:
  - `game_state` — estado inicial
  - `turn_valid` — turno aceptado
  - `turn_invalid` — turno rechazado (fin de partida)
  - `game_over` — partida terminada
  - `opponent_disconnected` — oponente se desconectó
  - `opponent_reconnected` — oponente volvió

**Lifecycle:**
1. `onStart()` — carga match desde BD
2. `onConnect()` — jugador se conecta
3. `onMessage()` — procesar jugadas
4. `onClose()` — manejo de desconexión (grace period)

---

### Sistema de Rating

#### 4. [ELOCalculator](./Backend/04_ELOCalculator.md)
**Propósito:** Cálculo de cambios de ELO con K-factor variable según experiencia.

**Características principales:**
- Fórmula ELO estándar: `R' = R + K * (S - E)`
- K-factor variable:
  - **32** para novatos (0-20 partidas)
  - **24** para intermedios (21-50 partidas)
  - **16** para experimentados (51+ partidas)
- Expected score: `E = 1 / (1 + 10^((Rb - Ra) / 400))`
- Transacción atómica en BD con locks
- Actualización de leaderboard en Redis (Sorted Set)
- Tracking de `highestElo` (all-time peak)

**Operaciones:**
```typescript
- calculateEloChange(params) → EloChangeResult
- applyEloChange(changes) → void
- getKFactor(matchesPlayed) → number
```

**Ejemplo de cálculo:**
```typescript
Winner: 1150 ELO, 5 partidas → K=32
Loser:  1400 ELO, 60 partidas → K=16

Expected winner: 0.181 (underdog)
Winner delta: 32 * (1 - 0.181) = +26
Loser delta:  16 * (0 - 0.819) = -13

New: Winner 1176, Loser 1387
```

**Redis structures:**
- `leaderboard:global` (Sorted Set): score = ELO, member = userId
- `user:{userId}:matches_played` (String con TTL 5min): cache de contador

---

## 🔗 Flujo de Integración

### Matchmaking → Partida

```
1. User → MatchmakingQueue.joinQueue()
2. Frontend → POST /api/matchmaking/join
3. Backend → MatchmakingService.joinQueue() → Redis ZADD
4. Background Worker → MatchmakingService.findMatch() (cada 2s)
5. Match found → MatchmakingService.createMatch() → DB insert
6. Backend → WebSocket broadcast 'match_found'
7. Frontend → Redirect a /game/{matchId}
8. Frontend → GameBoard mounts → PartyKitGameRoom.onConnect()
9. PartyKit → Send 'game_state' to both players
```

### Turno de Juego

```
1. User types → PlayerAutocomplete search (debounced 300ms)
2. Frontend → POST /api/players/autocomplete
3. Backend → PostgreSQL similarity search
4. User submits → GameBoard.sendPlay()
5. PartyKit → onMessage('play')
6. PartyKit → GameValidationService.validateMove()
7a. Valid → Add to chain, broadcast 'turn_valid', switch turn
7b. Invalid → broadcast 'turn_invalid', endGame()
8. Frontend → Update GameStore, ChainDisplay animates
```

### Fin de Partida

```
1. PartyKit → endGame() (timeout/invalid/disconnect)
2. PartyKit → ELOCalculator.calculateEloChange()
3. PartyKit → Save result to DB (transaction)
4. PartyKit → ELOCalculator.applyEloChange() (update users + leaderboard)
5. PartyKit → Broadcast 'game_over' with ELO changes
6. Frontend → GameBoard shows ResultModal
7. User clicks "Back to Menu" → Reset stores, redirect home
```

---

## 📦 Dependencias Clave

### Frontend
```json
{
  "next": "^15.1.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "motion": "^12.0.0",
  "framer-motion": "^12.0.0",
  "zustand": "^5.0.0",
  "@headlessui/react": "^2.2.0",
  "@heroicons/react": "^2.2.0",
  "next-auth": "^5.0.0",
  "react-hook-form": "^7.54.0",
  "@hookform/resolvers": "^3.9.0",
  "zod": "^3.24.0",
  "react-countup": "^6.5.0",
  "use-debounce": "^10.0.0",
  "@tanstack/react-virtual": "^3.0.0",
  "canvas-confetti": "^1.9.0",
  "react-intersection-observer": "^9.13.0",
  "tailwindcss": "^3.4.0",
  "autoprefixer": "^10.4.0",
  "postcss": "^8.4.0"
}
```

### Backend
```json
{
  "hono": "^4.7.0",
  "bun": "^1.1.0",
  "partykit": "^0.0.111",
  "drizzle-orm": "^0.36.0",
  "drizzle-kit": "^0.28.0",
  "@upstash/redis": "^1.28.0",
  "nanoid": "^5.0.0",
  "@node-rs/argon2": "^2.0.0",
  "resend": "^4.0.0",
  "dompurify": "^3.1.0"
}
```

### Base de Datos
- **PostgreSQL 16+** con extensiones:
  - `pg_trgm` (fuzzy text search)
  - `unaccent` (remove diacritics)
- **Redis** (Upstash) para:
  - Matchmaking queue (Sorted Set)
  - Rate limiting
  - Session storage
  - Leaderboard cache

### OAuth Providers
- **Google OAuth 2.0** (Client ID + Secret)
- **Discord OAuth** (Application ID + Secret)

### Email Service
- **Resend** para verification emails y notifications

---

## ✅ Checklist de Implementación

### Phase 1: Infraestructura Base
- [ ] Next.js 15 + React 19 setup
- [ ] PostgreSQL con extensiones (pg_trgm, unaccent)
- [ ] Upstash Redis setup
- [ ] NextAuth.js v5 configuration
- [ ] Drizzle ORM schemas
- [ ] Environment variables setup

### Phase 2: Autenticación
- [ ] LoginForm + RegisterForm components
- [ ] ForgotPasswordForm + ResetPasswordForm
- [ ] OAuthButtons (Google + Discord setup)
- [ ] EmailVerificationBanner + email service
- [ ] Rate limiting en auth endpoints
- [ ] Session management con NextAuth

### Phase 3: Matchmaking
- [ ] MatchmakingService con Redis Sorted Set
- [ ] Background worker (cron job cada 2-3s)
- [ ] API endpoints `/api/matchmaking/*`
- [ ] MatchmakingQueue component
- [ ] WebSocket notifications para match_found
- [ ] Seed player pool en Redis

### Phase 4: Game Core
- [ ] PartyKitGameRoom con Durable Objects
- [ ] GameValidationService con pg_trgm
- [ ] GameBoard container component
- [ ] PlayerAutocomplete con backend endpoint
- [ ] GameTimer con animaciones
- [ ] ChainDisplay con auto-scroll

### Phase 5: ELO System
- [ ] ELOCalculator con K-factor variable
- [ ] Transacción atómica para apply changes
- [ ] Redis leaderboard (Sorted Set)
- [ ] ResultModal con CountUp animation
- [ ] ELOBadge con rank system

### Phase 6: Layout & Navigation
- [ ] Header con 3 estados
- [ ] Footer con conditional rendering
- [ ] MobileDrawer con gestures
- [ ] UserAvatar con initials fallback
- [ ] Navigation guards y middleware

### Phase 7: Landing & Error Pages
- [ ] HeroSection con animated chain
- [ ] FeaturesGrid con scroll animations
- [ ] HowToPlaySteps tutorial
- [ ] ContactForm con rate limiting
- [ ] 404 y 500 error pages
- [ ] StatsCounter + EmptyState components

### Phase 8: Testing
- [ ] Unit tests para cada servicio
- [ ] Component tests con React Testing Library
- [ ] Integration tests para flujo completo
- [ ] E2E tests con Playwright
- [ ] Performance testing (Lighthouse)

### Phase 9: Deployment
- [ ] PartyKit deploy a Cloudflare Workers
- [ ] Next.js deploy a Vercel
- [ ] Supabase PostgreSQL provisioning
- [ ] Upstash Redis provisioning
- [ ] Domain y SSL setup
- [ ] Analytics integration (Vercel Analytics)
- [ ] Error monitoring (Sentry)

---

## 📚 Documentación Relacionada

- [Especificaciones Funcionales Transversales](../Transversal/)
  - [01_Sistema_Matchmaking.md](../Transversal/01_Sistema_Matchmaking.md)
  - [02_Flujo_Partida.md](../Transversal/02_Flujo_Partida.md)
  - [03_Sistema_ELO.md](../Transversal/03_Sistema_ELO.md)

- [Documentación de Base de Datos](../../BD/README.md)
- [Documentación de Stack](../../Stack/README.md)

---

## 🎯 Próximos Componentes (Post-MVP)

### Frontend
- [ ] Leaderboard component (top 100 + búsqueda de usuario)
- [ ] UserProfile component (historial de partidas detallado)
- [ ] MatchHistoryTable component (tabla con filtros y paginación)
- [ ] RevengeButton component (revancha al terminar partida)
- [ ] SpectatorView component (modo espectador en tiempo real)
- [ ] AchievementsBadge component (logros y badges desbloqueables)
- [ ] DailyChallenge component (desafío diario temático)
- [ ] FriendsList component (lista de amigos y invitaciones)

### Backend
- [ ] LeaderboardService (con paginación, cache, y búsqueda)
- [ ] UserStatsService (estadísticas avanzadas y analytics)
- [ ] MatchHistoryService (historial con filtros complejos)
- [ ] NotificationService (push notifications y emails)
- [ ] AchievementsService (sistema de logros y progreso)
- [ ] FriendsService (gestión de amigos y match invites)

---

**Última actualización:** 2026-04-25
