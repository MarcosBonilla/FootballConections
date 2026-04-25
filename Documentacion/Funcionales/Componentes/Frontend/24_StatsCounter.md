# Component Spec: StatsCounter

## Descripción
Componente reutilizable para mostrar estadísticas numéricas con animación count-up. Usado en landing page, perfil de usuario, leaderboard, y dashboard.

---

## Props Interface

```typescript
interface StatsCounterProps {
  value: number;
  label: string;
  duration?: number; // Animation duration in seconds (default: 2)
  decimals?: number; // Number of decimals (default: 0)
  suffix?: string; // e.g., '+', '%', 'K'
  prefix?: string; // e.g., '$', '#'
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  delay?: number; // Delay before starting animation (default: 0)
  enableInView?: boolean; // Start animation only when scrolled into view (default: true)
}
```

---

## Layout Variants

### Small (for cards)
```
┌────────────┐
│   1,247    │
│   Online   │
└────────────┘
```

### Medium (for dashboard)
```
┌─────────────────┐
│  📊             │
│  12,482         │
│  Active Players │
└─────────────────┘
```

### Large (for landing hero)
```
┌──────────────────────┐
│      🏆              │
│                      │
│    450,000+          │
│                      │
│  Matches Played      │
└──────────────────────┘
```

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { useEffect, useState } from 'react';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { motion } from 'motion/react';

const colorMap = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  yellow: 'text-yellow-500',
  red: 'text-red-500',
  purple: 'text-purple-500',
  gray: 'text-gray-400',
};

const sizeMap = {
  sm: {
    value: 'text-2xl',
    label: 'text-xs',
    icon: 'text-2xl',
    padding: 'p-3',
  },
  md: {
    value: 'text-4xl',
    label: 'text-sm',
    icon: 'text-3xl',
    padding: 'p-4',
  },
  lg: {
    value: 'text-6xl md:text-7xl',
    label: 'text-base md:text-lg',
    icon: 'text-5xl',
    padding: 'p-6',
  },
};

export function StatsCounter({
  value,
  label,
  duration = 2,
  decimals = 0,
  suffix = '',
  prefix = '',
  color = 'blue',
  size = 'md',
  icon,
  delay = 0,
  enableInView = true,
}: StatsCounterProps) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.5,
  });
  
  const [startAnimation, setStartAnimation] = useState(!enableInView);
  
  useEffect(() => {
    if (enableInView && inView) {
      // Apply delay before starting animation
      const timer = setTimeout(() => {
        setStartAnimation(true);
      }, delay * 1000);
      
      return () => clearTimeout(timer);
    }
  }, [enableInView, inView, delay]);
  
  const sizeClasses = sizeMap[size];
  const colorClass = colorMap[color];
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: delay }}
      className={`
        ${sizeClasses.padding}
        text-center
      `}
    >
      {/* Icon */}
      {icon && (
        <div className={`${sizeClasses.icon} mb-2`}>
          {icon}
        </div>
      )}
      
      {/* Value with CountUp */}
      <div className={`${sizeClasses.value} font-bold ${colorClass}`}>
        {startAnimation ? (
          <CountUp
            start={0}
            end={value}
            duration={duration}
            decimals={decimals}
            separator=","
            prefix={prefix}
            suffix={suffix}
          />
        ) : (
          <span>0</span>
        )}
      </div>
      
      {/* Label */}
      <p className={`${sizeClasses.label} text-gray-400 uppercase tracking-wide mt-1`}>
        {label}
      </p>
    </motion.div>
  );
}
```

---

## Uso en HeroSection

```tsx
import { StatsCounter } from '@/components/ui/StatsCounter';

export function HeroSection({ globalStats }: { globalStats: GlobalStats }) {
  return (
    <section>
      {/* Hero content... */}
      
      <div className="flex flex-col md:flex-row gap-8 md:gap-12">
        <StatsCounter
          value={globalStats.activeUsers}
          label="Active Players"
          color="blue"
          size="lg"
          icon="👥"
        />
        
        <StatsCounter
          value={globalStats.totalMatches}
          label="Matches Played"
          color="green"
          size="lg"
          suffix="+"
          icon="⚽"
          delay={0.2}
        />
        
        <StatsCounter
          value={globalStats.onlineNow}
          label="Online Now"
          color="yellow"
          size="lg"
          icon="🟢"
          delay={0.4}
        />
      </div>
    </section>
  );
}
```

---

## Uso en Dashboard Stats Card

```tsx
export function DashboardStats({ stats }: { stats: UserStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-gray-800 rounded-xl">
        <StatsCounter
          value={stats.matchesPlayed}
          label="Matches"
          color="blue"
          size="sm"
          enableInView={false} // No lazy load in dashboard
        />
      </div>
      
      <div className="bg-gray-800 rounded-xl">
        <StatsCounter
          value={stats.winRate}
          label="Win Rate"
          color="green"
          size="sm"
          suffix="%"
          decimals={1}
          enableInView={false}
        />
      </div>
      
      <div className="bg-gray-800 rounded-xl">
        <StatsCounter
          value={stats.currentStreak}
          label="Win Streak"
          color="yellow"
          size="sm"
          icon="🔥"
          enableInView={false}
        />
      </div>
      
      <div className="bg-gray-800 rounded-xl">
        <StatsCounter
          value={stats.elo}
          label="ELO Rating"
          color="purple"
          size="sm"
          enableInView={false}
        />
      </div>
    </div>
  );
}
```

---

## Variante: Stat Change (con delta)

Para mostrar cambio respecto a período anterior:

```tsx
interface StatsCounterWithDeltaProps extends StatsCounterProps {
  previousValue?: number;
  showDelta?: boolean;
}

export function StatsCounterWithDelta({
  value,
  previousValue,
  showDelta = true,
  ...props
}: StatsCounterWithDeltaProps) {
  const delta = previousValue ? value - previousValue : 0;
  const deltaPercent = previousValue ? ((delta / previousValue) * 100).toFixed(1) : 0;
  const isPositive = delta > 0;
  
  return (
    <div className="relative">
      <StatsCounter value={value} {...props} />
      
      {showDelta && delta !== 0 && (
        <div className={`
          absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold
          ${isPositive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}
        `}>
          {isPositive ? '↑' : '↓'} {Math.abs(Number(deltaPercent))}%
        </div>
      )}
    </div>
  );
}
```

---

## Formateadores de Números

```typescript
// utils/formatNumber.ts

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

// Uso con StatsCounter:
<StatsCounter
  value={1_234_567}
  label="Total Players"
  suffix="M"
  decimals={1}
  // Mostrará "1.2M"
/>
```

---

## Animación de "Pulse" en Tiempo Real

Para stats que cambian en tiempo real (online users):

```tsx
export function LiveStatsCounter(props: StatsCounterProps) {
  return (
    <div className="relative">
      <StatsCounter {...props} duration={0.5} />
      
      {/* Pulse indicator */}
      <motion.div
        className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [1, 0.5, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: 2,
        }}
      />
    </div>
  );
}
```

---

## Accessibility

- [ ] Value announced to screen readers
- [ ] Animation respects `prefers-reduced-motion`
- [ ] Label is descriptive
- [ ] Color contrast >= 4.5:1
- [ ] Aria-live region for real-time updates

---

## Testing

### Unit Tests
- [ ] CountUp animation starts on mount (if enableInView=false)
- [ ] CountUp animation starts when scrolled into view (if enableInView=true)
- [ ] Prefix and suffix applied correctly
- [ ] Decimals formatted correctly
- [ ] Delay applied before animation start
- [ ] Color and size classes applied

### Visual Tests
```typescript
test('stats counter animates correctly', async ({ page }) => {
  await page.goto('/');
  
  const counter = page.locator('[data-testid="active-players-counter"]');
  await expect(counter).toBeVisible();
  
  // Initial value should be 0
  await expect(counter).toContainText('0');
  
  // Wait for animation
  await page.waitForTimeout(2500);
  
  // Should show final value
  await expect(counter).toContainText('12,482');
});
```

---

## Performance Considerations

1. **IntersectionObserver**: Solo animar cuando visible (ahorra CPU en página larga).

2. **react-countup Library**: Es ligera (5KB gzipped), pero considerar implementación custom para eliminar dependencia:

```tsx
function useCountUp(end: number, duration: number, start = 0) {
  const [count, setCount] = useState(start);
  
  useEffect(() => {
    let startTime: number;
    
    function animate(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / (duration * 1000);
      
      if (progress < 1) {
        setCount(Math.floor(start + (end - start) * progress));
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    }
    
    requestAnimationFrame(animate);
  }, [end, duration, start]);
  
  return count;
}
```

3. **Memoization**: Memoizar componente si se renderiza múltiples veces con los mismos props.

---

## Notas para Frontend Architect

1. **Global Stats**: Fetch desde endpoint `/api/stats/global` en Server Component, pasar como prop.

2. **Real-time Updates**: Si stats cambian en tiempo real (online users), usar WebSocket o polling.

3. **Caching**: Cache stats globales por 60s en Next.js:
```typescript
const stats = await fetch('http://localhost:3000/api/stats/global', {
  next: { revalidate: 60 },
});
```

4. **Placeholder**: Mientras cargan datos, mostrar skeleton con valor "0" o "---".

5. **Accessibility**: Para screen readers, considerar agregar texto descriptivo: "Active players: twelve thousand four hundred eighty-two".
