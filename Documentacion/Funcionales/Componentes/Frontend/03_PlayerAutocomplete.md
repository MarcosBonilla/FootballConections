# Componente Frontend: PlayerAutocomplete

## Descripción técnica
Input de texto con autocompletado en tiempo real que busca jugadores de fútbol mientras el usuario escribe. Incluye debounce, navegación por teclado, y fuzzy matching para variaciones de nombres.

## Ubicación
`app/components/game/PlayerInput.tsx`

---

## Props Interface

```typescript
interface PlayerInputProps {
  disabled: boolean;
  currentChainPlayerId: string;
  onSubmit: (inputText: string) => void;
}

interface PlayerSuggestion {
  playerId: string;
  playerName: string;
  highlightedName: string; // HTML con <mark> para matched chars
  matchScore: number; // 0-100, usado para ordenar
}
```

---

## State Management

```typescript
interface InputState {
  value: string;
  suggestions: PlayerSuggestion[];
  selectedIndex: number;
  isLoading: boolean;
  showSuggestions: boolean;
}
```

---

## Implementation

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { motion, AnimatePresence } from 'motion/react';

export function PlayerInput({
  disabled,
  currentChainPlayerId,
  onSubmit
}: PlayerInputProps) {
  const [state, setState] = useState<InputState>({
    value: '',
    suggestions: [],
    selectedIndex: -1,
    isLoading: false,
    showSuggestions: false
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const searchPlayers = useDebouncedCallback(async (query: string) => {
    if (query.length < 2) {
      setState(prev => ({ ...prev, suggestions: [], showSuggestions: false }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/players/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          currentPlayerId: currentChainPlayerId,
          limit: 5
        })
      });

      const suggestions = await response.json();

      setState(prev => ({
        ...prev,
        suggestions,
        isLoading: false,
        showSuggestions: suggestions.length > 0,
        selectedIndex: -1
      }));
    } catch (error) {
      console.error('Autocomplete error:', error);
      setState(prev => ({ ...prev, isLoading: false, showSuggestions: false }));
    }
  }, 300); // 300ms debounce

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setState(prev => ({ ...prev, value }));
    searchPlayers(value);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { suggestions, selectedIndex, showSuggestions } = state;

    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setState(prev => ({
          ...prev,
          selectedIndex: (selectedIndex + 1) % suggestions.length
        }));
        scrollToSelected(selectedIndex + 1);
        break;

      case 'ArrowUp':
        e.preventDefault();
        setState(prev => ({
          ...prev,
          selectedIndex: selectedIndex <= 0 ? suggestions.length - 1 : selectedIndex - 1
        }));
        scrollToSelected(selectedIndex - 1);
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectSuggestion(suggestions[selectedIndex]);
        } else {
          handleSubmit();
        }
        break;

      case 'Escape':
        e.preventDefault();
        setState(prev => ({ ...prev, showSuggestions: false, selectedIndex: -1 }));
        break;

      case 'Tab':
        if (selectedIndex >= 0) {
          e.preventDefault();
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
    }
  };

  // Scroll suggestion into view
  const scrollToSelected = (index: number) => {
    if (!suggestionsRef.current) return;
    
    const item = suggestionsRef.current.children[index] as HTMLElement;
    if (item) {
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  // Select suggestion
  const selectSuggestion = (suggestion: PlayerSuggestion) => {
    setState({
      value: suggestion.playerName,
      suggestions: [],
      selectedIndex: -1,
      isLoading: false,
      showSuggestions: false
    });
    inputRef.current?.focus();
  };

  // Submit
  const handleSubmit = () => {
    if (state.value.trim().length === 0) return;
    if (disabled) return;

    onSubmit(state.value.trim());
    
    // Reset input
    setState({
      value: '',
      suggestions: [],
      selectedIndex: -1,
      isLoading: false,
      showSuggestions: false
    });
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setState(prev => ({ ...prev, showSuggestions: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus cuando es tu turno
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  return (
    <div className="relative w-full">
      {/* Badge de turno */}
      {!disabled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-8 left-0 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium"
        >
          Your turn!
        </motion.div>
      )}

      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={state.value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? "Waiting for opponent..." : "Type player name..."}
          className={`
            w-full px-4 py-3 text-lg rounded-lg border-2 
            transition-all duration-200
            ${disabled 
              ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' 
              : 'bg-gray-900 border-gray-600 text-white focus:border-blue-500 focus:outline-none'
            }
          `}
          aria-label="Nombre del jugador"
          aria-autocomplete="list"
          aria-controls="player-suggestions"
          aria-expanded={state.showSuggestions}
          aria-activedescendant={
            state.selectedIndex >= 0 
              ? `suggestion-${state.selectedIndex}` 
              : undefined
          }
          autoComplete="off"
        />

        {/* Loading spinner */}
        {state.isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Autocomplete suggestions */}
      <AnimatePresence>
        {state.showSuggestions && state.suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
            id="player-suggestions"
            role="listbox"
          >
            {state.suggestions.map((suggestion, index) => (
              <button
                key={suggestion.playerId}
                id={`suggestion-${index}`}
                role="option"
                aria-selected={index === state.selectedIndex}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setState(prev => ({ ...prev, selectedIndex: index }))}
                className={`
                  w-full px-4 py-3 text-left transition-colors cursor-pointer
                  ${index === state.selectedIndex 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }
                  ${index !== state.suggestions.length - 1 ? 'border-b border-gray-700' : ''}
                `}
              >
                <span
                  dangerouslySetInnerHTML={{ __html: suggestion.highlightedName }}
                  className="font-medium"
                />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={disabled || state.value.trim().length === 0}
        className="mt-3 w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        aria-label="Enviar respuesta"
      >
        Submit
      </button>
    </div>
  );
}
```

---

## Backend Endpoint

**File**: `src/api/players.ts`

```typescript
import { Hono } from 'hono';
import { db } from '@/db/client';
import { players, teammate_edges } from '@/db/schema';
import { sql, eq, and, ne } from 'drizzle-orm';

const app = new Hono();

// Autocomplete endpoint
app.post('/autocomplete', async (c) => {
  const { query, currentPlayerId, limit = 5 } = await c.req.json();

  if (!query || query.length < 2) {
    return c.json([]);
  }

  // Buscar jugadores que:
  // 1. Han jugado con el currentPlayer (edges en BD)
  // 2. Coinciden con el query (fuzzy)
  // 3. Limitar a 5 resultados

  const results = await db
    .select({
      playerId: players.id,
      playerName: players.name,
      matchScore: sql<number>`
        similarity(${players.name}, ${query}) * 100
      `
    })
    .from(players)
    .innerJoin(
      teammate_edges,
      and(
        eq(teammate_edges.player1Id, currentPlayerId),
        eq(teammate_edges.player2Id, players.id)
      )
    )
    .where(
      sql`similarity(${players.name}, ${query}) > 0.3`
    )
    .orderBy(sql`similarity(${players.name}, ${query}) DESC`)
    .limit(limit);

  // Highlight matched characters
  const suggestions = results.map(r => ({
    playerId: r.playerId,
    playerName: r.playerName,
    highlightedName: highlightMatch(r.playerName, query),
    matchScore: r.matchScore
  }));

  return c.json(suggestions);
});

/**
 * Highlight matched characters in name
 */
function highlightMatch(name: string, query: string): string {
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return name.replace(regex, '<mark class="bg-blue-500 text-white">$1</mark>');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default app;
```

---

## PostgreSQL Extension Required

Necesita la extensión `pg_trgm` para fuzzy matching:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice para optimizar búsqueda por similitud
CREATE INDEX idx_players_name_trgm ON players USING gin (name gin_trgm_ops);
```

---

## Testing Requirements

```typescript
describe('PlayerInput', () => {
  it('should show suggestions after typing 2 characters', async () => {
    render(<PlayerInput disabled={false} currentChainPlayerId="..." onSubmit={jest.fn()} />);
    
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Me');
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  it('should navigate suggestions with keyboard', async () => {
    render(<PlayerInput disabled={false} currentChainPlayerId="..." onSubmit={jest.fn()} />);
    
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Messi');
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
    
    // Arrow down
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('Lionel Messi');
  });

  it('should select suggestion on Enter', async () => {
    const onSubmit = jest.fn();
    render(<PlayerInput disabled={false} currentChainPlayerId="..." onSubmit={onSubmit} />);
    
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Messi{ArrowDown}{Enter}');
    
    expect(input).toHaveValue('Lionel Messi');
  });

  it('should call onSubmit when clicking submit button', async () => {
    const onSubmit = jest.fn();
    render(<PlayerInput disabled={false} currentChainPlayerId="..." onSubmit={onSubmit} />);
    
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Cristiano Ronaldo');
    
    const submitBtn = screen.getByRole('button', { name: /enviar/i });
    await userEvent.click(submitBtn);
    
    expect(onSubmit).toHaveBeenCalledWith('Cristiano Ronaldo');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<PlayerInput disabled={true} currentChainPlayerId="..." onSubmit={jest.fn()} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });
});
```

---

## Accessibility Checklist

- [x] Input tiene `aria-label`
- [x] Lista de sugerencias tiene `role="listbox"`
- [x] Cada sugerencia tiene `role="option"`
- [x] `aria-expanded` indica si lista está abierta
- [x] `aria-activedescendant` apunta a sugerencia seleccionada
- [x] Navegación completa por teclado (arrows, Enter, Escape, Tab)
- [x] Focus management al seleccionar sugerencia

---

## Performance Optimizations

- Debounce de 300ms evita búsquedas excesivas
- Límite de 5 sugerencias reduce payload
- PostgreSQL `pg_trgm` con index GIN hace búsqueda O(log N)
- Close on outside click previene memory leaks

---

## Dependencies

```json
{
  "motion": "^12.0.0",
  "use-debounce": "^10.0.0"
}
```
