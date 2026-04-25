# Spec Funcional: Flujo de Partida 1v1

## Descripción
Flujo completo de una partida desde que se carga el seed player inicial hasta que termina con un ganador. Incluye: visualización de la cadena, sistema de turnos, input con autocompletado, validación en tiempo real, timer de 20s por turno, y finalización con resultado + ELO.

## Usuario objetivo
Dos jugadores emparejados por matchmaking, conectados por WebSocket a la misma sala de PartyKit, jugando desde desktop o mobile.

---

## Flujo principal

**Paso 1 (Inicialización):**
- Sistema crea partida en BD con seed player aleatorio
- Ambos jugadores reciben match_id y se conectan al room de PartyKit
- Se determina quién juega primero (ej. menor user_id o random)
- Se carga la pantalla de juego con el seed player visible

**Paso 2 (Turno activo - Jugador A):**
- Timer de 20s empieza a correr
- Indicador visual "Your turn!" en verde/teal
- Seed player mostrado grande en el centro (ej. "Mbappé")
- Input habilitado con placeholder "Player name..."
- Jugador B ve mensaje "Rival pensando..." + timer del oponente corriendo

**Paso 3 (Input con autocompletado):**
- Jugador A empieza a escribir (ej. "Ney")
- Aparecen sugerencias en tiempo real debajo del input
- Lista de jugadores válidos (compañeros del seed) que coinciden con el texto
- Jugador selecciona con teclado (flechas + Enter) o click

**Paso 4 (Envío de respuesta):**
- Jugador A presiona "Submit" o Enter
- Input se deshabilita
- Sistema valida:
  1. ¿El jugador existe?
  2. ¿Es compañero válido del jugador actual de la cadena?
  3. ¿No fue usado antes en esta partida?
  4. ¿Está dentro del tiempo límite?

**Paso 5a (Respuesta válida):**
- Se agrega el jugador a la cadena visual
- La cadena muestra: [1. Mbappé] → [2. Neymar (tu respuesta en teal)]
- El jugador válido se convierte en el nuevo "jugador actual"
- Turno pasa a Jugador B
- Timer se resetea a 20s

**Paso 5b (Respuesta inválida):**
- Mensaje de error visual: "Jugador no válido" o "No fue compañero" o "Ya usado"
- Feedback visual: input con borde rojo, shake animation
- Toast con el error mostrado por 3s
- **La partida NO termina** — el jugador puede seguir intentando
- El timer continúa corriendo normalmente
- Se puede enviar otra respuesta mientras quede tiempo

**Paso 6 (Turno alternado):**
- Se repite Paso 2-5 con roles invertidos
- Cada jugador debe responder con compañero del último jugador válido
- La cadena crece: [1. Mbappé] → [2. Neymar] → [3. Messi] → [4. Di María] ...

**Paso 7 (Timeout):**
- Si el timer llega a 0s sin haber enviado una respuesta **VÁLIDA**
- **ÚNICA forma de perder:** quedarse sin tiempo
- Partida termina → Jugador con timeout pierde
- Transición a pantalla de resultado
- **Importante:** Se pueden enviar 100 respuestas inválidas sin perder, solo el tiempo importa

**Paso 8 (Desconexión):**
- Si un jugador pierde conexión WebSocket
- Sistema espera 10s de gracia para reconexión
- Si no reconecta → pierde por abandono
- Si reconecta → partida continúa desde el estado actual

**Paso 9 (Resultado):**
- Pantalla muestra: ganador, razón (**solo timeout o abandono**), cadena completa
- ELO delta: "+24 ELO" para ganador, "-24 ELO" para perdedor
- Botón "Back to menu"

---

## Pantallas / Estados

### Estado 1: Pantalla de Juego — Turno Propio

**Layout (basado en la captura):**
```
┌─────────────────────────────────────┐
│ Header:                             │
│   [1-0]  Game 1            [emoji]  │
│                                     │
│         Timer: [4s] ← grande rojo   │
│      [Your turn!] ← badge verde     │
│                                     │
│      Jugador Actual (nombre)        │
│      [CARZZY] ← texto grande        │
│                                     │
│   ┌─────────────┐  ┌────────┐      │
│   │Player name…│  │ Submit │      │
│   └─────────────┘  └────────┘      │
│                                     │
│   CHAIN                             │
│   ┌─────────────────────────┐      │
│   │ 1  Humanoid       ↓     │      │
│   │ 2  Carzzy               │      │
│   └─────────────────────────┘      │
│                                     │
│         [Leave]                     │
└─────────────────────────────────────┘
```

**Elementos visibles:**
- **Header superior**: "1-0 Game 1" (score de partidas entre estos 2 jugadores en la sesión)
- **Timer**: segundos restantes en grande, color rojo cuando < 5s, blanco cuando >= 5s
- **Badge "Your turn!"**: fondo verde/teal, indicador visual del turno activo
- **Jugador actual**: nombre del último jugador válido de la cadena (grande, centrado)
- **Input**: campo de texto con placeholder "Player name..."
- **Botón Submit**: verde/teal, habilitado solo si hay texto
- **Sección CHAIN**: lista vertical numerada con todos los jugadores de la cadena
  - Jugadores alternados por color: el primer jugador (seed) en teal, el siguiente en blanco, etc.
  - Flechas ↓ entre jugadores para indicar secuencia
- **Botón Leave**: abajo, para abandonar partida (penalización = derrota)

**Acciones posibles:**
- Escribir en input → actualiza texto, dispara autocompletado
- Click en sugerencia → completa el input
- Presionar Enter o "Submit" → envía respuesta
- Click "Leave" → modal de confirmación → abandono = derrota

**Comportamiento dinámico:**
- Timer decrementa cada segundo
- Cuando timer < 5s: cambiar color a rojo + animación de pulso
- Autocompletado aparece 300ms después de dejar de escribir (debounce)

---

### Estado 2: Pantalla de Juego — Turno del Rival

**Layout:**
Igual que Estado 1, pero:

**Diferencias:**
- Badge: "Rival pensando..." (gris/amarillo)
- Input: deshabilitado (gris, no editable)
- Botón Submit: deshabilitado
- Timer: sigue corriendo, mostrando el tiempo del rival

**Elementos visibles adicionales:**
- Timer del rival: mismo display, pero el jugador actual ve cuánto tiempo le queda al oponente

**Comportamiento dinámico:**
- Cuando el rival envía respuesta INVÁLIDA: aparece un mensaje toast amarillo en la parte superior:
  - "Rival intentó: [Ronaldo] - No válido"
  - Se muestra por 2s
  - **El rival continúa jugando** (no pierde por esto)
- Cuando el rival envía respuesta VÁLIDA: la cadena se actualiza instantáneamente con el nuevo jugador
- Puedes ver todos los intentos del rival en tiempo real

---

### Estado 3: Autocompletado Activo

**Layout:**
Debajo del input, lista de sugerencias:
```
┌─────────────────────────┐
│ Player name: ney        │ ← input con texto
└─────────────────────────┘
┌─────────────────────────┐
│ ▸ Neymar Jr.           │ ← sugerencia 1 (seleccionada)
│   Neymael              │ ← sugerencia 2
│   Neyens               │ ← sugerencia 3
└─────────────────────────┘
```

**Elementos visibles:**
- Lista de máximo 5 sugerencias
- Sugerencia seleccionada: fondo teal, ▸ indicador
- Resto: fondo transparente/gris oscuro

**Acciones posibles:**
- Flecha arriba/abajo → cambia selección
- Enter → selecciona la sugerencia actual
- Click → selecciona directamente
- Esc → cierra autocompletado

**Datos en cada sugerencia:**
- Nombre del jugador
- (Opcional) País o club pequeño debajo del nombre para desambiguar

**Reglas:**
- Solo mostrar jugadores que son compañeros válidos del jugador actual de la cadena
- Ordenar por relevancia: exact match primero, luego por popularidad (minutes_played_with)
- Filtrar jugadores ya usados en la partida

---

### Estado 4: Pantalla de Resultado

**Layout:**
```
┌─────────────────────────────────────┐
│                                     │
│        [🏆 emoji o icon]           │
│                                     │
│      You Win! / You Lost           │
│                                     │
│      Reason: [Rival timeout]        │
│      o [Invalid answer]             │
│                                     │
│      ELO Change: +24               │
│      New ELO: 1268                 │
│                                     │
│   ┌─────────────────────────┐      │
│   │ CHAIN (N jugadores)      │      │
│   │ 1. Mbappé               │      │
│   │ 2. Neymar               │      │
│   │ 3. Messi                │      │
│   │ ...                     │      │
│   └─────────────────────────┘      │
│                                     │
│   [Back to Menu]                   │
│                                     │
└─────────────────────────────────────┘
```

**Elementos visibles:**
- **Resultado**: "You Win!" (verde) o "You Lost" (rojo)
- **Razón**: texto explicativo del fin de partida
  - "Rival timeout"
  - "Invalid answer: [nombre intentado]"
  - "Rival disconnected"
  - "You gave up"
- **ELO Change**: "+24" (verde) si ganó, "-18" (rojo) si perdió
- **New ELO**: ELO final después de la partida
- **Cadena completa**: scroll si es muy larga, con numeración
- **Botón**: "Back to Menu" (CTA principal)

**Acciones posibles:**
- Click "Back to Menu" → navega al menú principal
- (Futuro P2) Botón "Share" → copia link con stats de la partida

---

## Reglas de negocio

- **RN-01**: Tiempo por turno: 20 segundos (configurable en backend)
- **RN-02**: **ÚNICA forma de perder: Timeout** = derrota automática si no se envió una respuesta válida antes de que termine el tiempo
- **RN-03**: Respuestas inválidas **NO terminan el juego** — solo muestran error visual y el jugador puede seguir intentando
- **RN-04**: Repetir un jugador ya usado en la partida = error visual, no derrota
- **RN-05**: Jugador que no existe o sin edge válido = error visual, no derrota
- **RN-06**: El jugador puede enviar 100 respuestas erróneas sin perder mientras tenga tiempo
- **RN-07**: El seed player es elegido aleatoriamente de un pool de ~100 jugadores populares
- **RN-08**: Validación de compañero: debe existir edge en `teammate_edges` con `minutes_played_with >= 90`
- **RN-09**: Orden de turnos: el jugador 1 (menor user_id o random) juega primero
- **RN-10**: Abandono (Leave) = derrota con penalización normal de ELO
- **RN-11**: Desconexión: 10s de gracia para reconectar, después = derrota por abandono
- **RN-12**: El jugador que no tiene turno ve **todos los intentos inválidos del rival en tiempo real**
- **RN-13**: El autocompletado solo muestra jugadores válidos (compañeros del jugador actual)
- **RN-14**: Match exacto tiene prioridad en autocompletado sobre partial match

---

## Casos edge

- **CE-01**: Jugador escribe nombre que no existe → mensaje de error "Jugador no encontrado" → timer continúa → puede seguir intentando
- **CE-02**: Jugador escribe nombre válido pero sin edge con el actual → mensaje "No fueron compañeros" → timer continúa → puede seguir intentando
- **CE-03**: Jugador envía 50 respuestas inválidas seguidas → todas muestran error → mientras tenga tiempo puede seguir
- **CE-04**: Jugador envía respuesta válida en el segundo 19.9 (antes de timeout) → válida si llega al servidor antes del deadline en BD
- **CE-05**: Ambos jugadores pierden conexión simultáneamente → partida se marca `aborted`, no afecta ELO
- **CE-06**: Jugador intenta enviar dos respuestas rápido (doble click) → el backend solo procesa la primera, la segunda espera resultado
- **CE-07**: El jugador actual no tiene compañeros disponibles (caso extremo de data) → se permite enviar mensaje "No move available" → draw técnico
- **CE-08**: Jugador reconecta después de 10s → ve pantalla de resultado (derrota por abandono)
- **CE-09**: WebSocket desconecta pero HTTP requests siguen funcionando → el cliente reintenta conexión WS automáticamente (exponential backoff)
- **CE-10**: Autocompletado retorna 0 resultados → el input queda libre, jugador puede enviar igual (mostrará error pero no pierde)
- **CE-11**: Jugador escribe nombre con diacríticos (ej. "Müller") → sistema normaliza y busca correctamente
- **CE-12**: Timer del rival llega a 0 mientras el jugador actual escribe → pantalla se actualiza a resultado (victoria) inmediatamente
- **CE-13**: Jugador envía respuesta inválida en el último segundo antes de timeout → muestra error, pero si no da tiempo a enviar otra válida → pierde por timeout

---

## Datos necesarios

### De la partida (estado en PartyKit room):
- `match_id`
- `player1_user_id`, `player2_user_id`
- `current_player_id` (quién tiene el turno)
- `current_chain_player_id` (último jugador válido)
- `turn_number`
- `turn_deadline_at` (timestamp ISO)
- `chain`: array de `{ position, player_id, player_name, played_by_user_id }`

### De la BD para validación:
- `teammate_edges(player_id, teammate_id)` → verificar conectividad
- `match_chain_nodes(match_id, player_id)` → verificar no repetición
- `players(normalized_name)` → resolver nombre a player_id

### Para autocompletado:
- Query: `SELECT * FROM players WHERE normalized_name LIKE '%{input}%' AND player_id IN (SELECT teammate_id FROM teammate_edges WHERE player_id = {current_chain_player_id}) LIMIT 5`

---

## Endpoints o lógica requerida

### WebSocket (PartyKit Room especificado por `match_id`)

#### Mensajes del cliente → servidor:
```typescript
// Enviar jugada
{
  type: 'play',
  input_text: string,
  timestamp: string  // client timestamp para debug latency
}

// Abandonar partida
{
  type: 'leave'
}

// Heartbeat (cada 5s)
{
  type: 'ping'
}
```

#### Mensajes del servidor → cliente(s):
```typescript
// Estado inicial al conectar
{
  type: 'game_state',
  match: {
    match_id,
    player1, player2,
    current_player_id,
    current_chain_player_id,
    turn_number,
    turn_deadline_at,
    chain: [{ position, player_id, player_name, played_by_user_id }]
  }
}

// Turno válido
{
  type: 'turn_valid',
  turn_number,
  player_id,
  player_name,
  played_by_user_id,
  next_player_id,
  new_deadline
}

// Turno inválido
{
  type: 'turn_invalid',
  reason: 'not_found' | 'not_teammate' | 'already_used' | 'timeout',
  input_text,
  loser_user_id,
  winner_user_id
}

// Partida terminada (solo por timeout, disconnect o resign)
{
  type: 'game_over',
  winner_user_id,
  reason: 'timeout' | 'disconnect' | 'resign',  // NO incluye 'invalid_answer'
  final_chain: [...],
  elo_changes: {
    [user_id]: { before, after, delta }
  }
}

// Rival desconectado
{
  type: 'opponent_disconnected',
  grace_period_seconds: 10
}

// Rival reconectado
{
  type: 'opponent_reconnected'
}
```

### REST API (Hono) — Usado por PartyKit server-side

- **POST /game/validate-play**
  - Input: `{ match_id, user_id, input_text, current_chain_player_id }`
  - Output: `{ valid: boolean, resolved_player_id?, reason? }`
  - Lógica: normalizar, resolver jugador, validar edge, validar no repetición

- **GET /game/autocomplete**
  - Input: `{ query, current_chain_player_id }`
  - Output: `{ players: [{ player_id, player_name, slug }] }`
  - Lógica: búsqueda con pg_trgm + filtro de teammates

- **GET /matches/{match_id}**
  - Input: `match_id`
  - Output: estado completo de la partida (para reconexión)

---

## Criterios de aceptación

- [ ] **CA-01**: Al cargar la partida, el seed player aparece en < 1s
- [ ] **CA-02**: El timer decrementa cada segundo de forma fluida (sin saltos)
- [ ] **CA-03**: El autocompletado aparece en < 300ms después de dejar de escribir
- [ ] **CA-04**: Las sugerencias solo incluyen jugadores válidos (compañeros del actual)
- [ ] **CA-05**: Al enviar respuesta válida, la cadena se actualiza en ambas pantallas en < 500ms
- [ ] **CA-06**: Al enviar respuesta inválida, ambos jugadores ven el mensaje de error inmediatamente
- [ ] **CA-07**: El timer cambia a rojo cuando quedan < 5s
- [ ] **CA-08**: Si el timer llega a 0, la partida termina automáticamente (no requiere acción del servidor manual)
- [ ] **CA-09**: El jugador sin turno ve el timer del rival corriendo
- [ ] **CA-10**: Al perder conexión, el cliente intenta reconectar automáticamente
- [ ] **CA-11**: Si reconecta en < 10s, la partida continúa desde el estado actual
- [ ] **CA-12**: La pantalla de resultado muestra el ELO delta correcto (+/-)
- [ ] **CA-13**: La cadena completa es scrolleable si excede el viewport
- [ ] **CA-14**: No hay lag visual entre presionar "Submit" y deshabilitar el input

---

## Notas para Backend Architect

### PartyKit Room (match_{match_id})
- **Estado en memoria**:
  ```typescript
  {
    matchId: string,
    player1: { userId, connectionId, lastPing },
    player2: { userId, connectionId, lastPing },
    currentPlayerId: string,
    currentChainPlayerId: string,  // último jugador válido
    chain: Array<{ position, playerId, playerName, playedByUserId }>,
    turnNumber: number,
    turnDeadline: Date,
    status: 'active' | 'finished',
    timerInterval: NodeJS.Timeout  // para check automático de timeout
  }
  ```
- **Timer server-side**: Cada segundo, checkear si `Date.now() > turnDeadline` → auto-terminar
- **Validación**: En `onMessage('play')`, llamar a `/game/validate-play` (HTTP interno) → si inválido, terminar partida
- **Persistencia**: Cada turno válido → insertar en `match_turns` y `match_chain_nodes`
- **Reconexión**: En `onConnect()`, verificar si `userId` ya está en el room → enviar `game_state` completo
- **Cleanup**: En `onClose()`, esperar 10s → si no reconecta, terminar partida por abandono

### Transacción crítica (validación de jugada):
```sql
BEGIN;
SELECT * FROM matches WHERE id = $1 FOR UPDATE;  -- lock de fila
-- validar condiciones
-- insertar turno
-- actualizar match state
COMMIT;
```

---

## Notas para Frontend Architect

### Estado global (Zustand):
```typescript
gameStore: {
  matchId: string | null,
  player1: { userId, username, elo },
  player2: { userId, username, elo },
  currentPlayerId: string,
  isMyTurn: boolean,
  currentChainPlayer: { playerId, playerName },
  chain: Array<{ position, playerId, playerName, playedByUserId }>,
  secondsRemaining: number,
  status: 'active' | 'finished',
  result?: { winner, reason, eloChanges }
}
```

### WebSocket connection:
```typescript
const ws = new WebSocket(`wss://partykit.{project}.party/match_${matchId}`);
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  switch (message.type) {
    case 'game_state': gameStore.setState(message.match); break;
    case 'turn_valid': gameStore.addToChain(message); break;
    case 'turn_invalid': showError(message); endGame(message); break;
    case 'game_over': showResult(message); break;
  }
};
```

### Animaciones (Framer Motion):
- Cadena: nueva entrada aparece con `initial={{ opacity: 0, x: -20 }}` + `animate={{ opacity: 1, x: 0 }}`
- Timer < 5s: pulso con `animate={{ scale: [1, 1.1, 1] }}` + `transition={{ repeat: Infinity, duration: 1 }}`
- Input deshabilitado: opacity 0.5 + cursor not-allowed
- Autocompletado: `initial={{ opacity: 0, y: -10 }}` + `animate={{ opacity: 1, y: 0 }}`

### Responsive:
- Mobile: cadena con height fijo (150px) + scroll interno
- Desktop: cadena con max-height 300px
- Timer: siempre visible en top, nunca se oculta con scroll

### Accesibilidad:
- Timer: `role="timer"` + `aria-live="polite"` cuando < 5s → `aria-live="assertive"`
- Input: `aria-label="Nombre del jugador compañero"`
- Autocompletado: `role="listbox"` + `aria-activedescendant` para selección
- Resultado: `role="alert"` con "Has ganado" o "Has perdido"
