# Componente Frontend: ResultModal

## Descripción técnica
Modal que se muestra al finalizar una partida. Presenta el resultado (ganador/perdedor), razón del fin de la partida, cambio de ELO con animación, y la cadena completa de jugadores. Incluye botón para volver al menú principal.

## Ubicación
`app/components/game/ResultModal.tsx`

---

## Props Interface

```typescript
interface ResultModalProps {
  result: GameResult;
  chain: ChainNode[];
  onClose: () => void;
}

interface GameResult {
  winner: 'you' | 'opponent';
  reason: 'timeout' | 'disconnect' | 'resign';  // Solo se pierde por timeout, disconnect o resign
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

## Implementation

```tsx
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CountUp } from 'react-countup';
import { Dialog } from '@headlessui/react';

export function ResultModal({ result, chain, onClose }: ResultModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEloAnimation, setShowEloAnimation] = useState(false);

  // Abrir modal con delay para animación de transición
  useEffect(() => {
    setTimeout(() => setIsOpen(true), 500);
    setTimeout(() => setShowEloAnimation(true), 1500);
  }, []);

  const isWinner = result.winner === 'you';
  const reasonText = getReasonText(result.reason, isWinner);

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          open={isOpen}
          onClose={() => {}} // No permitir cerrar con Escape (forzar botón)
          className="relative z-50"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel
              as={motion.div}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="
                w-full max-w-lg
                bg-gray-900 rounded-2xl
                shadow-2xl border-2
                overflow-hidden
                ${isWinner ? 'border-green-500' : 'border-red-500'}
              "
            >
              {/* Header */}
              <div
                className={`
                  p-6 text-center
                  ${isWinner 
                    ? 'bg-gradient-to-b from-green-600/20 to-transparent' 
                    : 'bg-gradient-to-b from-red-600/20 to-transparent'
                  }
                `}
              >
                {/* Emoji animado */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="text-8xl mb-4"
                  role="img"
                  aria-label={isWinner ? 'Victory' : 'Defeat'}
                >
                  {isWinner ? '🏆' : '😔'}
                </motion.div>

                <Dialog.Title
                  as={motion.h2}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`
                    text-4xl font-bold mb-2
                    ${isWinner ? 'text-green-400' : 'text-red-400'}
                  `}
                >
                  {isWinner ? 'Victory!' : 'Defeat'}
                </Dialog.Title>

                <Dialog.Description
                  as={motion.p}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-400 text-sm"
                >
                  {reasonText}
                </Dialog.Description>
              </div>

              {/* ELO Change Section */}
              <div className="p-6 border-t border-gray-800">
                <ELOChangeDisplay
                  eloChange={result.eloChange}
                  showAnimation={showEloAnimation}
                />
              </div>

              {/* Chain Summary */}
              <div className="p-6 border-t border-gray-800">
                <ChainSummary chain={chain} />
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-gray-800">
                <button
                  onClick={onClose}
                  className="
                    w-full py-3 px-6
                    bg-blue-600 hover:bg-blue-500
                    text-white font-semibold rounded-lg
                    transition-colors
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
                  "
                  autoFocus
                >
                  Back to Menu
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

/**
 * ELO Change Display con animación CountUp
 */
function ELOChangeDisplay({
  eloChange,
  showAnimation
}: {
  eloChange: { before: number; after: number; delta: number };
  showAnimation: boolean;
}) {
  const isPositive = eloChange.delta >= 0;

  return (
    <div className="text-center">
      <p className="text-sm text-gray-400 mb-2">ELO Rating</p>

      <div className="flex items-center justify-center gap-4">
        {/* Before */}
        <div className="text-2xl font-bold text-gray-500">
          {eloChange.before}
        </div>

        {/* Arrow */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2 }}
          className="text-gray-600"
        >
          →
        </motion.div>

        {/* After (animated) */}
        <div className="text-3xl font-bold text-white">
          {showAnimation ? (
            <CountUp
              start={eloChange.before}
              end={eloChange.after}
              duration={1.5}
              useEasing={true}
              separator=","
            />
          ) : (
            eloChange.before
          )}
        </div>
      </div>

      {/* Delta Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.8 }}
        className="mt-4 inline-flex items-center gap-1"
      >
        <span
          className={`
            px-4 py-2 rounded-full text-xl font-bold
            ${isPositive 
              ? 'bg-green-600/20 text-green-400' 
              : 'bg-red-600/20 text-red-400'
            }
          `}
        >
          {isPositive ? '+' : ''}
          {eloChange.delta}
        </span>
      </motion.div>
    </div>
  );
}

/**
 * Chain Summary (lista compacta)
 */
function ChainSummary({ chain }: { chain: ChainNode[] }) {
  const [expanded, setExpanded] = useState(false);

  const displayChain = expanded ? chain : chain.slice(0, 5);
  const hasMore = chain.length > 5;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-300">
          Chain ({chain.length} players)
        </h3>
        
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {expanded ? 'Show less' : 'Show all'}
          </button>
        )}
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
        <AnimatePresence>
          {displayChain.map((node) => (
            <motion.div
              key={node.position}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-2 text-sm"
            >
              <span className="text-gray-500 font-mono w-8">
                #{node.position}
              </span>
              <span className="text-gray-300 flex-1 truncate">
                {node.playerName}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {!expanded && hasMore && (
          <p className="text-xs text-gray-500 text-center pt-2">
            +{chain.length - 5} more...
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Obtener texto descriptivo de la razón del fin
 */
function getReasonText(reason: string, isWinner: boolean): string {
  if (isWinner) {
    switch (reason) {
      case 'timeout':
        return 'Opponent ran out of time';
      case 'disconnect':
        return 'Opponent disconnected';
      case 'resign':
        return 'Opponent resigned';
      default:
        return 'You won the match!';
    }
  } else {
    switch (reason) {
      case 'timeout':
        return 'You ran out of time';
      case 'disconnect':
        return 'You disconnected';
      case 'resign':
        return 'You resigned';
      default:
        return 'You lost the match';
    }
  }
}
```

---

## Alternative: Native Dialog Element

Para mejor accesibilidad, usar `<dialog>` nativo:

```tsx
export function ResultModalNative({ result, chain, onClose }: ResultModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const handleClose = () => {
    dialogRef.current?.close();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="
        w-full max-w-lg
        bg-gray-900 rounded-2xl
        backdrop:bg-black/80 backdrop:backdrop-blur-sm
      "
    >
      {/* Content igual que arriba */}
      <button onClick={handleClose}>Back to Menu</button>
    </dialog>
  );
}
```

---

## Accessibility Features

### Focus Trap
El modal de Headless UI ya maneja focus trap, pero para `<dialog>` nativo:

```tsx
useEffect(() => {
  const dialog = dialogRef.current;
  if (!dialog) return;

  // Trap focus dentro del modal
  const focusableElements = dialog.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  dialog.addEventListener('keydown', handleTab);
  return () => dialog.removeEventListener('keydown', handleTab);
}, []);
```

### Screen Reader Announcements
```tsx
useEffect(() => {
  announceToScreenReader(
    result.winner === 'you' 
      ? 'Victory! You won the match' 
      : 'Defeat. You lost the match'
  );
}, []);
```

---

## Testing Requirements

```typescript
describe('ResultModal', () => {
  const mockResult: GameResult = {
    winner: 'you',
    reason: 'timeout',
    finalChain: [...],
    eloChange: {
      before: 1200,
      after: 1216,
      delta: 16
    }
  };

  it('should show victory state when winner is "you"', () => {
    render(<ResultModal result={mockResult} chain={[]} onClose={jest.fn()} />);
    
    expect(screen.getByText('Victory!')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Victory' })).toHaveTextContent('🏆');
  });

  it('should show defeat state when winner is "opponent"', () => {
    const defeatResult = { ...mockResult, winner: 'opponent' as const };
    render(<ResultModal result={defeatResult} chain={[]} onClose={jest.fn()} />);
    
    expect(screen.getByText('Defeat')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Defeat' })).toHaveTextContent('😔');
  });

  it('should display ELO change with animation', async () => {
    render(<ResultModal result={mockResult} chain={[]} onClose={jest.fn()} />);
    
    // Verificar que muestra before y after
    expect(screen.getByText('1200')).toBeInTheDocument();
    
    // Después de animación, debería mostrar 1216
    await waitFor(() => {
      expect(screen.getByText('1216')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display positive delta badge for ELO gain', () => {
    render(<ResultModal result={mockResult} chain={[]} onClose={jest.fn()} />);
    
    expect(screen.getByText('+16')).toBeInTheDocument();
  });

  it('should display negative delta badge for ELO loss', () => {
    const lossResult = {
      ...mockResult,
      winner: 'opponent' as const,
      eloChange: { before: 1200, after: 1184, delta: -16 }
    };
    render(<ResultModal result={lossResult} chain={[]} onClose={jest.fn()} />);
    
    expect(screen.getByText('-16')).toBeInTheDocument();
  });

  it('should show chain summary', () => {
    const chain = [
      { position: 1, playerId: '1', playerName: 'Messi', playedByUserId: 'user1' },
      { position: 2, playerId: '2', playerName: 'Busquets', playedByUserId: 'user2' }
    ];
    
    render(<ResultModal result={mockResult} chain={chain} onClose={jest.fn()} />);
    
    expect(screen.getByText('Chain (2 players)')).toBeInTheDocument();
    expect(screen.getByText('Messi')).toBeInTheDocument();
    expect(screen.getByText('Busquets')).toBeInTheDocument();
  });

  it('should call onClose when clicking Back to Menu', () => {
    const onClose = jest.fn();
    render(<ResultModal result={mockResult} chain={[]} onClose={onClose} />);
    
    const button = screen.getByRole('button', { name: /back to menu/i });
    fireEvent.click(button);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should expand chain when clicking "Show all"', async () => {
    const longChain = Array.from({ length: 10 }, (_, i) => ({
      position: i + 1,
      playerId: `${i + 1}`,
      playerName: `Player ${i + 1}`,
      playedByUserId: 'user1'
    }));
    
    render(<ResultModal result={mockResult} chain={longChain} onClose={jest.fn()} />);
    
    // Inicialmente solo muestra 5
    expect(screen.queryByText('Player 6')).not.toBeInTheDocument();
    
    // Click en "Show all"
    const expandBtn = screen.getByText('Show all');
    fireEvent.click(expandBtn);
    
    // Ahora muestra todos
    await waitFor(() => {
      expect(screen.getByText('Player 6')).toBeInTheDocument();
      expect(screen.getByText('Player 10')).toBeInTheDocument();
    });
  });

  it('should prevent closing with Escape key', () => {
    const onClose = jest.fn();
    render(<ResultModal result={mockResult} chain={[]} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should have proper ARIA attributes', () => {
    render(<ResultModal result={mockResult} chain={[]} onClose={jest.fn()} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    
    const title = screen.getByText('Victory!');
    expect(title).toHaveAttribute('role', 'heading');
  });
});
```

---

## Sound Effects Integration

```tsx
useEffect(() => {
  const sound = result.winner === 'you' 
    ? new Audio('/sounds/victory.mp3') 
    : new Audio('/sounds/defeat.mp3');
  
  sound.play().catch((err) => {
    console.warn('Could not play sound:', err);
  });
}, []);
```

---

## Confetti Effect (Victory Only)

```tsx
import confetti from 'canvas-confetti';

useEffect(() => {
  if (result.winner === 'you') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}, []);
```

---

## Dependencies

```json
{
  "@headlessui/react": "^2.2.0",
  "motion": "^12.0.0",
  "react-countup": "^6.5.0",
  "canvas-confetti": "^1.9.0"
}
```
