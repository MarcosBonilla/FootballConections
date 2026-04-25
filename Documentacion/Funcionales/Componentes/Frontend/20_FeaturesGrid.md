# Component Spec: FeaturesGrid

## Descripción
Grid de características del juego con iconos, títulos, descripciones. Diseño 2x2 en desktop, 1 columna en mobile. Hover effects y animaciones en scroll.

---

## Props Interface

```typescript
interface Feature {
  icon: string; // Emoji or icon component
  title: string;
  description: string;
  color: string; // Tailwind color class (e.g., 'blue', 'green')
}

interface FeaturesGridProps {
  features?: Feature[]; // Default: predefined 4 features
  columns?: 2 | 3 | 4; // Default: 2
}
```

---

## Features por Defecto

```typescript
const defaultFeatures: Feature[] = [
  {
    icon: '🌐',
    title: 'Real-time Multiplayer',
    description: 'Challenge players worldwide in live 1v1 matches with instant matchmaking.',
    color: 'blue',
  },
  {
    icon: '📊',
    title: 'ELO Ranking System',
    description: 'Track your progress and climb the leaderboard with our fair ELO-based ranking.',
    color: 'green',
  },
  {
    icon: '🔍',
    title: 'Smart Autocomplete',
    description: 'Find any player from top leagues instantly with our intelligent search.',
    color: 'purple',
  },
  {
    icon: '⚡',
    title: 'Fast & Fair',
    description: '30-second turns keep games exciting. Server-side validation ensures fairness.',
    color: 'yellow',
  },
];
```

---

## Layout (Desktop 2x2)

```
┌────────────────────────────────────────────────┐
│                                                │
│         🌐                   📊                │
│  Real-time Multiplayer   ELO Ranking          │
│  Challenge players...    Track your...        │
│                                                │
│         🔍                   ⚡                │
│  Smart Autocomplete      Fast & Fair          │
│  Find any player...      30-second turns...   │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Animaciones

### 1. Fade-In on Scroll
```typescript
import { useInView } from 'react-intersection-observer';

const [ref, inView] = useInView({
  triggerOnce: true,
  threshold: 0.3,
});

<motion.div
  ref={ref}
  initial={{ opacity: 0, y: 50 }}
  animate={inView ? { opacity: 1, y: 0 } : {}}
  transition={{ duration: 0.6 }}
/>
```

### 2. Hover Effect (Scale + Glow)
```typescript
<motion.div
  whileHover={{
    scale: 1.05,
    boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)',
  }}
  transition={{ duration: 0.3 }}
/>
```

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { motion } from 'motion/react';
import { useInView } from 'react-intersection-observer';

const defaultFeatures: Feature[] = [
  {
    icon: '🌐',
    title: 'Real-time Multiplayer',
    description: 'Challenge players worldwide in live 1v1 matches with instant matchmaking.',
    color: 'blue',
  },
  {
    icon: '📊',
    title: 'ELO Ranking System',
    description: 'Track your progress and climb the leaderboard with our fair ELO-based ranking.',
    color: 'green',
  },
  {
    icon: '🔍',
    title: 'Smart Autocomplete',
    description: 'Find any player from top leagues instantly with our intelligent search.',
    color: 'purple',
  },
  {
    icon: '⚡',
    title: 'Fast & Fair',
    description: '30-second turns keep games exciting. Server-side validation ensures fairness.',
    color: 'yellow',
  },
];

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500/10 border-blue-500 hover:shadow-blue-500/50',
  green: 'bg-green-500/10 border-green-500 hover:shadow-green-500/50',
  purple: 'bg-purple-500/10 border-purple-500 hover:shadow-purple-500/50',
  yellow: 'bg-yellow-500/10 border-yellow-500 hover:shadow-yellow-500/50',
  red: 'bg-red-500/10 border-red-500 hover:shadow-red-500/50',
};

export function FeaturesGrid({
  features = defaultFeatures,
  columns = 2,
}: FeaturesGridProps) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });
  
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  };
  
  return (
    <section ref={ref} className="py-20 px-4 bg-gray-900">
      <div className="max-w-6xl mx-auto">
        
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Why Football Connections?
          </h2>
          <p className="text-xl text-gray-400">
            The ultimate test of your football knowledge
          </p>
        </motion.div>
        
        {/* Features Grid */}
        <div className={`grid grid-cols-1 ${gridCols[columns]} gap-6`}>
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: index * 0.1, // Stagger effect
              }}
            >
              <motion.div
                whileHover={{
                  scale: 1.05,
                  boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)',
                }}
                transition={{ duration: 0.3 }}
                className={`
                  p-6 rounded-2xl border-2
                  ${colorMap[feature.color] || colorMap.blue}
                  transition-all duration-300
                `}
              >
                {/* Icon */}
                <div className="text-5xl mb-4">{feature.icon}</div>
                
                {/* Title */}
                <h3 className="text-2xl font-bold mb-3">
                  {feature.title}
                </h3>
                
                {/* Description */}
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## Variantes de Layout

### 3-Column Grid (para 6 features)
```tsx
<FeaturesGrid
  columns={3}
  features={[
    { icon: '🌐', title: 'Real-time', description: '...', color: 'blue' },
    { icon: '📊', title: 'Rankings', description: '...', color: 'green' },
    { icon: '🔍', title: 'Smart Search', description: '...', color: 'purple' },
    { icon: '⚡', title: 'Fast', description: '...', color: 'yellow' },
    { icon: '🏆', title: 'Achievements', description: '...', color: 'red' },
    { icon: '📱', title: 'Mobile-friendly', description: '...', color: 'blue' },
  ]}
/>
```

### Icon Components (alternativa a emoji)
```tsx
import { GlobeIcon, ChartBarIcon, SearchIcon, BoltIcon } from '@heroicons/react/24/outline';

const feature = {
  icon: <GlobeIcon className="w-12 h-12 text-blue-500" />,
  title: 'Real-time Multiplayer',
  // ...
};
```

---

## Accessibility

- [ ] Section has descriptive heading
- [ ] Grid uses semantic HTML (no nested divs sin significado)
- [ ] Color not only indicator (icon + text)
- [ ] Animation respects `prefers-reduced-motion`
- [ ] Color contrast >= 4.5:1
- [ ] Hover effect has focus equivalent

---

## Testing

### Unit Tests
- [ ] Default features render correctly
- [ ] Custom features passed as props render
- [ ] Grid layout changes with columns prop
- [ ] Hover animation plays correctly
- [ ] Stagger delay calculated correctly

### Visual Tests
```typescript
test('features grid renders all 4 features', async ({ page }) => {
  await page.goto('/');
  
  await expect(page.locator('h2')).toContainText('Why Football Connections?');
  
  const features = page.locator('[data-testid="feature-card"]');
  await expect(features).toHaveCount(4);
  
  await features.first().hover();
  
  // Check hover effect applied (scale + shadow)
  const transform = await features.first().evaluate(el => 
    window.getComputedStyle(el).transform
  );
  expect(transform).not.toBe('none');
});
```

---

## Responsive Behavior

| Breakpoint | Columns | Gap |
|------------|---------|-----|
| < 768px | 1 | 1rem |
| ≥ 768px | 2 | 1.5rem |
| ≥ 1024px | 2 | 1.5rem |
| ≥ 1280px | 2 | 2rem |

Para 3 columnas:
| Breakpoint | Columns |
|------------|---------|
| < 768px | 1 |
| ≥ 768px | 2 |
| ≥ 1024px | 3 |

---

## Notas para Frontend Architect

1. **Iconos:** Decidir entre emoji (más ligero) vs library de iconos (más personalizable). Sugerencia: emoji para MVP, iconos custom para producción.

2. **Intersection Observer:** Usar `react-intersection-observer` para lazy-load animaciones (mejora performance en páginas largas).

3. **Colors:** Los colores de las features deben coincidir con las secciones correspondientes en el resto del sitio (e.g., ELO badge = verde, matchmaking = azul).

4. **Content:** Las descripciones deben ser **concisas** (max 100 caracteres) para evitar height desigual en las cards.

5. **Orden:** En mobile las features más importantes van primero (Real-time Multiplayer, ELO Ranking).

6. **A/B Testing:** Considerar test con diferentes órdenes de features para ver cuál genera más signups.
