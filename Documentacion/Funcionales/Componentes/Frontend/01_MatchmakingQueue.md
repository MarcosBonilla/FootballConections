# Componente Frontend: MatchmakingQueue

## Descripción técnica
Componente que maneja la cola de matchmaking completa: entrada a cola, visualización del estado de búsqueda, contador de tiempo, expansión de rango ELO, y transición a partida cuando se encuentra oponente.

## Ubicación
`app/components/matchmaking/MatchmakingQueue.tsx`

---

## Props Interface

```typescript
interface MatchmakingQueueProps {
  userId: string;
  currentElo: number;
  onMatchFound: (matchId: string, opponentData: OpponentData) => void;
  onCancel: () => void;
}

interface OpponentData {
  username: string;
  elo: number;
  userId: string;
}
```

---

## State Management (Zustand Store)

**Store**: `stores/matchmakingStore.ts`

```typescript
interface MatchmakingState {
  status: 'idle' | 'searching' | 'found' | 'timeout' | 'error';
  queuedAt: Date | null;
  elapsedSeconds: number;
  currentRange: number;  // ±50, ±75, ±100, ±150
  opponent: OpponentData | null;
  errorMessage: string | null;
  
  // Actions
  startSearch: (userId: string, elo: number) => Promise<void>;
  cancelSearch: () => Promise<void>;
  updateElapsedTime: () => void;
  setOpponent: (opponent: OpponentData) => void;
  reset: () => void;
}
```

### Store Implementation
```typescript
export const useMatchmakingStore = create<MatchmakingState>((set, get) => ({
  status: 'idle',
  queuedAt: null,
  elapsedSeconds: 0,
  currentRange: 50,
  opponent: null,
  errorMessage: null,

  startSearch: async (userId, elo) => {
    try {
      const response = await fetch('/api/matchmaking/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, elo })
      });
      
      if (!response.ok) throw new Error('Failed to join queue');
      
      set({ 
        status: 'searching', 
        queuedAt: new Date(),
        elapsedSeconds: 0,
        currentRange: 50 
      });
    } catch (error) {
      set({ status: 'error', errorMessage: error.message });
    }
  },

  cancelSearch: async () => {
    const response = await fetch('/api/matchmaking/leave', { method: 'POST' });
    if (response.ok) {
      get().reset();
    }
  },

  updateElapsedTime: () => {
    const { queuedAt, elapsedSeconds } = get();
    if (!queuedAt) return;
    
    const newElapsed = Math.floor((Date.now() - queuedAt.getTime()) / 1000);
    const newRange = calculateRange(newElapsed);
    
    set({ elapsedSeconds: newElapsed, currentRange: newRange });
    
    // Timeout después de 60s
    if (newElapsed >= 60) {
      set({ status: 'timeout' });
    }
  },

  setOpponent: (opponent) => {
    set({ status: 'found', opponent });
  },

  reset: () => {
    set({
      status: 'idle',
      queuedAt: null,
      elapsedSeconds: 0,
      currentRange: 50,
      opponent: null,
      errorMessage: null
    });
  }
}));

// Calcular rango según tiempo
function calculateRange(seconds: number): number {
  if (seconds < 5) return 50;
  if (seconds < 10) return 75;
  if (seconds < 15) return 100;
  return 150;
}
```

---

## WebSocket Integration

**Hook**: `hooks/useMatchmakingWebSocket.ts`

```typescript
export function useMatchmakingWebSocket(userId: string) {
  const setOpponent = useMatchmakingStore(state => state.setOpponent);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Conectar a WebSocket global (no específico de match)
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/user/${userId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'match_found') {
        setOpponent({
          username: message.opponent_username,
          elo: message.opponent_elo,
          userId: message.opponent_user_id
        });
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [userId]);

  return wsRef;
}
```

---

## Component Structure

```tsx
'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMatchmakingStore } from '@/stores/matchmakingStore';
import { useMatchmakingWebSocket } from '@/hooks/useMatchmakingWebSocket';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

export function MatchmakingQueue({ 
  userId, 
  currentElo, 
  onMatchFound, 
  onCancel 
}: MatchmakingQueueProps) {
  const { 
    status, 
    elapsedSeconds, 
    currentRange, 
    opponent,
    startSearch,
    cancelSearch,
    updateElapsedTime,
    reset
  } = useMatchmakingStore();

  // WebSocket listener
  useMatchmakingWebSocket(userId);

  // Timer interval
  useEffect(() => {
    if (status !== 'searching') return;

    const interval = setInterval(() => {
      updateElapsedTime();
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Efecto cuando se encuentra match
  useEffect(() => {
    if (status === 'found' && opponent) {
      setTimeout(() => {
        onMatchFound(opponent.matchId, opponent);
        reset();
      }, 1500); // 1.5s delay para mostrar animación
    }
  }, [status, opponent]);

  // Entrada a la cola
  useEffect(() => {
    startSearch(userId, currentElo);
  }, []);

  const handleCancel = async () => {
    await cancelSearch();
    onCancel();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <AnimatePresence mode="wait">
        {status === 'searching' && (
          <SearchingState 
            elapsedSeconds={elapsedSeconds}
            currentRange={currentRange}
            onCancel={handleCancel}
          />
        )}
        
        {status === 'found' && opponent && (
          <MatchFoundState opponent={opponent} />
        )}
        
        {status === 'timeout' && (
          <TimeoutState onRetry={() => startSearch(userId, currentElo)} />
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

## Sub-components

### SearchingState
```tsx
function SearchingState({ 
  elapsedSeconds, 
  currentRange, 
  onCancel 
}: {
  elapsedSeconds: number;
  currentRange: number;
  onCancel: () => void;
}) {
  return (
    <motion.div
      key="searching"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center gap-8 text-center"
    >
      <Spinner size="lg" />
      
      <div>
        <h2 className="text-2xl font-bold mb-2">
          Buscando oponente
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            ...
          </motion.span>
        </h2>
        <p className="text-gray-400">
          Rango: ±{currentRange} ELO
        </p>
      </div>

      <div 
        className="text-4xl font-mono tabular-nums"
        role="timer"
        aria-live="polite"
      >
        {formatTime(elapsedSeconds)}
      </div>

      <Button
        variant="outline"
        onClick={onCancel}
        aria-label="Cancelar búsqueda de oponente"
      >
        Cancelar
      </Button>
    </motion.div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

### MatchFoundState
```tsx
function MatchFoundState({ opponent }: { opponent: OpponentData }) {
  return (
    <motion.div
      key="found"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-6"
      role="alert"
      aria-live="assertive"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.5 }}
        className="text-6xl"
      >
        🎮
      </motion.div>
      
      <div className="text-center">
        <h2 className="text-3xl font-bold text-green-500 mb-2">
          ¡Oponente encontrado!
        </h2>
        <p className="text-xl text-gray-300">
          {opponent.username}
        </p>
        <p className="text-gray-400">
          {opponent.elo} ELO
        </p>
      </div>
    </motion.div>
  );
}
```

### TimeoutState
```tsx
function TimeoutState({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      key="timeout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <div className="text-6xl">⏰</div>
      
      <div>
        <h2 className="text-2xl font-bold mb-2">
          No hay oponentes disponibles
        </h2>
        <p className="text-gray-400">
          Intenta de nuevo en unos minutos
        </p>
      </div>

      <Button onClick={onRetry}>
        Reintentar
      </Button>
    </motion.div>
  );
}
```

---

## Testing Requirements

### Unit Tests
```typescript
describe('MatchmakingQueue', () => {
  it('should start search on mount', async () => {
    // Mock API
    // Render component
    // Verify /api/matchmaking/join called
  });

  it('should increment timer every second', () => {
    // Mock Date.now()
    // Advance timers
    // Verify elapsed seconds updates
  });

  it('should expand range every 5 seconds', () => {
    // Advance timer to 5s, 10s, 15s
    // Verify currentRange: 50 → 75 → 100 → 150
  });

  it('should timeout after 60 seconds', () => {
    // Advance timer to 60s
    // Verify status === 'timeout'
  });

  it('should call onMatchFound when opponent found', () => {
    // Mock WebSocket message 'match_found'
    // Verify onMatchFound callback
  });

  it('should cancel search and call onCancel', async () => {
    // Click cancel button
    // Verify /api/matchmaking/leave called
    // Verify onCancel callback
  });
});
```

---

## Accessibility Checklist

- [ ] Timer tiene `role="timer"` y `aria-live="polite"`
- [ ] Estado "Match found" tiene `role="alert"` y `aria-live="assertive"`
- [ ] Botón cancelar tiene `aria-label` descriptivo
- [ ] Spinner tiene texto alternativo para screen readers
- [ ] Animaciones respetan `prefers-reduced-motion`
- [ ] Focus management: al cancelar, focus vuelve al botón "Play"

---

## Performance Considerations

- Usar `setInterval` estable, no actualizar en cada render
- WebSocket connection pool (no crear nueva conexión por cada componente)
- Debounce de actualizaciones del timer si el componente re-renderiza
- Cleanup de interval y WebSocket en unmount

---

## Dependencies

```json
{
  "motion": "^12.0.0",
  "zustand": "^5.0.0"
}
```
