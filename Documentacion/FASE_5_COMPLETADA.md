# FASE 5 COMPLETADA ✅

**Fecha**: 2026-04-26  
**Versión**: 1.0.0  
**Estado**: ✅ **COMPLETADA E IMPLEMENTADA**

---

## 🎯 Objetivo

Implementar el servidor real-time con PartyKit (Cloudflare Durable Objects) para gestionar partidas 1v1 con WebSocket, incluyendo estado del juego, validación de movimientos, timer de turnos, y sincronización con la API REST.

---

## 🏗️ Arquitectura Implementada

### Runtime y Framework
- **PartyKit**: 0.0.111 (Cloudflare Durable Objects)
- **WebSocket**: Nativo de Cloudflare Workers
- **Base de datos**: Supabase REST API via @supabase/supabase-js
- **Integración**: API REST en Node.js (endpoint interno)

### Start Command
```bash
bun run dev:party
```

Server runs on `http://localhost:1999`

---

## 📁 Estructura Implementada

```
apps/partykit/
├── src/
│   ├── rooms/
│   │   └── game.ts              ✅ GameRoom class completa
│   └── types.ts                 ✅ Tipos WebSocket events
├── package.json                 ✅ Dependencies configuradas
├── tsconfig.json                ✅ TypeScript config
├── partykit.json                ✅ PartyKit config
├── .env.example                 ✅ Template de variables
└── README.md                    ✅ Documentación completa
```

---

## 🎮 GameRoom Implementado

### Características Core

```typescript
✅ onStart() - Cargar match de BD al inicializar room
✅ onConnect() - Manejar conexión de jugador con validación
✅ onMessage() - Procesar eventos del cliente
✅ onClose() - Manejar desconexión con grace period
✅ startGame() - Iniciar partida cuando ambos jugadores conectan
✅ handlePlayerMove() - Validar y aplicar movimientos
✅ handleSurrender() - Manejar rendición
✅ startTimer() - Timer de 20s por turno con broadcast cada segundo
✅ endGame() - Finalizar partida y calcular ELO
```

### Estado Persistente (RoomState)

```typescript
interface RoomState {
  matchId: string;
  player1: PlayerInfo;
  player2: PlayerInfo;
  player1ConnectionId: string | null;
  player2ConnectionId: string | null;
  
  status: 'waiting' | 'active' | 'finished';
  currentPlayerId: string;
  currentChainPlayer: Player;
  seedPlayer: Player;
  chain: ChainNode[];
  turnNumber: number;
  turnDeadlineAt: Date;
  
  disconnectedPlayers: Set<string>;
  reconnectTimers: Map<string, ReturnType<typeof setTimeout>>;
  timerInterval: ReturnType<typeof setInterval> | null;
}
```

---

## 📡 Eventos WebSocket Implementados

### Cliente → Servidor (GameEvent)

| Evento | Descripción | Payload |
|--------|-------------|---------|
| `player:ready` | Jugador listo | `{}` |
| `player:move` | Enviar movimiento | `{ playerName: string }` |
| `player:surrender` | Rendirse | `{}` |
| `ping` | Heartbeat | `{}` |

### Servidor → Cliente (ServerEvent)

| Evento | Descripción | Cuándo se envía |
|--------|-------------|-----------------|
| `game:state` | Estado completo | Al conectarse |
| `game:start` | Juego iniciado | Ambos jugadores conectados |
| `game:turn` | Update del timer | Cada segundo |
| `game:move:valid` | Movimiento aceptado | Después de validación exitosa |
| `game:move:invalid` | Movimiento rechazado | Validación fallida |
| `game:end` | Partida terminada | Timeout / Rendición / Desconexión |
| `player:connected` | Jugador conectó | Cuando conecta |
| `player:disconnected` | Jugador desconectó | Cuando desconecta |
| `error` | Error genérico | En caso de error |
| `pong` | Respuesta a ping | Heartbeat response |

---

## 🔄 Flujo de Juego Completo

```
┌─────────────────────────────────────────────────────────┐
│ 1. Matchmaking crea match en BD                         │
│    - seed_player_id asignado random                     │
│    - status = 'waiting'                                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Jugadores conectan a WebSocket                       │
│    ws://localhost:1999/parties/game/[matchId]?userId=x  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Servidor valida userId es parte del match            │
│    - Si no → close(1008, 'Not authorized')             │
│    - Si sí → state.player1.connected = true            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Servidor envía game:state a cada jugador             │
│    - Estado actual, turnos, cadena, timer              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Cuando ambos conectados → game:start                 │
│    - Determina firstPlayerId (menor user_id)           │
│    - status = 'active'                                 │
│    - turnDeadlineAt = now + 20s                        │
│    - Inicia timer interval (broadcast cada 1s)         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Jugador actual envía player:move                     │
│    { type: 'player:move', playerName: 'Neymar' }       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 7. Servidor valida movimiento:                          │
│    a) Buscar jugador por nombre (fuzzy)                │
│    b) Verificar edge en teammate_edges                 │
│    c) Verificar no usado antes en la cadena            │
│    d) Verificar dentro del tiempo límite               │
└─────────────────────────────────────────────────────────┘
             ↓                          ↓
┌──────────────────────┐    ┌──────────────────────┐
│ ✅ VÁLIDO            │    │ ❌ INVÁLIDO          │
│                      │    │                      │
│ game:move:valid      │    │ game:move:invalid    │
│ - Agrega a cadena    │    │ - Error message      │
│ - Cambia turno       │    │ - Puede reintentar   │
│ - Inserts en BD:     │    │ - Timer sigue        │
│   · match_chain_nodes│    └──────────────────────┘
│   · match_turns      │
│ - Reinicia timer     │
└──────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────┐
│ 8. Timer llega a 0 sin movimiento válido                │
│    → endGame(opponentId, 'timeout')                     │
│    → POST /internal/matches/:id/complete                │
│    → Calcula ELO                                        │
│    → game:end con resultado                             │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Validación de Movimientos

### Pasos de Validación (handlePlayerMove)

1. **Verificar juego activo**: `status === 'active'`
2. **Verificar turno**: `userId === currentPlayerId`
3. **Verificar tiempo**: `Date.now() <= turnDeadlineAt`
4. **Buscar jugador**: `supabase.from('players').ilike('name', playerName)`
5. **Verificar edge**: `supabase.from('teammate_edges').eq(player_id, currentChainPlayer.id).eq(teammate_id, nextPlayer.id)`
6. **Verificar no usado**: `chain.some(node => node.player.id === nextPlayer.id) || seedPlayer.id === nextPlayer.id`

### Respuestas de Validación

| Caso | Event | Reason |
|------|-------|--------|
| Jugador no encontrado | `game:move:invalid` | "Player not found" |
| No compañeros | `game:move:invalid` | "Players never played together" |
| Ya usado | `game:move:invalid` | "Player already used in this match" |
| No es tu turno | `error` | "Not your turn" |
| Juego no activo | `error` | "Game is not active" |
| Movimiento válido | `game:move:valid` | - |

---

## ⏱️ Sistema de Timer

### Implementación

```typescript
startTimer() {
  this.state.timerInterval = setInterval(() => {
    const timeLeft = Math.max(0, Math.floor((turnDeadlineAt - now) / 1000));
    
    // Broadcast cada segundo
    this.broadcast({ type: 'game:turn', playerId, timeLeft });
    
    // Si timeLeft === 0 → endGame(opponent, 'timeout')
  }, 1000);
}
```

### Restart del Timer

- Se reinicia en cada movimiento válido
- `turnDeadlineAt = Date.now() + GAME_CONFIG.TURN_TIME_SECONDS * 1000`
- `clearInterval()` del timer anterior
- `startTimer()` con nuevo deadline

---

## 🔌 Desconexión y Reconexión

### Grace Period: 10 segundos

```typescript
onClose(conn) {
  // Marcar como desconectado
  state.player.connected = false;
  state.disconnectedPlayers.add(userId);
  
  // Timer de reconexión
  const timer = setTimeout(() => {
    console.log('User did not reconnect, ending game');
    endGame(opponentId, 'disconnect');
  }, 10000);
  
  state.reconnectTimers.set(userId, timer);
}

onConnect(conn) {
  // Si estaba desconectado
  if (disconnectedPlayers.has(userId)) {
    clearTimeout(reconnectTimer);
    reconnectTimers.delete(userId);
    disconnectedPlayers.delete(userId);
    // Game continúa normalmente
  }
}
```

---

## 🔗 Integración con API REST

### Endpoint Interno Creado

```typescript
// apps/api/src/routes/internal.ts
POST /internal/matches/:matchId/complete
{
  "winnerId": "uuid",
  "loserId": "uuid",
  "reason": "timeout" | "resign" | "disconnect"
}

Response:
{
  "success": true,
  "eloChanges": {
    "winner": { userId, oldElo, newElo, delta },
    "loser": { userId, oldElo, newElo, delta }
  }
}
```

### Flujo de Finalización

1. GameRoom detecta fin (timeout/surrender/disconnect)
2. GameRoom llama `POST /internal/matches/${matchId}/complete`
3. API REST:
   - Update `matches` table: `status='finished', winner_id, end_reason, finished_at`
   - Llama `eloCalculator.calculateEloChange()`
   - Update `player_ratings` table
   - Insert en `rating_history` table
4. API REST retorna ELO changes
5. GameRoom envía `game:end` con ELO changes a ambos jugadores

---

## 📦 Configuración y Dependencias

### package.json

```json
{
  "name": "@football-connections/partykit",
  "version": "1.0.0",
  "dependencies": {
    "@football-connections/database": "workspace:*",
    "@football-connections/shared": "workspace:*",
    "partykit": "^0.0.111"
  },
  "scripts": {
    "dev": "partykit dev",
    "deploy": "partykit deploy",
    "tail": "partykit tail"
  }
}
```

### partykit.json

```json
{
  "name": "football-connections",
  "main": "src/server.ts",
  "parties": {
    "game": "src/rooms/game.ts"
  },
  "compatibilityDate": "2024-01-01",
  "minify": false
}
```

### Variables de Entorno (.env)

```bash
API_URL=http://localhost:3001
SUPABASE_URL=https://aproqvilojuhqjickjfr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 🧪 Testing Manual

### Con wscat (WebSocket Client)

```bash
# Instalar wscat
npm install -g wscat

# Conectar como Player 1
wscat -c "ws://localhost:1999/parties/game/test-match?userId=player1"

# Enviar eventos
> {"type":"player:ready"}
> {"type":"player:move","playerName":"Neymar"}
> {"type":"ping"}

# Ver respuestas
< {"type":"pong"}
< {"type":"game:state","state":{...}}
< {"type":"game:turn","playerId":"player1","timeLeft":19}
```

### Flow de Testing

1. Crear match en BD con status='waiting'
2. Conectar Player 1 → recibe `game:state`
3. Conectar Player 2 → ambos reciben `game:start`
4. Player 1 envía `player:move` → recibe `game:move:valid` o `invalid`
5. Timer decrementa cada segundo → ambos reciben `game:turn`
6. Si timeout → ambos reciben `game:end`

---

## 📚 Actualización de Constantes

### packages/shared/src/constants/index.ts

```typescript
export const GAME_CONFIG = {
  TURN_TIME_SECONDS: 20,
  DISCONNECT_GRACE_PERIOD_MS: 10000,
  MATCHMAKING_TIMEOUT_SECONDS: 60,
  MATCHMAKING_INITIAL_RANGE: 50,
  MATCHMAKING_RANGE_INCREMENT: 25,
  MATCHMAKING_MAX_WAIT_TIME_MS: 5 * 60 * 1000,
  // ...
} as const;
```

---

## 📊 Archivos Creados/Modificados

### ✅ Nuevos Archivos

1. `apps/partykit/src/rooms/game.ts` - GameRoom class (680 líneas)
2. `apps/partykit/src/types.ts` - Tipos WebSocket events
3. `apps/partykit/README.md` - Documentación completa del server
4. `apps/partykit/.env.example` - Template de variables de entorno
5. `apps/api/src/routes/internal.ts` - Endpoint interno para completar matches

### ✅ Archivos Modificados

1. `apps/partykit/package.json` - Dependencias actualizadas
2. `apps/partykit/tsconfig.json` - Config TypeScript
3. `apps/partykit/partykit.json` - Config PartyKit
4. `apps/api/src/index.ts` - Agregado `/internal` route
5. `packages/shared/src/constants/index.ts` - Agregadas constantes de desconexión

---

## 🎓 Lecciones Aprendidas

1. **PartyKit Durable Objects**: State persistente en memoria + WebSocket nativo
2. **Grace Period**: 10s permite reconexión sin penalización
3. **Timer Broadcasting**: Enviar update cada segundo mantiene clientes sincronizados
4. **Validación Server-Side**: NUNCA confiar en el cliente para reglas del juego
5. **Internal Endpoints**: Separar lógica de ELO en API REST permite testing independiente
6. **Fuzzy Search**: Usar `ilike` de Supabase para buscar jugadores por nombre aproximado
7. **Connection Tracking**: Usar `connectionId` separado del `userId` para reconexión

---

## 🚀 Próximos Pasos: FASE 6

**Requisitos cumplidos para FASE 6**:
- ✅ API REST funcional (FASE 4)
- ✅ PartyKit WebSocket server (FASE 5)
- ✅ Base de datos con 92K+ jugadores (FASE 3)
- ✅ Autenticación con Supabase (FASE 4)
- ✅ Matchmaking con Redis (FASE 4)
- ✅ Validación de movimientos (FASE 4)
- ✅ Cálculo de ELO (FASE 4)

**FASE 6**: Frontend Next.js 15 con componentes de juego, auth, y UI  
**Componentes a implementar**: 25 componentes (6 game core + 6 auth + 13 layout/landing)

---

## 📖 Referencias

- `apps/partykit/README.md` - Guía completa de uso
- `Documentacion/Funcionales/Transversal/02_Flujo_Partida.md` - Spec funcional
- `Documentacion/Funcionales/Componentes/Backend/03_PartyKitGameRoom.md` - Spec técnica
- `Documentacion/Stack/README.md` - Decisiones de stack

---

**Estado Final**: ✅ **FASE 5 COMPLETADA Y LISTA PARA FASE 6**
