# Component Spec: ELOBadge

## Descripción
Badge que muestra el rating ELO del usuario con actualización en tiempo real. Incluye animación de cambio y estados visual para diferentes rangos de ELO.

---

## Props Interface

```typescript
interface ELOBadgeProps {
  elo: number;
  showLabel?: boolean; // Default: true (muestra "ELO" text)
  compact?: boolean; // Default: false (version compacta para mobile)
  showChange?: boolean; // Default: false (muestra +/- cambio reciente)
  recentChange?: number; // ELO delta del último match
  variant?: 'default' | 'large' | 'minimal';
  onClick?: () => void; // Opcional, para abrir stats modal
}
```

---

## Variantes

### 1. Default (Desktop)
```
┌──────────────┐
│ ELO: 1450 🟢 │
└──────────────┘
```

### 2. Compact (Mobile)
```
┌────────┐
│ 1450 🟢│
└────────┘
```

### 3. With Change (después de match)
```
┌──────────────────┐
│ ELO: 1450 (+15) │
└──────────────────┘
```

### 4. Large (Profile Page)
```
┌───────────────────┐
│                   │
│      1450         │ ← Número grande
│      ELO          │
│   Intermediate    │ ← Rank label
│                   │
└───────────────────┘
```

---

## ELO Ranks & Colors

| ELO Range | Rank Label | Color | Icon |
|-----------|------------|-------|------|
| < 1000 | Beginner | Gray (#9CA3AF) | ○ |
| 1000-1199 | Amateur | Green (#10B981) | ● |
| 1200-1399 | Intermediate | Blue (#3B82F6) | ● |
| 1400-1599 | Advanced | Purple (#8B5CF6) | ● |
| 1600-1799 | Expert | Orange (#F59E0B) | ◆ |
| 1800+ | Master | Gold (#EAB308) | ★ |

---

## Animaciones

### 1. ELO Change Animation
Cuando ELO cambia (después de match):
- Number count-up animation (de ELO viejo a ELO nuevo en 1s)
- Color change si cruza threshold de rank
- Shake animation si es cambio grande (±20 o más)

```typescript
import CountUp from 'react-countup';

<CountUp
  start={previousElo}
  end={currentElo}
  duration={1}
  separator=","
/>
```

### 2. Delta Badge Animation
Mostrar cambio temporalmente (5 segundos después de match):
```
┌──────────────────┐
│ 1450        +15  │ ← Fade in, hold 5s, fade out
└──────────────────┘
```

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import CountUp from 'react-countup';

interface ELORank {
  min: number;
  max: number;
  label: string;
  color: string;
  icon: string;
}

const eloRanks: ELORank[] = [
  { min: 0, max: 999, label: 'Beginner', color: 'text-gray-400', icon: '○' },
  { min: 1000, max: 1199, label: 'Amateur', color: 'text-green-500', icon: '●' },
  { min: 1200, max: 1399, label: 'Intermediate', color: 'text-blue-500', icon: '●' },
  { min: 1400, max: 1599, label: 'Advanced', color: 'text-purple-500', icon: '●' },
  { min: 1600, max: 1799, label: 'Expert', color: 'text-orange-500', icon: '◆' },
  { min: 1800, max: Infinity, label: 'Master', color: 'text-yellow-500', icon: '★' },
];

function getRank(elo: number): ELORank {
  return eloRanks.find(rank => elo >= rank.min && elo <= rank.max) || eloRanks[0];
}

export function ELOBadge({
  elo,
  showLabel = true,
  compact = false,
  showChange = false,
  recentChange,
  variant = 'default',
  onClick,
}: ELOBadgeProps) {
  const [previousElo, setPreviousElo] = useState(elo);
  const [showDelta, setShowDelta] = useState(false);
  
  const rank = getRank(elo);
  
  // Detectar cambio de ELO
  useEffect(() => {
    if (elo !== previousElo) {
      setPreviousElo(elo);
      
      if (showChange && recentChange) {
        setShowDelta(true);
        setTimeout(() => setShowDelta(false), 5000);
      }
    }
  }, [elo, previousElo, showChange, recentChange]);
  
  // Variant: Large (for profile page)
  if (variant === 'large') {
    return (
      <motion.div
        className={`
          flex flex-col items-center gap-2 p-6 bg-gray-800 rounded-2xl
          ${onClick ? 'cursor-pointer hover:bg-gray-700' : ''}
        `}
        onClick={onClick}
        whileHover={onClick ? { scale: 1.02 } : {}}
      >
        <span className={`text-6xl font-bold ${rank.color}`}>
          <CountUp start={previousElo} end={elo} duration={1} separator="," />
        </span>
        <span className="text-sm text-gray-400 uppercase tracking-wide">ELO</span>
        <div className="flex items-center gap-2">
          <span className={`text-2xl ${rank.color}`}>{rank.icon}</span>
          <span className={`text-lg font-semibold ${rank.color}`}>{rank.label}</span>
        </div>
      </motion.div>
    );
  }
  
  // Variant: Minimal (just number + icon)
  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-1">
        <span className={`font-bold ${rank.color}`}>{elo}</span>
        <span className={rank.color}>{rank.icon}</span>
      </div>
    );
  }
  
  // Variant: Default/Compact
  return (
    <motion.div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-full
        ${onClick ? 'cursor-pointer hover:bg-gray-700' : ''}
      `}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.05 } : {}}
      animate={
        Math.abs(recentChange || 0) >= 20
          ? {
              rotate: [0, -5, 5, -5, 5, 0],
              transition: { duration: 0.5 }
            }
          : {}
      }
    >
      {!compact && showLabel && (
        <span className="text-sm text-gray-400">ELO:</span>
      )}
      
      <span className={`font-bold ${rank.color}`}>
        <CountUp start={previousElo} end={elo} duration={1} separator="," />
      </span>
      
      <span className={rank.color}>{rank.icon}</span>
      
      {/* Delta Badge */}
      <AnimatePresence>
        {showDelta && recentChange !== undefined && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className={`
              text-sm font-semibold
              ${recentChange >= 0 ? 'text-green-500' : 'text-red-500'}
            `}
          >
            {recentChange >= 0 ? '+' : ''}{recentChange}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

---

## Real-time Updates

**Zustand Store:**
```typescript
// stores/userStore.ts
import { create } from 'zustand';

interface UserState {
  elo: number;
  previousElo: number;
  recentChange: number | null;
  updateElo: (newElo: number) => void;
}

export const useUserStore = create<UserState>((set) => ({
  elo: 1200,
  previousElo: 1200,
  recentChange: null,
  
  updateElo: (newElo) => set((state) => ({
    previousElo: state.elo,
    elo: newElo,
    recentChange: newElo - state.elo,
  })),
}));
```

**Actualizar desde Match Result:**
```typescript
// Después de recibir resultado del match
const { updateElo } = useUserStore();
updateElo(matchResult.newElo);
```

---

## Tooltip (opcional)

Mostrar tooltip con rank info al hover:
```tsx
import { Tooltip } from '@/components/ui/Tooltip';

<Tooltip content={`${rank.label} (${rank.min}-${rank.max} ELO)`}>
  <ELOBadge elo={elo} />
</Tooltip>
```

---

## Accessibility

- [ ] ELO value announced to screen readers
- [ ] Rank label announced
- [ ] Delta change announced when it appears
- [ ] Clickable badge has `role="button"` and `aria-label`
- [ ] Color not the only indicator (also has icon + label)

---

## Testing

### Unit Tests
- [ ] Correct rank calculated for each ELO range
- [ ] Color applied correctly based on rank
- [ ] Count-up animation triggers on ELO change
- [ ] Delta badge shows/hides correctly
- [ ] Shake animation triggers for large changes (±20)
- [ ] onClick handler called when clicked

### Visual Tests
- [ ] Badge renders correctly in all variants
- [ ] Count-up animation smooth
- [ ] Colors meet WCAG contrast requirements
- [ ] Icons aligned properly

---

## Notas para Frontend Architect

1. **CountUp Library:**
```bash
npm install react-countup
```

2. **Real-time via WebSocket:**
```typescript
// PartyKit room sends ELO update
room.broadcast(JSON.stringify({
  type: 'ELO_UPDATE',
  userId: player.id,
  newElo: player.elo,
}));

// Client updates store
useEffect(() => {
  const ws = new WebSocket(partyKitUrl);
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'ELO_UPDATE') {
      updateElo(message.newElo);
    }
  };
}, []);
```

3. **Rank Thresholds:** Documentar claramente en `Documentacion/BD/` para que backend use mismos valores.

4. **Performance:** `React.memo` si badge se renderiza muchas veces (ej: leaderboard).

5. **Variant Usage:**
   - `default`: Header, dropdown
   - `compact`: Mobile header
   - `large`: Profile page
   - `minimal`: Inline mentions, small cards
