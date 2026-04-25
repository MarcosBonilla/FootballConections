# Componente Frontend: ChainDisplay

## Descripción técnica
Componente que renderiza la cadena completa de jugadores usados en la partida. Muestra cada jugador con su posición en la cadena, quién lo jugó, y animaciones al agregar nuevos nodos.

## Ubicación
`app/components/game/ChainDisplay.tsx`

---

## Props Interface

```typescript
interface ChainDisplayProps {
  chain: ChainNode[];
  userId: string; // Current user ID para distinguir jugadas propias vs oponente
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

import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useRef } from 'react';

export function ChainDisplay({ chain, userId }: ChainDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último elemento cuando se agrega nuevo nodo
  useEffect(() => {
    if (containerRef.current && chain.length > 0) {
      const lastElement = containerRef.current.lastElementChild;
      lastElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chain.length]);

  if (chain.length === 0) {
    return (
      <div 
        className="text-center text-gray-500 py-8"
        role="status"
        aria-live="polite"
      >
        Chain will appear here...
      </div>
    );
  }

  return (
    <div 
      className="w-full"
      role="list"
      aria-label="Player chain"
    >
      <h3 className="text-xl font-semibold mb-4 text-gray-300">
        Chain ({chain.length} players)
      </h3>

      <div
        ref={containerRef}
        className="
          max-h-96 overflow-y-auto
          bg-gray-900/50 rounded-lg p-4
          space-y-2
          scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent
        "
      >
        <AnimatePresence initial={false}>
          {chain.map((node, index) => (
            <ChainNode
              key={node.position}
              node={node}
              isMyPlay={node.playedByUserId === userId}
              isLast={index === chain.length - 1}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Single node en la cadena
 */
function ChainNode({
  node,
  isMyPlay,
  isLast
}: {
  node: ChainNode;
  isMyPlay: boolean;
  isLast: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{
        duration: 0.3,
        type: 'spring',
        stiffness: 300,
        damping: 25
      }}
      className={`
        flex items-center gap-3 p-3 rounded-lg
        transition-colors
        ${isLast 
          ? 'bg-blue-600/20 border-2 border-blue-500' 
          : 'bg-gray-800/50 border border-gray-700'
        }
        ${isMyPlay ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}
      `}
      role="listitem"
      aria-label={`Position ${node.position}: ${node.playerName}, played by ${isMyPlay ? 'you' : 'opponent'}`}
    >
      {/* Position badge */}
      <div 
        className="
          flex-shrink-0
          w-8 h-8
          flex items-center justify-center
          bg-gray-700 rounded-full
          text-sm font-bold text-gray-300
        "
        aria-hidden="true"
      >
        {node.position}
      </div>

      {/* Player name */}
      <div className="flex-1 min-w-0">
        <p className="text-lg font-medium text-white truncate">
          {node.playerName}
        </p>
        <p className="text-xs text-gray-400">
          {isMyPlay ? 'You' : 'Opponent'}
        </p>
      </div>

      {/* Indicator icon */}
      <div 
        className="flex-shrink-0"
        aria-hidden="true"
      >
        {isMyPlay ? (
          <CheckIcon className="w-5 h-5 text-green-500" />
        ) : (
          <XIcon className="w-5 h-5 text-red-500" />
        )}
      </div>

      {/* "Latest" badge para último nodo */}
      {isLast && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="
            absolute -top-2 -right-2
            px-2 py-0.5
            bg-blue-500 text-white text-xs font-bold rounded-full
          "
        >
          Latest
        </motion.span>
      )}
    </motion.div>
  );
}

// Icons (usar heroicons o similar)
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
```

---

## Alternative Layout: Horizontal Scroll

Para pantallas grandes, cadena horizontal tipo timeline:

```tsx
export function ChainDisplayHorizontal({ chain, userId }: ChainDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        left: containerRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  }, [chain.length]);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="
          flex gap-4 overflow-x-auto
          py-4 px-2
          scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent
        "
      >
        {chain.map((node, index) => (
          <motion.div
            key={node.position}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="
              flex-shrink-0
              w-32 p-3 rounded-lg
              bg-gray-800 border border-gray-700
              text-center
            "
          >
            <div className="text-sm text-gray-400 mb-1">#{node.position}</div>
            <div className="text-sm font-medium text-white truncate">
              {node.playerName}
            </div>
            
            {/* Arrow connector */}
            {index < chain.length - 1 && (
              <div className="absolute top-1/2 -right-6 -translate-y-1/2">
                <ArrowRightIcon className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

---

## Accessibility Features

### Live Region Announcements
```tsx
// Anunciar cuando se agrega nuevo jugador
useEffect(() => {
  if (chain.length === 0) return;
  
  const lastNode = chain[chain.length - 1];
  const isMyPlay = lastNode.playedByUserId === userId;
  
  announceToScreenReader(
    isMyPlay 
      ? `You played ${lastNode.playerName}` 
      : `Opponent played ${lastNode.playerName}`
  );
}, [chain.length]);
```

### Keyboard Navigation
```tsx
// Permitir navegar la cadena con teclado
<div
  ref={containerRef}
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'ArrowDown') {
      // Scroll down
      containerRef.current?.scrollBy({ top: 50, behavior: 'smooth' });
    } else if (e.key === 'ArrowUp') {
      // Scroll up
      containerRef.current?.scrollBy({ top: -50, behavior: 'smooth' });
    }
  }}
  role="list"
  aria-label="Player chain"
>
```

---

## Testing Requirements

```typescript
describe('ChainDisplay', () => {
  const mockChain: ChainNode[] = [
    { position: 1, playerId: '1', playerName: 'Messi', playedByUserId: 'user1' },
    { position: 2, playerId: '2', playerName: 'Busquets', playedByUserId: 'user2' },
    { position: 3, playerId: '3', playerName: 'Xavi', playedByUserId: 'user1' }
  ];

  it('should render all chain nodes', () => {
    render(<ChainDisplay chain={mockChain} userId="user1" />);
    
    expect(screen.getByText('Messi')).toBeInTheDocument();
    expect(screen.getByText('Busquets')).toBeInTheDocument();
    expect(screen.getByText('Xavi')).toBeInTheDocument();
  });

  it('should highlight my plays with green border', () => {
    render(<ChainDisplay chain={mockChain} userId="user1" />);
    
    const messiNode = screen.getByText('Messi').closest('div');
    expect(messiNode).toHaveClass('border-l-green-500');
  });

  it('should highlight opponent plays with red border', () => {
    render(<ChainDisplay chain={mockChain} userId="user1" />);
    
    const busquetsNode = screen.getByText('Busquets').closest('div');
    expect(busquetsNode).toHaveClass('border-l-red-500');
  });

  it('should mark last node as "Latest"', () => {
    render(<ChainDisplay chain={mockChain} userId="user1" />);
    
    const xaviNode = screen.getByText('Xavi').closest('div');
    expect(xaviNode).toContainHTML('Latest');
  });

  it('should auto-scroll to latest node when chain grows', () => {
    const { rerender } = render(<ChainDisplay chain={mockChain.slice(0, 2)} userId="user1" />);
    
    const scrollIntoViewMock = jest.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
    
    rerender(<ChainDisplay chain={mockChain} userId="user1" />);
    
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it('should show empty state when chain is empty', () => {
    render(<ChainDisplay chain={[]} userId="user1" />);
    
    expect(screen.getByText(/Chain will appear here/i)).toBeInTheDocument();
  });
});
```

---

## Performance Optimizations

### Virtualization for Long Chains
Si la cadena supera 100 jugadores (caso extremo), usar virtualización:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function ChainDisplayVirtualized({ chain, userId }: ChainDisplayProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: chain.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // altura estimada de cada nodo
    overscan: 5
  });

  return (
    <div
      ref={parentRef}
      className="max-h-96 overflow-y-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const node = chain[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`
              }}
            >
              <ChainNode node={node} isMyPlay={node.playedByUserId === userId} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Memoization
```tsx
import { memo } from 'react';

export const ChainDisplay = memo(function ChainDisplay({ chain, userId }: ChainDisplayProps) {
  // Implementation
}, (prevProps, nextProps) => {
  return (
    prevProps.chain.length === nextProps.chain.length &&
    prevProps.userId === nextProps.userId
  );
});
```

---

## Styling Enhancements

### Tailwind Scrollbar Plugin
```bash
npm install tailwind-scrollbar
```

```javascript
// tailwind.config.js
module.exports = {
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true })
  ]
};
```

Usage:
```tsx
<div className="scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
```

---

## Dependencies

```json
{
  "motion": "^12.0.0",
  "@tanstack/react-virtual": "^3.0.0"
}
```
