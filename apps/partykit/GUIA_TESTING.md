# 🧪 Guía de Testing FASE 5 - PartyKit WebSocket Server

**Fecha**: 2026-04-26  
**Estado**: Testing con servidor alternativo (workaround para bug de PartyKit en Windows)

---

## ⚠️ Nota sobre PartyKit en Windows

PartyKit 0.0.115 tiene un **bug conocido con rutas de Windows** que causa:
```
TypeError: Invalid URL
input: '.\\file:\\C:\\Users\\...'
```

**Solución temporal**: Usamos `test-server.js` (Node.js + ws) que implementa la misma API de PartyKit para validar la lógica del juego.

**En producción**: PartyKit funciona correctamente en Cloudflare Workers (sin este bug).

---

## 🚀 Servicios Necesarios

### 1. API REST (Puerto 3001)

**Terminal 1**:
```powershell
$env:PATH = "$env:USERPROFILE\.bun\bin;$env:PATH"
cd C:\Users\wacho\Desktop\FootballConections
npx tsx --env-file=.env apps/api/src/index.ts
```

**Verificar**:
```powershell
curl http://localhost:3001/health
# Debe retornar: {"status":"ok",...}
```

---

### 2. WebSocket Test Server (Puerto 1999)

**Terminal 2**:
```powershell
$env:PATH = "$env:USERPROFILE\.bun\bin;$env:PATH"
cd C:\Users\wacho\Desktop\FootballConections\apps\partykit
node test-server.js
```

**Verificar**:
```powershell
curl http://localhost:1999/health
# Debe retornar: {"status":"ok","rooms":0}
```

---

## 📋 Escenarios de Testing

### Escenario 1: Conexión de ambos jugadores

**Terminal 3** (Jugador 1):
```powershell
wscat -c "ws://localhost:1999/game-room/test-match-123?userId=user-1"
```

**Salida esperada** (JSON formateado):
```json
{
  "type": "game:state",
  "data": {
    "matchId": "test-match-123",
    "status": "waiting",
    "players": [
      {"id": "user-1", "name": "Player 1", "elo": 1500, "connected": true},
      {"id": "user-2", "name": "Player 2", "elo": 1520, "connected": false}
    ],
    "currentTurn": null,
    "chain": [
      {"id": "player-1", "name": "Kylian Mbappé", "addedBy": null}
    ],
    "timeLeft": 20
  }
}
```

**Terminal 4** (Jugador 2):
```powershell
wscat -c "ws://localhost:1999/game-room/test-match-123?userId=user-2"
```

**Ambos terminales recibirán**:
```json
// Jugador 2 recibe game:state
{
  "type": "game:state",
  "data": {...}
}

// Jugador 1 recibe notificación de conexión
{
  "type": "player:connected",
  "data": {"userId": "user-2"}
}

// Ambos reciben game:start
{
  "type": "game:start",
  "data": {
    "currentTurn": "user-1",
    "timeLeft": 20
  }
}

// Timer empieza a broadcast cada segundo
{
  "type": "game:turn",
  "data": {
    "currentTurn": "user-1",
    "timeLeft": 19
  }
}
```

---

### Escenario 2: Movimiento válido (turno del jugador 1)

**En Terminal 3** (user-1), escribir:
```json
{"type":"player:move","data":{"playerName":"Karim Benzema"}}
```

**Presionar ENTER**

**Ambos terminales recibirán**:
```json
{
  "type": "game:move:valid",
  "data": {
    "player": {
      "id": "player-1",
      "name": "Karim Benzema",
      "addedBy": "user-1"
    },
    "nextTurn": "user-2",
    "chain": [
      {"id": "player-1", "name": "Kylian Mbappé", "addedBy": null},
      {"id": "player-1", "name": "Karim Benzema", "addedBy": "user-1"}
    ]
  }
}

// Timer se resetea a 20 segundos
{
  "type": "game:turn",
  "data": {
    "currentTurn": "user-2",
    "timeLeft": 20
  }
}
```

---

### Escenario 3: Movimiento inválido (jugador equivocado)

**En Terminal 3** (user-1 cuando NO es su turno), escribir:
```json
{"type":"player:move","data":{"playerName":"Cristiano Ronaldo"}}
```

**Solo Terminal 3 recibirá**:
```json
{
  "type": "game:move:invalid",
  "data": {
    "reason": "Not your turn"
  }
}
```

**Nota**: El juego NO termina. El jugador puede seguir intentando cuando sea su turno.

---

### Escenario 4: Timeout (20 segundos sin movimiento)

**Esperar 20 segundos sin hacer ningún movimiento**

**Ambos terminales recibirán**:
```json
{
  "type": "game:turn",
  "data": {
    "currentTurn": "user-2",
    "timeLeft": 1
  }
}

// Después de 1 segundo más:
{
  "type": "game:end",
  "data": {
    "reason": "timeout",
    "winnerId": "user-1",  // El OTRO jugador gana
    "chain": [...],
    "eloChanges": {
      "user-1": 15,
      "user-2": -15
    }
  }
}
```

---

### Escenario 5: Rendición (Surrender)

**En Terminal 4** (user-2), escribir:
```json
{"type":"player:surrender"}
```

**Ambos terminales recibirán**:
```json
{
  "type": "game:end",
  "data": {
    "reason": "resign",
    "winnerId": "user-1",
    "chain": [...],
    "eloChanges": {
      "user-1": 15,
      "user-2": -15
    }
  }
}
```

---

### Escenario 6: Desconexión (10s grace period)

**En Terminal 3**, presionar `Ctrl+C` (desconectar)

**Terminal 4 recibirá**:
```json
{
  "type": "player:disconnected",
  "data": {"userId": "user-1"}
}

// Después de 10 segundos SIN reconexión:
{
  "type": "game:end",
  "data": {
    "reason": "disconnect",
    "winnerId": "user-2",
    "chain": [...],
    "eloChanges": {
      "user-1": -15,
      "user-2": 15
    }
  }
}
```

---

### Escenario 7: Reconnection (antes de 10s)

**Después de desconectar en Escenario 6**:

**En Terminal 3** (reconectar ANTES de 10s):
```powershell
wscat -c "ws://localhost:1999/game-room/test-match-123?userId=user-1"
```

**Terminal 3 recibirá el estado actual**:
```json
{
  "type": "game:state",
  "data": {
    "status": "active",
    "currentTurn": "user-2",
    "chain": [...],  // Cadena completa preservada
    "timeLeft": 15   // Timer continúa desde donde estaba
  }
}
```

**Terminal 4 recibirá**:
```json
{
  "type": "player:connected",
  "data": {"userId": "user-1"}
}
```

**Resultado**: El juego continúa sin pérdida de estado.

---

### Escenario 8: Ping/Pong (keep-alive)

**En cualquier terminal**, escribir:
```json
{"type":"ping"}
```

**Ese terminal recibirá**:
```json
{"type":"pong"}
```

---

## 🎯 Checklist de Validación

- [ ] **Conexión**: Ambos jugadores se conectan correctamente
- [ ] **Game Start**: `game:start` se emite cuando ambos conectan
- [ ] **Timer**: Broadcasts de `game:turn` cada segundo con countdown
- [ ] **Movimiento válido**: Agrega jugador a la cadena y cambia turno
- [ ] **Movimiento inválido**: Retorna error sin terminar juego
- [ ] **Timeout**: Juego termina después de 20s sin movimiento
- [ ] **Rendición**: Jugador puede rendirse y termina el juego
- [ ] **Desconexión**: 10s grace period antes de terminar
- [ ] **Reconnection**: Estado preservado al reconectar
- [ ] **ELO**: Cambios de ELO correctos (±15 en testing)

---

## 🐛 Troubleshooting

### Error: "ECONNREFUSED" al conectar con wscat

**Causa**: WebSocket server no está corriendo.

**Solución**:
```powershell
# Terminal 2
cd apps/partykit
node test-server.js
```

### Error: "Invalid path" en conexión

**Causa**: URL mal formada.

**Correcto**:
```powershell
wscat -c "ws://localhost:1999/game-room/test-match-123?userId=user-1"
```

**Incorrecto**:
```powershell
wscat -c "ws://localhost:1999/test-match-123?userId=user-1"  # Falta /game-room/
wscat -c "ws://localhost:1999/game-room/test-match-123"       # Falta ?userId=
```

### Timer no arranca

**Causa**: Segundo jugador no se conectó o room ID diferente.

**Verificar**:
- Ambos terminales usan **el mismo** `test-match-123` (o el ID que elijas)
- Ambos terminales tienen `userId` diferentes (`user-1` y `user-2`)

### Mensajes JSON no se envían

**Causa**: wscat necesita JSON válido en una sola línea.

**Correcto**:
```json
{"type":"player:move","data":{"playerName":"Lionel Messi"}}
```

**Incorrecto** (con saltos de línea):
```json
{
  "type": "player:move"
}
```

---

## 🔄 Próximos Pasos

Una vez validados todos los escenarios:

1. **Testing en producción**: Deploy a Cloudflare Workers (PartyKit funciona sin el bug de Windows)
2. **Integración frontend**: Conectar desde Next.js con WebSocket client
3. **Testing E2E**: Playwright con 2 browsers simulando partida completa

---

## 📚 Referencia Rápida de Eventos

### Cliente → Servidor

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `player:move` | `{playerName: string}` | Enviar movimiento |
| `player:surrender` | - | Rendirse |
| `ping` | - | Keep-alive |

### Servidor → Cliente

| Evento | Cuándo se emite | Datos |
|--------|----------------|-------|
| `game:state` | Al conectar | Estado completo |
| `game:start` | Ambos jugadores conectados | `{currentTurn, timeLeft}` |
| `game:turn` | Cada segundo | `{currentTurn, timeLeft}` |
| `game:move:valid` | Movimiento válido | `{player, nextTurn, chain}` |
| `game:move:invalid` | Movimiento inválido | `{reason}` |
| `game:end` | Juego termina | `{reason, winnerId, eloChanges}` |
| `player:connected` | Jugador (re)conecta | `{userId}` |
| `player:disconnected` | Jugador desconecta | `{userId}` |
| `error` | Error del servidor | `{message}` |
| `pong` | Respuesta a ping | - |

---

**Última actualización**: 2026-04-26  
**Autor**: Orchestrator Agent  
**Versión**: Test Server 1.0 (workaround PartyKit Windows bug)
