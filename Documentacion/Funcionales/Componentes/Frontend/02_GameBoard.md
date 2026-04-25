# Componente Frontend: GameBoard

## Descripción técnica
Componente principal del juego que orquesta todos los sub-componentes: timer, input de jugador, autocompletado, cadena visual, y manejo de turnos. Es el contenedor central de la partida.

## Ubicación
`app/components/game/GameBoard.tsx`

---

## Props Interface

```typescript
interface GameBoardProps {
  matchId: string;
  userId: string;
  onGameOver: (result: GameResult) => void;
}

interface GameResult {
  winner: 'you' | 'opponent';
  reason: 'timeout' | 'disconnect' | 'resign';  // NO permite 'invalid_answer'
  finalChain: ChainNode[];
  eloChange: {
    before: number;
    after: number;
    delta: number;
  };
}

interface ChainNode {
  position: number;
  playerId: string;
  playerName: string;
  playedByUserId: string;
}
```

---

## State Management (Zustand Store)

**Store**: `stores/gameStore.ts`

```typescript
interface GameState {
  // Match data
  matchId: string | null;
  player1: PlayerData;
  player2: PlayerData;
  
  // Turn state
  currentPlayerId: string;
  isMyTurn: boolean;
  
  // Chain state
  currentChainPlayer: { playerId: string; playerName: string; };
  chain: ChainNode[];
  
  // Timer
  secondsRemaining: number;
  timerColor: 'white' | 'red';
  
  // Game status
  status: 'loading' | 'active' | 'finished';
  result: GameResult | null;
  
  // Actions
  initGame: (matchData: MatchData) => void;
  addToChain: (node: ChainNode) => void;
  updateTimer: (seconds: number) => void;
  endGame: (result: GameResult) => void;
  reset: () => void;
}

interface PlayerData {
  userId: string;
  username: string;
  elo: number;
}

interface MatchData {
  matchId: string;
  player1: PlayerData;
  player2: PlayerData;
  currentPlayerId: string;
  currentChainPlayer: { playerId: string; playerName: string; };
  chain: ChainNode[];
  turnDeadline: string; // ISO timestamp
}
```

### Store Implementation
```typescript
export const useGameStore = create<GameState>((set, get) => ({
  matchId: null,
  player1: null,
  player2: null,
  currentPlayerId: '',
  isMyTurn: false,
  currentChainPlayer: null,
  chain: [],
  secondsRemaining: 20,
  timerColor: 'white',
  status: 'loading',
  result: null,

  initGame: (matchData) => {
    const myUserId = /* get from auth */;
    set({
      matchId: matchData.matchId,
      player1: matchData.player1,
      player2: matchData.player2,
      currentPlayerId: matchData.currentPlayerId,
      isMyTurn: matchData.currentPlayerId === myUserId,
      currentChainPlayer: matchData.currentChainPlayer,
      chain: matchData.chain,
      secondsRemaining: calculateSecondsRemaining(matchData.turnDeadline),
      status: 'active'
    });
  },

  addToChain: (node) => {
    set(state => ({
      chain: [...state.chain, node],
      currentChainPlayer: { playerId: node.playerId, playerName: node.playerName }
    }));
  },

  updateTimer: (seconds) => {
    set({
      secondsRemaining: seconds,
      timerColor: seconds < 5 ? 'red' : 'white'
    });
  },

  endGame: (result) => {
    set({ status: 'finished', result });
  },

  reset: () => {
    set({
      matchId: null,
      player1: null,
      player2: null,
      currentPlayerId: '',
      isMyTurn: false,
      currentChainPlayer: null,
      chain: [],
      secondsRemaining: 20,
      timerColor: 'white',
      status: 'loading',
      result: null
    });
  }
}));

function calculateSecondsRemaining(deadline: string): number {
  const deadlineMs = new Date(deadline).getTime();
  const nowMs = Date.now();
  return Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
}
```

---

## WebSocket Integration

**Hook**: `hooks/useGameWebSocket.ts`

```typescript
export function useGameWebSocket(matchId: string) {
  const { initGame, addToChain, updateTimer, endGame } = useGameStore();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_PARTYKIT_URL}/match/${matchId}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to game room');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'game_state':
          initGame(message.match);
          break;

        case 'turn_valid':
          addToChain({
            position: message.position,
            playerId: message.player_id,
            playerName: message.player_name,
            playedByUserId: message.played_by_user_id
          });
          // Actualizar turno
          useGameStore.setState({
            currentPlayerId: message.next_player_id,
            isMyTurn: message.next_player_id === /* myUserId */,
            secondsRemaining: 20
          });
          break;

        case 'invalid_attempt':
          // Respuesta inválida → NO termina el juego
          // Solo muestra error y el jugador puede seguir intentando
          toast.error(message.error_message, {
            duration: 3000,
            icon: '❌'
          });
          // El input permanece habilitado, el timer sigue corriendo
          break;

        case 'rival_invalid_attempt':
          // El rival intentó algo inválido → mostrar en tiempo real
          toast.warning(`Rival intentó: "${message.input}" - No válido`, {
            duration: 2000,
            icon: '👀',
            style: { background: '#fbbf24' }
          });
          break;

        case 'game_over':
          endGame({
            winner: message.winner_user_id === /* myUserId */ ? 'you' : 'opponent',
            reason: message.reason,
            finalChain: message.final_chain,
            eloChange: message.elo_changes[/* myUserId */]
          });
          break;

        case 'opponent_disconnected':
          toast.warning(`Oponente desconectado. Reconexión en ${message.grace_period_seconds}s...`);
          break;

        case 'opponent_reconnected':
          toast.success('Oponente reconectado');
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error('Error de conexión');
    };

    ws.onclose = () => {
      console.log('Disconnected from game room');
      // Intentar reconectar con exponential backoff
      attemptReconnect(matchId);
    };

    return () => {
      ws.close();
    };
  }, [matchId]);

  const sendPlay = (inputText: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'play',
        input_text: inputText,
        timestamp: new Date().toISOString()
      }));
    }
  };

  const sendLeave = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave' }));
    }
  };

  return { sendPlay, sendLeave };
}
```

---

## Component Structure

```tsx
'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useGameWebSocket } from '@/hooks/useGameWebSocket';
import { GameTimer } from './GameTimer';
import { PlayerInput } from './PlayerInput';
import { ChainDisplay } from './ChainDisplay';
import { LeaveButton } from './LeaveButton';
import { ResultModal } from './ResultModal';

export function GameBoard({ matchId, userId, onGameOver }: GameBoardProps) {
  const {
    status,
    isMyTurn,
    currentChainPlayer,
    chain,
    secondsRemaining,
    timerColor,
    result
  } = useGameStore();

  const { sendPlay, sendLeave } = useGameWebSocket(matchId);

  // Client-side timer sync
  useEffect(() => {
    if (status !== 'active') return;

    const interval = setInterval(() => {
      const newSeconds = useGameStore.getState().secondsRemaining - 1;
      if (newSeconds >= 0) {
        useGameStore.getState().updateTimer(newSeconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Game over effect
  useEffect(() => {
    if (status === 'finished' && result) {
      setTimeout(() => {
        onGameOver(result);
      }, 2000); // 2s para ver animación antes de modal
    }
  }, [status, result]);

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col items-center justify-between min-h-screen p-4 md:p-8">
      {/* Header con timer */}
      <div className="w-full max-w-2xl mb-8">
        <GameTimer 
          seconds={secondsRemaining}
          color={timerColor}
          isMyTurn={isMyTurn}
        />
      </div>

      {/* Current Player Display */}
      <div className="mb-8 text-center">
        <h1 className="text-5xl md:text-7xl font-bold">
          {currentChainPlayer?.playerName || 'Loading...'}
        </h1>
      </div>

      {/* Input Area */}
      <div className="w-full max-w-xl mb-8">
        <PlayerInput
          disabled={!isMyTurn}
          currentChainPlayerId={currentChainPlayer?.playerId}
          onSubmit={sendPlay}
        />
      </div>

      {/* Chain Display */}
      <div className="w-full max-w-2xl mb-8">
        <ChainDisplay chain={chain} userId={userId} />
      </div>

      {/* Leave Button */}
      <LeaveButton onLeave={sendLeave} />

      {/* Result Modal */}
      {status === 'finished' && result && (
        <ResultModal result={result} chain={chain} />
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="spinner mb-4" />
        <p>Cargando partida...</p>
      </div>
    </div>
  );
}
```

---

## Integration with Sub-components

El GameBoard integra estos componentes:

1. **GameTimer** (`./GameTimer.tsx`) — especificado en `04_GameTimer.md`
2. **PlayerInput** (`./PlayerInput.tsx`) — especificado en `03_PlayerAutocomplete.md`
3. **ChainDisplay** (`./ChainDisplay.tsx`) — especificado en `05_ChainDisplay.md`
4. **ResultModal** (`./ResultModal.tsx`) — especificado en `06_ResultModal.md`
5. **LeaveButton** (`./LeaveButton.tsx`) — botón simple con confirmación

---

## Error Handling

```typescript
// En useGameWebSocket
function attemptReconnect(matchId: string, attempt = 1) {
  if (attempt > 5) {
    toast.error('No se pudo reconectar. Por favor recarga la página.');
    return;
  }

  const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // exponential backoff

  setTimeout(() => {
    console.log(`Reconnection attempt ${attempt}`);
    // Re-ejecutar useGameWebSocket logic
    // Si falla, llamar attemptReconnect(matchId, attempt + 1)
  }, delay);
}
```

---

## Testing Requirements

### Integration Tests
```typescript
describe('GameBoard', () => {
  it('should initialize game state from WebSocket', async () => {
    // Mock WebSocket message 'game_state'
    // Verify store populated correctly
  });

  it('should enable input when it is my turn', () => {
    // Set isMyTurn: true
    // Verify PlayerInput not disabled
  });

  it('should disable input when it is opponent turn', () => {
    // Set isMyTurn: false
    // Verify PlayerInput disabled
  });

  it('should add player to chain when turn_valid received', () => {
    // Mock WebSocket 'turn_valid' message
    // Verify chain updated in store
    // Verify ChainDisplay re-renders
  });

  it('should show result modal when game ends', () => {
    // Mock 'game_over' message
    // Verify ResultModal appears
  });

  it('should countdown timer every second', () => {
    // Mock timer at 20s
    // Advance 1s
    // Verify timer shows 19s
  });

  it('should attempt reconnect on WebSocket close', () => {
    // Close WebSocket
    // Verify reconnection attempted with backoff
  });
});
```

---

## Accessibility Checklist

- [ ] Timer anunciado con `aria-live` cuando < 5s
- [ ] Turno actual anunciado ("Your turn" / "Opponent's turn")
- [ ] Nuevos jugadores en cadena anunciados dinámicamente
- [ ] Focus management entre turnos
- [ ] Modal de resultado tiene focus trap
- [ ] Botón Leave tiene confirmación accesible

---

## Performance Considerations

- Memoizar ChainDisplay para evitar re-renders innecesarios
- Virtualización si la cadena supera 50 jugadores (muy raro, pero posible)
- WebSocket message batching si llegan múltiples mensajes simultáneos
- Optimistic updates para submit (mostrar player inmediatamente, validar después)

---

## Dependencies

```json
{
  "motion": "^12.0.0",
  "zustand": "^5.0.0",
  "sonner": "^2.0.0"
}
```
