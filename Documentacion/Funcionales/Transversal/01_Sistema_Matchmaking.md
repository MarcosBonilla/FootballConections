# Spec Funcional: Sistema de Matchmaking

## Descripción
Sistema que empareja dos jugadores con ELO similar para iniciar una partida 1v1. El jugador entra a una cola automática, espera su oponente, puede cancelar mientras espera, y es notificado cuando encuentra match.

## Usuario objetivo
Jugador autenticado que quiere iniciar una partida ranked. Usa la app desde desktop o mobile.

---

## Flujo principal

**Paso 1:** Usuario presiona botón "Play" / "Jugar" desde el menú principal.

**Paso 2:** El sistema registra al usuario en la cola de matchmaking con su ELO actual.

**Paso 3:** Pantalla de búsqueda muestra:
- Spinner / animación de búsqueda
- Mensaje "Buscando oponente..."
- Contador de tiempo en espera (ej. "0:12")
- Botón "Cancelar"

**Paso 4a (Match encontrado):**
- Sistema empareja con otro jugador en rango ELO ±50
- Notificación visual: "¡Oponente encontrado!"
- Transición automática a pantalla de partida (seed player cargado)

**Paso 4b (No hay match):**
- Cada 5 segundos se amplía el rango de búsqueda: ±50 → ±75 → ±100 → ±150
- Si después de 60s no hay match: mensaje "No hay oponentes disponibles. Intenta de nuevo más tarde." + botón "Volver"

**Paso 5 (Usuario cancela):**
- Usuario presiona "Cancelar"
- Se elimina de la cola
- Vuelve al menú principal

---

## Pantallas / Estados

### Estado 1: Menú Principal (pre-matchmaking)
**Layout:**
- Centro: Botón grande "Play" / "Jugar"
- Header: username + ELO actual
- Navegación: Perfil, Leaderboard

**Elementos visibles:**
- Botón "Play": CTA principal, verde/teal, grande
- ELO display: "1245 ELO" en gris claro
- Username: en header

**Acciones posibles:**
- Click "Play" → ingresa a cola (Estado 2)
- Click "Perfil" → navega a perfil
- Click "Leaderboard" → navega a leaderboard

---

### Estado 2: Buscando Oponente
**Layout:**
- Centro: Spinner animado + mensaje de estado
- Centro-abajo: Tiempo en espera
- Abajo: Botón "Cancelar"

**Elementos visibles:**
- Spinner: animación circular/pulsante
- Texto: "Buscando oponente..." (animación de puntos suspensivos)
- Contador: "0:23" (segundos transcurridos)
- Indicador de rango: "Buscando ±50 ELO" (se actualiza cada 5s)
- Botón "Cancelar": secundario, outline

**Acciones posibles:**
- Click "Cancelar" → sale de la cola (Estado 1)
- Esperar → match encontrado (Estado 3) o timeout (Estado 4)

**Comportamiento en tiempo real:**
- Cada segundo incrementa el contador
- Cada 5s actualiza el rango de búsqueda mostrado
- WebSocket escucha evento `match_found` de PartyKit

---

### Estado 3: Match Encontrado (transición)
**Layout:**
- Centro: Mensaje de confirmación + información del oponente

**Elementos visibles:**
- Mensaje: "¡Oponente encontrado!"
- Oponente info: username + ELO
- Animación: fade-in rápido → transición a pantalla de juego

**Duración:** 1-2 segundos antes de cargar la partida

---

### Estado 4: Sin Oponentes Disponibles
**Layout:**
- Centro: Mensaje + botón de acción

**Elementos visibles:**
- Icono: reloj/calendario
- Mensaje: "No hay oponentes disponibles en este momento"
- Sugerencia: "Intenta de nuevo en unos minutos"
- Botón: "Volver al menú"

**Acciones posibles:**
- Click "Volver al menú" → Estado 1

---

## Reglas de negocio

- **RN-01**: Solo usuarios autenticados pueden entrar a matchmaking
- **RN-02**: Un usuario solo puede estar en una cola a la vez
- **RN-03**: Ventana inicial de matchmaking: ±50 ELO
- **RN-04**: Expansión de rango: +25 cada 5 segundos (±50 → ±75 → ±100 → ±150)
- **RN-05**: Máximo rango permitido: ±150 ELO
- **RN-06**: Timeout de búsqueda: 60 segundos
- **RN-07**: Si usuario está en partida activa, no puede entrar a matchmaking
- **RN-08**: El sistema elige automáticamente al jugador con ELO más cercano disponible
- **RN-09**: Ambos jugadores deben confirmar disponibilidad antes de crear partida (check de conexión)

---

## Casos edge

- **CE-01**: Usuario pierde conexión mientras busca → se elimina automáticamente de la cola al detectar desconexión del WebSocket
- **CE-02**: Usuario cierra pestaña mientras busca → entrada expira en Redis tras 30s (TTL)
- **CE-03**: Dos usuarios con ELO idéntico en cola → el primero que llegó tiene prioridad
- **CE-04**: Usuario cancela justo cuando se encontró match → si la partida ya se creó en BD, se marca como `aborted`, si no, simplemente no se crea
- **CE-05**: No hay jugadores en cola → mensaje inmediato "Buscando oponente..." y espera hasta timeout
- **CE-06**: Usuario intenta entrar a matchmaking con ban activo → mensaje de error "Tu cuenta está suspendida"
- **CE-07**: Usuario tiene partida activa pendiente → mensaje "Tienes una partida en curso" + botón "Continuar"

---

## Datos necesarios

### Del usuario actual:
- `user_id`
- `username`
- `elo` (desde `player_ratings`)
- `is_banned` (desde `users`)

### Del sistema:
- Estado actual de la cola en Redis (Sorted Set por ELO)
- Partidas activas del usuario (desde `matches` donde status = `active` o `pending`)

---

## Endpoints o lógica requerida

### REST API (Hono)
- **POST /matchmaking/join**
  - Input: `user_id` (desde auth)
  - Output: `{ queue_id, elo_snapshot }`
  - Acción: Registra en Redis Sorted Set + marca en `matchmaking_queue` tabla
  
- **POST /matchmaking/leave**
  - Input: `user_id`
  - Output: `{ success: boolean }`
  - Acción: Elimina de Redis + actualiza status a `cancelled`

- **GET /matchmaking/status**
  - Input: `user_id`
  - Output: `{ status, queue_position?, estimated_wait? }`

### WebSocket (PartyKit)
- **Evento `match_found`**
  - Payload: `{ match_id, opponent_username, opponent_elo, seed_player_id }`
  - Trigger: Cuando el algoritmo de matchmaking encuentra pareja

### Background Job (Upstash QStash o similar)
- **Matchmaking Ticker** (cada 2-3 segundos):
  - Lee Redis Sorted Set
  - Para cada jugador en espera: busca oponente en rango ELO actual
  - Si hay match: crea entrada en `matches`, notifica a ambos por WS, elimina de cola

---

## Criterios de aceptación

- [ ] **CA-01**: Al presionar "Play", el usuario entra a la pantalla de búsqueda en < 500ms
- [ ] **CA-02**: El contador de tiempo en espera se actualiza cada segundo sin saltos
- [ ] **CA-03**: Al cancelar, el usuario vuelve al menú principal inmediatamente
- [ ] **CA-04**: Cuando hay match, la notificación aparece en < 1s después de que el backend lo detecta
- [ ] **CA-05**: El indicador de rango ELO se actualiza visualmente cada 5s (±50 → ±75...)
- [ ] **CA-06**: Si no hay oponentes en 60s, se muestra mensaje de timeout
- [ ] **CA-07**: Usuario no puede abrir dos colas simultáneas (botón "Play" deshabilitado si ya está en cola)
- [ ] **CA-08**: Al perder conexión, el usuario es removido de la cola automáticamente
- [ ] **CA-09**: La transición de "Match encontrado" a pantalla de juego es fluida (sin salto de layout)

---

## Notas para Backend Architect

- **Redis Sorted Set key**: `matchmaking_queue` (score = ELO, member = `user_id`)
- **TTL de entrada**: 30s desde `queued_at` (auto-cleanup si el client crashea)
- **Algoritmo propuesto**:
  ```pseudo
  Para cada jugador_A en cola:
    rango_actual = calcular_rango(tiempo_en_espera)
    candidatos = ZRANGEBYSCORE(elo_A - rango, elo_A + rango)
    Si candidatos.length > 0:
      jugador_B = candidatos[0]  // el más cercano
      crear_partida(jugador_A, jugador_B)
      notificar_ambos()
      ZREM(jugador_A, jugador_B)
  ```
- **Race condition**: Si dos workers intentan emparejar al mismo usuario, usar transacción Redis con `WATCH` o lock distribuido
- **Seed player**: Seleccionar random desde pool de ~100 jugadores populares pre-cacheados (no hacer query pesada en tiempo de matchmaking)

---

## Notas para Frontend Architect

- **Estado global** (Zustand):
  ```typescript
  matchmakingStore: {
    status: 'idle' | 'searching' | 'found' | 'error',
    queuedAt: Date | null,
    elapsedSeconds: number,
    currentRange: number,  // ±50, ±75, etc.
    opponent: { username, elo } | null
  }
  ```
- **WebSocket listener**: Escuchar evento `match_found` y actualizar store + navegar a `/match/{match_id}`
- **Animaciones**:
  - Spinner: Framer Motion con `animate={{ rotate: 360 }}` + `transition={{ repeat: Infinity }}`
  - Contador: Incremento con `useEffect` cada 1000ms
  - Transición a juego: View Transitions API (si soportado) o fade
- **Accesibilidad**:
  - Anunciar "Buscando oponente" con `role="status"` + `aria-live="polite"`
  - Anunciar "Oponente encontrado" con `role="alert"` + `aria-live="assertive"`
  - Botón "Cancelar" debe tener `aria-label="Cancelar búsqueda de oponente"`
- **Responsive**:
  - Mobile: Layout vertical, botón cancelar en bottom fixed
  - Desktop: Centrado con max-width 600px
