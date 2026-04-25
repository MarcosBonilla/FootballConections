# PartyKit Server - Football Connections

WebSocket server para partidas en tiempo real usando PartyKit (Cloudflare Durable Objects).

## 🚀 Desarrollo

```bash
# Instalar dependencias
bun install

# Levantar servidor local
bun run dev

# Deploy a producción
bun run deploy

# Ver logs
bun run tail
```

El servidor local corre en `http://localhost:1999`.

## 📡 Endpoints WebSocket

### Conectar a una partida

```
ws://localhost:1999/parties/game/[matchId]?userId=[userId]
```

**Query params:**
- `matchId`: ID del match (UUID)
- `userId`: ID del usuario conectándose

## 📨 Eventos del Cliente → Servidor

### 1. player:ready
Indica que el jugador está listo para comenzar.

```json
{ "type": "player:ready" }
```

### 2. player:move
Enviar un movimiento (nombre de jugador).

```json
{
  "type": "player:move",
  "playerName": "Lionel Messi"
}
```

### 3. player:surrender
Rendirse en la partida.

```json
{ "type": "player:surrender" }
```

### 4. ping
Heartbeat para mantener conexión activa.

```json
{ "type": "ping" }
```

## 📥 Eventos del Servidor → Cliente

### 1. game:state
Estado completo del juego (enviado al conectarse).

```json
{
  "type": "game:state",
  "state": {
    "matchId": "uuid",
    "status": "active",
    "players": {
      "player1": {
        "userId": "uuid",
        "username": "Player1",
        "elo": 1250,
        "connected": true
      },
      "player2": { ... }
    },
    "currentPlayerId": "uuid",
    "currentChainPlayer": {
      "id": 28003,
      "name": "Lionel Messi",
      "position": "Forward",
      "nationality": "Argentina"
    },
    "chain": [],
    "turnNumber": 1,
    "turnDeadlineAt": "2026-04-26T12:00:00Z",
    "timeLeft": 20
  }
}
```

### 2. game:start
Juego iniciado, indica quién juega primero.

```json
{
  "type": "game:start",
  "firstPlayerId": "uuid",
  "seedPlayer": {
    "id": 28003,
    "name": "Lionel Messi",
    "position": "Forward",
    "nationality": "Argentina"
  }
}
```

### 3. game:turn
Actualización del timer cada segundo.

```json
{
  "type": "game:turn",
  "playerId": "uuid",
  "timeLeft": 15
}
```

### 4. game:move:valid
Movimiento aceptado, jugador agregado a la cadena.

```json
{
  "type": "game:move:valid",
  "node": {
    "position": 2,
    "player": {
      "id": 456,
      "name": "Neymar Jr",
      "position": "Forward"
    },
    "playedByUserId": "uuid",
    "playedAt": "2026-04-26T12:00:15Z"
  },
  "nextPlayer": { ... }
}
```

### 5. game:move:invalid
Movimiento rechazado.

```json
{
  "type": "game:move:invalid",
  "reason": "Players never played together"
}
```

**Razones posibles:**
- `"Player not found"`
- `"Players never played together"`
- `"Player already used in this match"`
- `"Not your turn"`
- `"Game is not active"`

### 6. game:end
Partida terminada con resultado y cambios de ELO.

```json
{
  "type": "game:end",
  "winner": "uuid",
  "reason": "timeout",
  "eloChanges": {
    "winner": {
      "userId": "uuid",
      "oldElo": 1200,
      "newElo": 1224,
      "delta": 24
    },
    "loser": {
      "userId": "uuid",
      "oldElo": 1200,
      "newElo": 1176,
      "delta": -24
    }
  }
}
```

**Razones de finalización:**
- `"timeout"` - Se acabó el tiempo
- `"surrender"` - Rendición
- `"disconnect"` - Desconexión sin reconexión

### 7. player:connected / player:disconnected
Notificación de conexión/desconexión del oponente.

```json
{ "type": "player:connected", "userId": "uuid" }
{ "type": "player:disconnected", "userId": "uuid" }
```

### 8. error
Error genérico.

```json
{
  "type": "error",
  "message": "Error description"
}
```

### 9. pong
Respuesta a ping.

```json
{ "type": "pong" }
```

## 🎮 Flujo de Juego

```
1. Matchmaking crea match en BD
2. Ambos jugadores conectan al WebSocket con matchId
3. Servidor envía game:state a cada jugador
4. Cuando ambos conectan, servidor envía game:start
5. Timer comienza, game:turn cada segundo
6. Jugador actual envía player:move
7. Servidor valida:
   - ¿Es compañero del jugador actual?
   - ¿No fue usado antes?
   - ¿Dentro del tiempo?
8. Si válido → game:move:valid + cambio de turno
9. Si inválido → game:move:invalid (jugador puede reintentar)
10. Si timeout → game:end con winner
11. Si surrender → game:end inmediato
12. Si disconnect → 10s de gracia, luego game:end
```

## 🔐 Seguridad

- El `userId` se pasa por query param al conectar
- Cada conexión se valida contra el match en BD
- Solo los 2 jugadores del match pueden conectar
- Movimientos se validan en backend (no confiar en cliente)
- Desconexiones tienen grace period de 10s

## 🏗️ Integración con API REST

El GameRoom llama al endpoint interno de la API REST para completar matches:

```
POST http://localhost:3001/internal/matches/{matchId}/complete
{
  "winnerId": "uuid",
  "loserId": "uuid",
  "reason": "timeout"
}
```

Este endpoint:
- Actualiza match status en BD
- Calcula y aplica cambios de ELO
- Retorna los deltas de ELO

## 📊 Estado Persistente

El GameRoom mantiene estado en memoria (Durable Object):
- Conexiones activas de ambos jugadores
- Cadena de jugadores actual
- Timer del turno
- Timestamps de desconexión

El estado se sincroniza con Supabase:
- Cada movimiento válido → insert en `match_chain_nodes` y `match_turns`
- Finalización → update en `matches` + cálculo de ELO

## 🛠️ Variables de Entorno

```bash
# .env
API_URL=http://localhost:3001
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 🐛 Debugging

Ver logs en tiempo real:

```bash
bun run tail
```

Conectar con cliente de prueba:

```bash
# Usando wscat
npm install -g wscat
wscat -c "ws://localhost:1999/parties/game/test-match-id?userId=test-user-1"

# Enviar mensaje
> {"type":"ping"}
< {"type":"pong"}
```

## 📚 Referencias

- [PartyKit Docs](https://docs.partykit.io/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Spec: PartyKitGameRoom](../../Documentacion/Funcionales/Componentes/Backend/03_PartyKitGameRoom.md)
- [Spec: Flujo de Partida](../../Documentacion/Funcionales/Transversal/02_Flujo_Partida.md)
