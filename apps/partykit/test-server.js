/**
 * Testing Server for PartyKit GameRoom
 * 
 * Este es un servidor de prueba temporal que simula PartyKit
 * para testing local en Windows (workaround para bug de rutas de PartyKit).
 * 
 * Uso:
 *   node test-server.js
 *   wscat -c "ws://localhost:1999/game-room/test-match-123?userId=user-1"
 */

import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const HTTP_PORT = 1999;
const rooms = new Map();

// Simulamos el estado de una room
class TestGameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.connections = new Map();
    this.state = {
      matchId: roomId,
      status: 'waiting',
      players: [],
      currentTurn: null,
      chain: [],
      timeLeft: 20,
    };
    this.timerId = null;
  }

  async onConnect(ws, userId) {
    console.log(`[${this.roomId}] Player ${userId} connecting...`);
    
    this.connections.set(userId, ws);
    
    // Simular carga de match desde DB
    if (this.state.players.length === 0) {
      // La primera conexión inicializa el estado con 2 slots vacíos
      this.state.players = [];
    }

    // Agregar jugador si no existe
    let player = this.state.players.find(p => p.id === userId);
    if (!player) {
      player = {
        id: userId,
        name: `Player ${this.state.players.length + 1}`,
        elo: 1500 + (this.state.players.length * 20),
        connected: false,
      };
      this.state.players.push(player);
      
      // Si es el primer jugador, inicializar la cadena
      if (this.state.players.length === 1) {
        this.state.chain = [
          { id: 'player-seed', name: 'Kylian Mbappé', addedBy: null },
        ];
      }
    }

    // Marcar jugador como conectado
    player.connected = true;

    // Enviar estado actual
    this.sendToConnection(userId, {
      type: 'game:state',
      data: this.state,
    });

    // Broadcast que el jugador se conectó
    this.broadcast({
      type: 'player:connected',
      data: { userId },
    }, userId);

    // Si ambos jugadores están conectados, iniciar juego
    if (this.state.players.length === 2 && this.state.players.every(p => p.connected) && this.state.status === 'waiting') {
      this.startGame();
    }
  }

  startGame() {
    console.log(`[${this.roomId}] Starting game...`);
    
    this.state.status = 'active';
    this.state.currentTurn = this.state.players[0].id;
    this.state.timeLeft = 20;

    this.broadcast({
      type: 'game:start',
      data: {
        currentTurn: this.state.currentTurn,
        timeLeft: this.state.timeLeft,
      },
    });

    this.startTimer();
  }

  startTimer() {
    this.timerId = setInterval(() => {
      this.state.timeLeft--;

      this.broadcast({
        type: 'game:turn',
        data: {
          currentTurn: this.state.currentTurn,
          timeLeft: this.state.timeLeft,
        },
      });

      if (this.state.timeLeft <= 0) {
        this.endGame('timeout');
      }
    }, 1000);
  }

  handleMove(userId, playerName) {
    console.log(`[${this.roomId}] Move from ${userId}: ${playerName}`);

    // Validaciones básicas
    if (this.state.currentTurn !== userId) {
      this.sendToConnection(userId, {
        type: 'game:move:invalid',
        data: { reason: 'Not your turn' },
      });
      return;
    }

    // En testing real, aquí validaríamos contra la BD
    // Por ahora aceptamos cualquier nombre
    const newNode = {
      id: `player-${this.state.chain.length}`,
      name: playerName,
      addedBy: userId,
    };

    this.state.chain.push(newNode);

    // Switch turn
    const currentIdx = this.state.players.findIndex(p => p.id === userId);
    const nextIdx = (currentIdx + 1) % this.state.players.length;
    this.state.currentTurn = this.state.players[nextIdx].id;
    this.state.timeLeft = 20;

    this.broadcast({
      type: 'game:move:valid',
      data: {
        player: newNode,
        nextTurn: this.state.currentTurn,
        chain: this.state.chain,
      },
    });
  }

  handleSurrender(userId) {
    console.log(`[${this.roomId}] Player ${userId} surrendered`);
    const winnerId = this.state.players.find(p => p.id !== userId)?.id;
    this.endGame('resign', winnerId);
  }

  endGame(reason, winnerId = null) {
    console.log(`[${this.roomId}] Game ended: ${reason}`);
    
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.state.status = 'finished';

    if (reason === 'timeout' && !winnerId) {
      const otherPlayerId = this.state.players.find(p => p.id !== this.state.currentTurn)?.id;
      winnerId = otherPlayerId;
    }

    this.broadcast({
      type: 'game:end',
      data: {
        reason,
        winnerId,
        chain: this.state.chain,
        eloChanges: {
          [winnerId]: 15,
          [this.state.players.find(p => p.id !== winnerId).id]: -15,
        },
      },
    });
  }

  onMessage(userId, message) {
    let event;
    try {
      event = JSON.parse(message);
    } catch {
      return;
    }

    console.log(`[${this.roomId}] Event from ${userId}:`, event.type);

    switch (event.type) {
      case 'player:move':
        this.handleMove(userId, event.data.playerName);
        break;
      case 'player:surrender':
        this.handleSurrender(userId);
        break;
      case 'ping':
        this.sendToConnection(userId, { type: 'pong' });
        break;
      default:
        console.log(`[${this.roomId}] Unknown event: ${event.type}`);
    }
  }

  onClose(userId) {
    console.log(`[${this.roomId}] Player ${userId} disconnected`);
    
    const player = this.state.players.find(p => p.id === userId);
    if (player) {
      player.connected = false;
    }

    this.broadcast({
      type: 'player:disconnected',
      data: { userId },
    }, userId);

    // En producción aquí iría el grace period de 10s
    // Para testing, simplemente terminamos el juego
    if (this.state.status === 'active') {
      setTimeout(() => {
        const stillDisconnected = !player.connected;
        if (stillDisconnected) {
          const otherPlayer = this.state.players.find(p => p.id !== userId);
          this.endGame('disconnect', otherPlayer?.id);
        }
      }, 10000);
    }
  }

  sendToConnection(userId, message) {
    const ws = this.connections.get(userId);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(message));
    }
  }

  broadcast(message, excludeUserId = null) {
    const json = JSON.stringify(message);
    this.connections.forEach((ws, userId) => {
      if (userId !== excludeUserId && ws.readyState === 1) {
        ws.send(json);
      }
    });
  }
}

// HTTP Server para health check
const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('PartyKit Test Server - Use WebSocket connections to /game-room/:roomId?userId=:userId');
  }
});

// WebSocket Server
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost:${HTTP_PORT}`);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Esperamos: /game-room/:roomId
  if (pathParts[0] !== 'game-room' || !pathParts[1]) {
    ws.close(1002, 'Invalid path. Use: /game-room/:roomId?userId=:userId');
    return;
  }

  const roomId = pathParts[1];
  const userId = url.searchParams.get('userId');

  if (!userId) {
    ws.close(1002, 'Missing userId query parameter');
    return;
  }

  console.log(`\n[SERVER] New connection to room ${roomId} from user ${userId}`);

  // Crear room si no existe
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new TestGameRoom(roomId));
  }

  const room = rooms.get(roomId);

  // Handle connection
  room.onConnect(ws, userId);

  ws.on('message', (data) => {
    room.onMessage(userId, data.toString());
  });

  ws.on('close', () => {
    room.onClose(userId);
    room.connections.delete(userId);

    // Limpiar room vacía después de 30s
    if (room.connections.size === 0) {
      setTimeout(() => {
        if (room.connections.size === 0) {
          rooms.delete(roomId);
          console.log(`[SERVER] Room ${roomId} cleaned up`);
        }
      }, 30000);
    }
  });

  ws.on('error', (error) => {
    console.error(`[SERVER] WebSocket error for ${userId}:`, error);
  });
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`
╭─────────────────────────────────────────────────────────────╮
│  🎮 PartyKit Test Server Running                            │
│                                                              │
│  HTTP:      http://localhost:${HTTP_PORT}                     │
│  WebSocket: ws://localhost:${HTTP_PORT}/game-room/:roomId      │
│                                                              │
│  Testing:                                                    │
│    wscat -c "ws://localhost:${HTTP_PORT}/game-room/test-1?userId=user-1"  │
│    wscat -c "ws://localhost:${HTTP_PORT}/game-room/test-1?userId=user-2"  │
│                                                              │
│  Health: curl http://localhost:${HTTP_PORT}/health            │
╰─────────────────────────────────────────────────────────────╯
`);
});
