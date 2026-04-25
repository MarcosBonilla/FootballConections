# Componente Frontend: GameTimer

## Descripción técnica
Timer visual que muestra los segundos restantes del turno actual. Cambia de color cuando quedan menos de 5 segundos (warning state) y incluye animación de pulso para urgencia.

## Ubicación
`app/components/game/GameTimer.tsx`

---

## Props Interface

```typescript
interface GameTimerProps {
  seconds: number;
  color: 'white' | 'red';
  isMyTurn: boolean;
}
```

---

## Implementation

```tsx
'use client';

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

export function GameTimer({ seconds, color, isMyTurn }: GameTimerProps) {
  const [localSeconds, setLocalSeconds] = useState(seconds);
  
  // Sincronizar con prop (viene del WebSocket)
  useEffect(() => {
    setLocalSeconds(seconds);
  }, [seconds]);

  // Formato: "20s" o "05s"
  const displayText = `${localSeconds}s`;
  
  // Estados visuales
  const isWarning = localSeconds < 5;
  const isPulse = isWarning && isMyTurn;

  return (
    <div className="flex items-center justify-center">
      <motion.div
        animate={isPulse ? {
          scale: [1, 1.1, 1],
          opacity: [1, 0.8, 1]
        } : {}}
        transition={{
          duration: 1,
          repeat: isPulse ? Infinity : 0,
          ease: 'easeInOut'
        }}
        className={`
          relative
          flex items-center justify-center
          w-24 h-24 md:w-28 md:h-28
          rounded-full
          font-mono text-3xl md:text-4xl font-bold
          transition-colors duration-300
          ${color === 'red' 
            ? 'bg-red-600 text-white border-4 border-red-400' 
            : 'bg-gray-800 text-white border-4 border-gray-600'
          }
        `}
        role="timer"
        aria-live="polite"
        aria-label={`${localSeconds} seconds remaining`}
      >
        {displayText}
        
        {/* Anillo de progreso circular */}
        <svg
          className="absolute top-0 left-0 w-full h-full -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={color === 'red' ? '#ef4444' : '#4b5563'}
            strokeWidth="2"
            opacity="0.2"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={color === 'red' ? '#f87171' : '#9ca3af'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 46}
            initial={{ strokeDashoffset: 0 }}
            animate={{
              strokeDashoffset: 2 * Math.PI * 46 * (1 - localSeconds / 20)
            }}
            transition={{ duration: 0.5 }}
          />
        </svg>
      </motion.div>
      
      {/* Label de turno */}
      <div className="ml-4 text-sm md:text-base">
        {isMyTurn ? (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-blue-400 font-medium"
          >
            Your turn
          </motion.span>
        ) : (
          <span className="text-gray-400">
            Opponent's turn
          </span>
        )}
      </div>
    </div>
  );
}
```

---

## Animation Variants

Para transiciones más avanzadas, crear variantes reutilizables:

```typescript
const timerVariants = {
  normal: {
    scale: 1,
    opacity: 1
  },
  warning: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.9, 1],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

// Usage
<motion.div
  variants={timerVariants}
  animate={isWarning ? 'warning' : 'normal'}
>
```

---

## Accessibility Features

### Screen Reader Announcements
```tsx
// Anunciar cuando quedan 5 segundos
useEffect(() => {
  if (localSeconds === 5 && isMyTurn) {
    announceToScreenReader('5 seconds remaining!');
  }
}, [localSeconds, isMyTurn]);

function announceToScreenReader(message: string) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'assertive');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}
```

### Reduced Motion
```tsx
import { useReducedMotion } from 'motion/react';

export function GameTimer({ seconds, color, isMyTurn }: GameTimerProps) {
  const shouldReduceMotion = useReducedMotion();
  
  const pulseAnimation = shouldReduceMotion ? {} : {
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1]
  };
  
  return (
    <motion.div
      animate={isPulse ? pulseAnimation : {}}
      // ...
    />
  );
}
```

---

## Testing Requirements

```typescript
describe('GameTimer', () => {
  it('should display seconds correctly', () => {
    render(<GameTimer seconds={15} color="white" isMyTurn={true} />);
    expect(screen.getByRole('timer')).toHaveTextContent('15s');
  });

  it('should change to red when < 5 seconds', () => {
    const { rerender } = render(
      <GameTimer seconds={10} color="white" isMyTurn={true} />
    );
    
    rerender(<GameTimer seconds={4} color="red" isMyTurn={true} />);
    
    const timer = screen.getByRole('timer');
    expect(timer).toHaveClass('bg-red-600');
  });

  it('should pulse when warning and my turn', () => {
    render(<GameTimer seconds={3} color="red" isMyTurn={true} />);
    
    const timer = screen.getByRole('timer');
    // Verify animation is applied (motion component)
  });

  it('should not pulse when warning but opponent turn', () => {
    render(<GameTimer seconds={3} color="red" isMyTurn={false} />);
    
    // Verify no pulse animation
  });

  it('should update aria-label with current seconds', () => {
    render(<GameTimer seconds={10} color="white" isMyTurn={true} />);
    
    const timer = screen.getByRole('timer');
    expect(timer).toHaveAccessibleName('10 seconds remaining');
  });

  it('should show "Your turn" when isMyTurn is true', () => {
    render(<GameTimer seconds={15} color="white" isMyTurn={true} />);
    expect(screen.getByText('Your turn')).toBeInTheDocument();
  });

  it('should show "Opponent\'s turn" when isMyTurn is false', () => {
    render(<GameTimer seconds={15} color="white" isMyTurn={false} />);
    expect(screen.getByText("Opponent's turn")).toBeInTheDocument();
  });
});
```

---

## Styling Variants

### Alternative: Minimalist
```tsx
<div className="flex flex-col items-center">
  <span className="text-6xl font-bold tabular-nums">{displayText}</span>
  <span className="text-sm text-gray-400 mt-1">seconds left</span>
</div>
```

### Alternative: Progress Bar
```tsx
<div className="w-full max-w-xs">
  <div className="flex justify-between mb-2">
    <span className="text-2xl font-bold">{displayText}</span>
    <span className="text-sm text-gray-400">{isMyTurn ? 'Your turn' : 'Opponent'}</span>
  </div>
  
  <motion.div 
    className="h-3 bg-gray-800 rounded-full overflow-hidden"
  >
    <motion.div
      className={`h-full ${color === 'red' ? 'bg-red-500' : 'bg-blue-500'}`}
      initial={{ width: '100%' }}
      animate={{ width: `${(localSeconds / 20) * 100}%` }}
      transition={{ duration: 0.5 }}
    />
  </motion.div>
</div>
```

---

## Performance Considerations

- No usar `setInterval` interno — el timer global del GameBoard actualiza la prop `seconds`
- Animación CSS + Framer Motion optimizada (GPU-accelerated)
- Usar `tabular-nums` para evitar layout shift al cambiar dígitos
- Memoizar para evitar re-renders innecesarios si otros props del GameBoard cambian

```tsx
import { memo } from 'react';

export const GameTimer = memo(function GameTimer({ seconds, color, isMyTurn }: GameTimerProps) {
  // Implementation
}, (prevProps, nextProps) => {
  return (
    prevProps.seconds === nextProps.seconds &&
    prevProps.color === nextProps.color &&
    prevProps.isMyTurn === nextProps.isMyTurn
  );
});
```

---

## Sound Integration (Optional)

Para feedback audible:

```tsx
import { useEffect, useRef } from 'react';

export function GameTimer({ seconds, color, isMyTurn }: GameTimerProps) {
  const tickSound = useRef<HTMLAudioElement | null>(null);
  const warningSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    tickSound.current = new Audio('/sounds/tick.mp3');
    warningSound.current = new Audio('/sounds/warning.mp3');
  }, []);

  useEffect(() => {
    if (!isMyTurn) return;
    
    if (seconds <= 5 && seconds > 0) {
      tickSound.current?.play();
    }
    
    if (seconds === 5) {
      warningSound.current?.play();
    }
  }, [seconds, isMyTurn]);

  // Rest of component...
}
```

---

## Dependencies

```json
{
  "motion": "^12.0.0"
}
```
