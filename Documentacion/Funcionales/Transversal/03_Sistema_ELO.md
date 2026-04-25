# Spec Funcional: Sistema de ELO

## Descripción
Sistema de rating competitivo que calcula, actualiza y persiste el ELO de los jugadores al terminar cada partida ranked. Incluye cálculo de delta con fórmula estándar, actualización de estadísticas (wins/losses), historial completo de cambios, y visualización del rating en perfil y leaderboard.

## Usuario objetivo
Todos los jugadores del modo ranked. El ELO define el nivel de habilidad, la posición en el leaderboard, y el matchmaking.

---

## Flujo principal

**Paso 1 (Registro inicial):**
- Cuando un usuario se registra, se crea entrada en `player_ratings`:
  - `elo = 1200` (rating inicial estándar)
  - `matches_played = 0`
  - `wins = 0`, `losses = 0`, `draws = 0`

**Paso 2 (Fin de partida):**
- Partida termina con resultado: `win` para jugador A, `loss` para jugador B
- Sistema recibe evento `game_over` con `{ winner_user_id, loser_user_id, match_id }`

**Paso 3 (Cálculo de delta):**
- Sistema calcula ELO esperado para ambos jugadores:
  ```
  E_a = 1 / (1 + 10^((R_b - R_a) / 400))
  E_b = 1 / (1 + 10^((R_a - R_b) / 400))
  ```
- Sistema calcula nuevo ELO:
  ```
  R'_a = R_a + K * (S_a - E_a)
  R'_b = R_b + K * (S_b - E_b)
  ```
  - `S_a = 1` (ganador), `S_b = 0` (perdedor)
  - `K` depende de experiencia:
    - Partidas 0-20: K=32
    - Partidas 21-50: K=24
    - Partidas 51+: K=16

**Paso 4 (Persistencia):**
- Actualizar `player_ratings` para ambos jugadores:
  - `elo = nuevo_elo`
  - `matches_played += 1`
  - `wins += 1` (ganador) o `losses += 1` (perdedor)
- Insertar en `rating_history`:
  - `user_id`, `match_id`, `elo_before`, `elo_after`, `delta`, `created_at`

**Paso 5 (Notificación):**
- Enviar delta a ambos clientes por WebSocket
- Mostrar en pantalla de resultado: "+24 ELO" o "-18 ELO"

**Paso 6 (Visualización):**
- El nuevo ELO aparece en:
  - Header del usuario (siempre visible)
  - Perfil de usuario
  - Leaderboard (posición se recalcula)

---

## Pantallas / Estados

### Estado 1: Header (omnipresente)

**Layout:**
```
┌────────────────────────────────────┐
│ [@username]  1245 ELO    [avatar] │
└────────────────────────────────────┘
```

**Elementos visibles:**
- Username: clickeable → navega a perfil
- ELO: número con "ELO" label
- Avatar: imagen del usuario o icono default

**Actualización:** Se actualiza automáticamente al terminar partida (WebSocket o polling)

---

### Estado 2: Perfil de Usuario

**Layout:**
```
┌──────────────────────────────────────┐
│         [Avatar]                     │
│       @username                      │
│                                      │
│    ┌──────────────────────┐         │
│    │   ELO: 1245          │         │
│    │   Rank: #127         │         │
│    └──────────────────────┘         │
│                                      │
│    Stats:                            │
│    Matches: 45                       │
│    Wins: 28 (62.2%)                 │
│    Losses: 15 (33.3%)               │
│    Draws: 2 (4.4%)                  │
│                                      │
│    ELO History (últimas 10):         │
│    ┌────────────────────────────┐   │
│    │ +24  vs @rival1  (Win)     │   │
│    │ -18  vs @rival2  (Loss)    │   │
│    │ +15  vs @rival3  (Win)     │   │
│    │ ...                        │   │
│    └────────────────────────────┘   │
│                                      │
│    [View Full History]               │
│    [Back to Menu]                    │
└──────────────────────────────────────┘
```

**Elementos visibles:**
- **ELO actual**: número grande
- **Rank**: posición en el leaderboard global
- **Stats summary**: partidas jugadas, victorias (%), derrotas (%), empates (%)
- **ELO History**: lista de últimas 10 partidas con delta, rival, resultado
- **Botón "View Full History"**: navega a página con historial completo (paginado)

---

### Estado 3: Leaderboard

**Layout:**
```
┌──────────────────────────────────────┐
│         LEADERBOARD                  │
│                                      │
│  #  Player        ELO    W/L        │
│  ──────────────────────────────────  │
│  1  @ProPlayer    1854   145/32     │
│  2  @ChampUser    1802   120/28     │
│  3  @TopDog       1765   98/22      │
│  ...                                 │
│  127 @username    1245   28/15  ← tú│
│  ...                                 │
│                                      │
│  [Load More]                         │
└──────────────────────────────────────┘
```

**Elementos visibles:**
- Lista de top players ordenada por ELO descendente
- Tu posición destacada visualmente (background diferente)
- Paginación: load más o infinite scroll

---

### Estado 4: Pantalla de Resultado (con ELO)

Ya descrito en spec de Flujo de Partida, pero aquí se detalla el cálculo mostrado:

```
You Win!

ELO Change: +24
New ELO: 1268

Rival ELO: 1250
Expected win: 52%
```

**Elementos visibles:**
- Delta: "+24" (verde) o "-18" (rojo)
- New ELO: rating final
- (Opcional) Rival ELO y probabilidad esperada de victoria

---

## Reglas de negocio

- **RN-01**: ELO inicial: 1200 para todos los usuarios nuevos
- **RN-02**: Fórmula de cálculo: ELO estándar (Elo rating system)
- **RN-03**: Factor K variable según experiencia:
  - 0-20 partidas: K=32 (rating volátil, se ajusta rápido)
  - 21-50 partidas: K=24
  - 51+ partidas: K=16 (rating estable)
- **RN-04**: Resultado de partida:
  - Win: S=1
  - Loss: S=0
  - Draw: S=0.5 (para futura fase)
- **RN-05**: ELO mínimo: 0 (sin floor artificial)
- **RN-06**: ELO máximo: sin límite
- **RN-07**: Partidas abortadas (ambos desconectan) NO afectan ELO
- **RN-08**: Abandono (Leave) cuenta como Loss normal con delta ELO
- **RN-09**: El historial se guarda SIEMPRE, sin límite (audit trail completo)
- **RN-10**: El leaderboard se actualiza cada 5 minutos (cache) o en tiempo real con Redis Sorted Set
- **RN-11**: Solo partidas ranked afectan ELO (en MVP todo es ranked)
- **RN-12**: El rank se calcula como posición en ordering descendente de ELO

---

## Casos edge

- **CE-01**: Jugador con 0 partidas pierde su primera → ELO baja a ~1180 (delta grande por K=32)
- **CE-02**: Jugador con 1800 ELO gana vs jugador con 1200 ELO → gana ~3 puntos (victoria esperada)
- **CE-03**: Jugador con 1200 ELO gana vs jugador con 1800 ELO → gana ~28 puntos (upset)
- **CE-04**: Empate técnico (no hay más jugadores disponibles) → ambos +0 ELO (S=0.5 para ambos) → conservan rating actual
- **CE-05**: Jugador abandona muchas partidas → ELO cae drásticamente (comportamiento esperado)
- **CE-06**: Dos jugadores con ELO idéntico → delta será simétrico (+16/-16 aprox con K=32)
- **CE-07**: ELO negativo matemáticamente posible → se permite (sin floor), pero improbable en práctica
- **CE-08**: Historial de rating con miles de entradas → paginación en frontend (50 por página)
- **CE-09**: Usuario solicita ver perfil de otro usuario → se muestra su ELO, stats, historial (público)
- **CE-10**: Rating actualizado mientras usuario está en otra pantalla → se sincroniza al volver (polling o WebSocket)

---

## Datos necesarios

### Para cálculo:
- `player_ratings.elo` de ambos jugadores (antes de la partida)
- `player_ratings.matches_played` (para determinar K)
- Resultado de la partida: `winner_user_id`, `loser_user_id`

### Para persistencia:
- `match_id` (FK a la partida que generó el cambio)
- Timestamp del cálculo

### Para visualización:
- Todos los campos de `player_ratings` del usuario actual
- Top N de `player_ratings` ordenado por `elo DESC` (leaderboard)
- Join con `rating_history` para mostrar últimas N partidas

---

## Endpoints o lógica requerida

### REST API (Hono)

- **POST /elo/update**
  - Input: `{ match_id, winner_user_id, loser_user_id }`
  - Output: `{ winner_elo_delta, loser_elo_delta, winner_new_elo, loser_new_elo }`
  - Acción:
    1. Fetch `player_ratings` para ambos
    2. Calcular K según `matches_played`
    3. Calcular E_a, E_b
    4. Calcular nuevo ELO
    5. Actualizar `player_ratings` (transacción)
    6. Insertar en `rating_history`
    7. Retornar deltas
  - **Importante**: Este endpoint es llamado por PartyKit al terminar partida (server-to-server)

- **GET /users/:user_id/rating**
  - Output: `{ elo, rank, matches_played, wins, losses, draws }`

- **GET /users/:user_id/rating-history**
  - Query params: `?page=1&limit=50`
  - Output: `{ history: [...], total_count, page }`

- **GET /leaderboard**
  - Query params: `?page=1&limit=50`
  - Output: `{ players: [{ user_id, username, elo, wins, losses, rank }], total_count }`

### Background Job (opcional para performance)

- **Leaderboard Cache Refresh** (cada 5 min):
  - Query: `SELECT user_id, username, elo, wins, losses FROM player_ratings ORDER BY elo DESC LIMIT 100`
  - Guardar en Redis: `leaderboard_top100` con TTL 5min
  - Beneficio: las peticiones GET /leaderboard leen de Redis, no de Postgres

---

## Criterios de aceptación

- [ ] **CA-01**: Al terminar una partida, el ELO se actualiza en < 2s
- [ ] **CA-02**: El delta mostrado en pantalla de resultado coincide con el calculado en BD
- [ ] **CA-03**: El historial de rating muestra las últimas 10 partidas correctamente ordenadas
- [ ] **CA-04**: El leaderboard muestra al usuario actual destacado si está en la página visible
- [ ] **CA-05**: El rank se calcula correctamente (posición en ordering de elo DESC)
- [ ] **CA-06**: Un jugador nuevo (0 partidas) tiene K=32 en su primera partida
- [ ] **CA-07**: Un jugador con 25 partidas tiene K=24
- [ ] **CA-08**: Un jugador con 60 partidas tiene K=16
- [ ] **CA-09**: Si un jugador con 1200 ELO gana vs otro con 1200 ELO, el delta es ~16 (simétrico)
- [ ] **CA-10**: Si un jugador con 1200 ELO gana vs otro con 1500 ELO, el delta es > 20 (upset)
- [ ] **CA-11**: El ELO se persiste en `rating_history` con `{ elo_before, elo_after, delta }` correcto
- [ ] **CA-12**: Las partidas abortadas (status=aborted) NO generan entrada en `rating_history`
- [ ] **CA-13**: El header del usuario muestra el ELO actualizado después de terminar partida

---

## Notas para Backend Architect

### Fórmula completa implementada:
```typescript
function calculateEloChange(
  eloA: number,
  eloB: number,
  matchesPlayedA: number,
  scoreA: number  // 1 = win, 0 = loss, 0.5 = draw
): number {
  // Determinar K según experiencia
  let K: number;
  if (matchesPlayedA <= 20) K = 32;
  else if (matchesPlayedA <= 50) K = 24;
  else K = 16;

  // Calcular probabilidad esperada de victoria
  const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));

  // Calcular delta
  const delta = K * (scoreA - expectedA);

  return Math.round(delta);  // redondear a entero
}
```

### Transacción crítica:
```sql
BEGIN;

-- Lock de filas para evitar race condition
SELECT elo, matches_played FROM player_ratings WHERE user_id = $1 FOR UPDATE;
SELECT elo, matches_played FROM player_ratings WHERE user_id = $2 FOR UPDATE;

-- Calcular deltas (en código)

-- Actualizar
UPDATE player_ratings 
SET elo = $new_elo, matches_played = matches_played + 1, wins = wins + 1, updated_at = NOW()
WHERE user_id = $winner_id;

UPDATE player_ratings
SET elo = $new_elo, matches_played = matches_played + 1, losses = losses + 1, updated_at = NOW()
WHERE user_id = $loser_id;

-- Historial
INSERT INTO rating_history (user_id, match_id, elo_before, elo_after, delta, created_at)
VALUES ($winner_id, $match_id, $old_elo_winner, $new_elo_winner, $delta_winner, NOW());

INSERT INTO rating_history (user_id, match_id, elo_before, elo_after, delta, created_at)
VALUES ($loser_id, $match_id, $old_elo_loser, $new_elo_loser, $delta_loser, NOW());

COMMIT;
```

### Redis Leaderboard (opcional pero recomendado):
```typescript
// Actualizar en Redis al cambiar ELO
await redis.zadd('leaderboard', { score: newElo, member: userId });

// Leer top 100
const top100 = await redis.zrange('leaderboard', 0, 99, { rev: true, withScores: true });

// Obtener rank de un usuario
const rank = await redis.zrevrank('leaderboard', userId);  // 0-indexed
```

---

## Notas para Frontend Architect

### Store de ELO (Zustand):
```typescript
eloStore: {
  currentElo: number,
  rank: number | null,
  matchesPlayed: number,
  wins: number,
  losses: number,
  draws: number,
  recentHistory: Array<{
    matchId: string,
    delta: number,
    opponent: string,
    result: 'win' | 'loss' | 'draw',
    timestamp: string
  }>
}
```

### Actualización en tiempo real:
- Cuando llega evento WS `game_over` con `elo_changes`:
  ```typescript
  eloStore.setState({
    currentElo: elo_changes[myUserId].after,
    matchesPlayed: eloStore.matchesPlayed + 1,
    wins: result === 'win' ? eloStore.wins + 1 : eloStore.wins,
    losses: result === 'loss' ? eloStore.losses + 1 : eloStore.losses
  });
  ```

### Animaciones:
- **Delta en resultado**: CountUp de 0 a +24 en 1s (con easing)
  ```tsx
  <CountUp end={24} duration={1} prefix="+" suffix=" ELO" />
  ```
- **ELO en header**: Transición suave al actualizar
  ```tsx
  <motion.span
    key={currentElo}
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    {currentElo}
  </motion.span>
  ```

### Gráfico de historial (opcional, P2):
- Instalar `recharts` o `chart.js`
- Eje X: últimas 20 partidas
- Eje Y: ELO
- Línea conectando puntos de ELO después de cada partida

### Accesibilidad:
- ELO change: `role="status"` + `aria-live="polite"` + anunciar "Ganaste 24 puntos de ELO"
- Leaderboard: tabla semántica con `<table>`, `<th scope="col">`, navegación por teclado
