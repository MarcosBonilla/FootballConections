# Component Spec: HeroSection

## Descripción
Sección hero de landing page con título impactante, descripción, CTAs principales, y preview animado del juego. Optimizado para conversión de visitantes a jugadores.

---

## Props Interface

```typescript
interface HeroSectionProps {
  onPlayClick?: () => void;
  onDemoClick?: () => void;
  showStats?: boolean; // Default: true
  globalStats?: {
    activeUsers: number;
    totalMatches: number;
    onlineNow: number;
  };
}
```

---

## Layout (Desktop ≥1024px)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│           ⚽ FOOTBALL CONNECTIONS ⚽                 │
│                                                     │
│     Test your football knowledge against           │
│          players from around the world             │
│                                                     │
│      [Play Now →]       [Watch Demo ▶]            │
│                                                     │
│   ┌───────────────────────────────────────────┐  │
│   │                                           │  │
│   │   [Animated chain: Messi → Busquets]    │  │
│   │           → Xavi → Iniesta               │  │
│   │                                           │  │
│   └───────────────────────────────────────────┘  │
│                                                     │
│    12,482 Players  •  450K+ Matches  •  1,247 Online│
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Layout (Mobile <768px)

```
┌──────────────────────────┐
│                          │
│  ⚽ FOOTBALL              │
│     CONNECTIONS ⚽        │
│                          │
│ Test your knowledge      │
│ against players          │
│ worldwide                │
│                          │
│  [Play Now →]           │
│  [Watch Demo ▶]         │
│                          │
│  [Animated preview]      │
│                          │
│  12K Players             │
│  450K Matches            │
│  1.2K Online             │
└──────────────────────────┘
```

---

## Animaciones

### 1. Title Animation (on mount)
```typescript
<motion.h1
  initial={{ opacity: 0, y: -30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, ease: 'easeOut' }}
>
  FOOTBALL CONNECTIONS
</motion.h1>
```

### 2. Player Chain Preview (auto-scroll loop)
```typescript
const players = ['Messi', 'Busquets', 'Xavi', 'Iniesta', 'Piqué'];

<motion.div
  animate={{ x: [0, -1000] }}
  transition={{
    repeat: Infinity,
    duration: 20,
    ease: 'linear',
  }}
  className="flex gap-4"
>
  {players.map(player => (
    <PlayerCard key={player} name={player} />
  ))}
</motion.div>
```

### 3. Stats Counter (count-up on scroll into view)
```typescript
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';

const [ref, inView] = useInView({ triggerOnce: true });

<div ref={ref}>
  {inView && <CountUp end={12482} duration={2} separator="," />}
</div>
```

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';

const playerChain = [
  { name: 'Lionel Messi', team: 'Barcelona' },
  { name: 'Sergio Busquets', team: 'Barcelona' },
  { name: 'Xavi Hernández', team: 'Barcelona' },
  { name: 'Andrés Iniesta', team: 'Barcelona' },
  { name: 'Gerard Piqué', team: 'Barcelona' },
];

export function HeroSection({
  onPlayClick,
  onDemoClick,
  showStats = true,
  globalStats,
}: HeroSectionProps) {
  const [statsRef, statsInView] = useInView({ triggerOnce: true, threshold: 0.5 });
  
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 py-20 bg-gradient-to-b from-gray-900 via-gray-900 to-blue-900/20">
      
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-8"
      >
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6">
          <span className="text-blue-500">⚽</span>
          {' '}FOOTBALL{' '}
          <span className="text-blue-500">⚽</span>
        </h1>
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4">
          CONNECTIONS
        </h2>
      </motion.div>
      
      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="text-xl md:text-2xl text-gray-300 text-center max-w-2xl mb-8"
      >
        Test your football knowledge against players from around the world
      </motion.p>
      
      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="flex flex-col md:flex-row gap-4 mb-12"
      >
        <Link
          href="/auth/register"
          onClick={onPlayClick}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-lg transition transform hover:scale-105"
        >
          Play Now →
        </Link>
        
        <button
          onClick={onDemoClick}
          className="px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold text-lg transition transform hover:scale-105 flex items-center justify-center gap-2"
        >
          <span>Watch Demo</span>
          <span>▶</span>
        </button>
      </motion.div>
      
      {/* Animated Player Chain Preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, duration: 0.8 }}
        className="w-full max-w-4xl mb-12 overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-sm p-8"
      >
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-800/50 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-800/50 to-transparent z-10 pointer-events-none" />
          
          {/* Scrolling chain */}
          <div className="overflow-hidden">
            <motion.div
              animate={{ x: [0, -800] }}
              transition={{
                repeat: Infinity,
                duration: 15,
                ease: 'linear',
              }}
              className="flex gap-4"
            >
              {[...playerChain, ...playerChain].map((player, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-48 p-4 bg-gray-700 rounded-lg"
                >
                  <p className="font-semibold truncate">{player.name}</p>
                  <p className="text-sm text-gray-400">{player.team}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>
      
      {/* Stats */}
      {showStats && globalStats && (
        <div ref={statsRef} className="flex flex-col md:flex-row gap-8 md:gap-12 text-center">
          <div>
            <p className="text-4xl md:text-5xl font-bold text-blue-500">
              {statsInView && (
                <CountUp
                  end={globalStats.activeUsers}
                  duration={2}
                  separator=","
                />
              )}
            </p>
            <p className="text-sm text-gray-400 uppercase tracking-wide">Active Players</p>
          </div>
          
          <div>
            <p className="text-4xl md:text-5xl font-bold text-green-500">
              {statsInView && (
                <CountUp
                  end={globalStats.totalMatches}
                  duration={2}
                  separator=","
                  suffix="+"
                />
              )}
            </p>
            <p className="text-sm text-gray-400 uppercase tracking-wide">Matches Played</p>
          </div>
          
          <div>
            <p className="text-4xl md:text-5xl font-bold text-yellow-500">
              {statsInView && (
                <CountUp
                  end={globalStats.onlineNow}
                  duration={2}
                  separator=","
                />
              )}
            </p>
            <p className="text-sm text-gray-400 uppercase tracking-wide">Online Now</p>
          </div>
        </div>
      )}
    </section>
  );
}
```

---

## Demo Modal

Mostrar video explicativo o GIF animado:
```tsx
import { Dialog } from '@headlessui/react';

function DemoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
        <Dialog.Panel className="max-w-4xl w-full bg-gray-900 rounded-2xl overflow-hidden">
          <video
            src="/demo-video.mp4"
            controls
            autoPlay
            className="w-full"
          />
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
```

---

## Accessibility

- [ ] Heading hierarchy correct (h1 for main title)
- [ ] CTAs have descriptive text
- [ ] Stats have `aria-label` for screen readers
- [ ] Animation respects `prefers-reduced-motion`
- [ ] Color contrast >= 4.5:1
- [ ] Video has captions (if demo modal used)

---

## Testing

### Unit Tests
- [ ] CTAs navigate to correct routes
- [ ] onPlayClick handler called
- [ ] onDemoClick handler called
- [ ] Stats counter animates on scroll into view
- [ ] Chain preview scrolls infinitely

### Visual Tests
- [ ] Title animation smooth
- [ ] Responsive layout works on all breakpoints
- [ ] Stats counters aligned properly
- [ ] Player chain preview doesn't overflow

---

## Notas para Frontend Architect

1. **Global Stats:** Fetch desde `/api/stats/global` en Server Component:
```tsx
// app/page.tsx
import { HeroSection } from '@/components/landing/HeroSection';

async function getGlobalStats() {
  const res = await fetch('http://localhost:3000/api/stats/global', {
    next: { revalidate: 60 }, // Cache 60s
  });
  return res.json();
}

export default async function HomePage() {
  const stats = await getGlobalStats();
  return <HeroSection globalStats={stats} />;
}
```

2. **Chain Preview:** Duplicar array para infinite scroll seamless.

3. **Video Optimization:** Usar formato WebM o MP4 optimizado, max 5MB.

4. **Above the Fold:** Hero completo debe cargarse en First Paint (no lazy load).

5. **SEO:** Meta tags en `<head>` con OpenGraph para social shares.
