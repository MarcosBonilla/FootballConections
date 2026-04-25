# Component Spec: EmptyState

## Descripción
Componente genérico para mostrar estados vacíos (sin datos) en listas, tablas, o secciones. Incluye icono, título, descripción, y CTA opcional.

---

## Props Interface

```typescript
interface EmptyStateProps {
  icon?: React.ReactNode; // Default: 📭
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  size?: 'sm' | 'md' | 'lg';
  illustration?: 'inbox' | 'search' | 'error' | 'construction' | 'celebration';
}
```

---

## Layout Variants

### Small (for card)
```
┌──────────────────┐
│                  │
│       📭         │
│   No matches     │
│   yet            │
│                  │
└──────────────────┘
```

### Medium (default)
```
┌────────────────────────────┐
│                            │
│          📭                │
│                            │
│      No Match History      │
│                            │
│   You haven't played any   │
│   matches yet. Start your  │
│   first game now!          │
│                            │
│      [Play Now]            │
│                            │
└────────────────────────────┘
```

### Large (for full page)
```
┌──────────────────────────────────┐
│                                  │
│                                  │
│             📭                   │
│                                  │
│       No Results Found           │
│                                  │
│   We couldn't find any players   │
│   matching your search criteria. │
│   Try adjusting your filters.    │
│                                  │
│   [Clear Filters]  [Go Back]    │
│                                  │
│                                  │
└──────────────────────────────────┘
```

---

## Ilustraciones Predefinidas

```typescript
const illustrations = {
  inbox: '📭',
  search: '🔍',
  error: '⚠️',
  construction: '🚧',
  celebration: '🎉',
  noUsers: '👥',
  noMatches: '⚽',
  noNotifications: '🔔',
  locked: '🔒',
};
```

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { motion } from 'motion/react';

const sizeMap = {
  sm: {
    icon: 'text-4xl',
    title: 'text-lg',
    description: 'text-sm',
    padding: 'p-6',
  },
  md: {
    icon: 'text-6xl',
    title: 'text-2xl',
    description: 'text-base',
    padding: 'p-12',
  },
  lg: {
    icon: 'text-8xl',
    title: 'text-3xl md:text-4xl',
    description: 'text-lg',
    padding: 'p-16',
  },
};

const illustrationMap = {
  inbox: '📭',
  search: '🔍',
  error: '⚠️',
  construction: '🚧',
  celebration: '🎉',
  noUsers: '👥',
  noMatches: '⚽',
  noNotifications: '🔔',
  locked: '🔒',
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
  illustration,
}: EmptyStateProps) {
  const sizeClasses = sizeMap[size];
  const defaultIcon = illustration ? illustrationMap[illustration] : '📭';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`
        ${sizeClasses.padding}
        text-center
        flex flex-col items-center justify-center
      `}
    >
      {/* Icon/Illustration */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className={`${sizeClasses.icon} mb-4`}
      >
        {icon || defaultIcon}
      </motion.div>
      
      {/* Title */}
      <h3 className={`${sizeClasses.title} font-bold mb-2 text-white`}>
        {title}
      </h3>
      
      {/* Description */}
      {description && (
        <p className={`${sizeClasses.description} text-gray-400 mb-6 max-w-md`}>
          {description}
        </p>
      )}
      
      {/* Action Button */}
      {action && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className={`
            px-6 py-3 rounded-lg font-semibold transition
            ${action.variant === 'secondary'
              ? 'bg-gray-800 hover:bg-gray-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
          `}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
```

---

## Casos de Uso Comunes

### 1. Match History Vacío

```tsx
<EmptyState
  illustration="noMatches"
  title="No Match History"
  description="You haven't played any matches yet. Start your first game now!"
  action={{
    label: 'Play Now',
    onClick: () => router.push('/play'),
    variant: 'primary',
  }}
/>
```

### 2. Search Sin Resultados

```tsx
<EmptyState
  illustration="search"
  title="No Players Found"
  description={`No results for "${searchQuery}". Try a different search term.`}
  action={{
    label: 'Clear Search',
    onClick: () => setSearchQuery(''),
    variant: 'secondary',
  }}
/>
```

### 3. Leaderboard Vacío

```tsx
<EmptyState
  illustration="noUsers"
  title="No Players Yet"
  description="Be the first to appear on the leaderboard! Play matches to earn ELO."
  size="lg"
/>
```

### 4. Notificaciones Vacías

```tsx
<EmptyState
  illustration="noNotifications"
  title="All Caught Up!"
  description="You have no new notifications."
  size="sm"
/>
```

### 5. Error State

```tsx
<EmptyState
  illustration="error"
  title="Something Went Wrong"
  description="We couldn't load your data. Please try again."
  action={{
    label: 'Retry',
    onClick: () => refetch(),
    variant: 'primary',
  }}
/>
```

### 6. Construcción / Coming Soon

```tsx
<EmptyState
  illustration="construction"
  title="Coming Soon"
  description="This feature is under development. Stay tuned!"
  size="lg"
/>
```

### 7. Feature Locked

```tsx
<EmptyState
  illustration="locked"
  title="Verify Email to Unlock"
  description="Complete email verification to access match history."
  action={{
    label: 'Verify Email',
    onClick: () => router.push('/verify-email'),
    variant: 'primary',
  }}
/>
```

---

## Variante: Con Ilustración SVG Custom

```tsx
interface EmptyStateWithSVGProps extends EmptyStateProps {
  svgIllustration?: React.ReactNode;
}

export function EmptyStateWithSVG({
  svgIllustration,
  ...props
}: EmptyStateWithSVGProps) {
  return (
    <div>
      {svgIllustration && (
        <div className="w-64 h-64 mx-auto mb-6">
          {svgIllustration}
        </div>
      )}
      <EmptyState {...props} icon={null} />
    </div>
  );
}

// Uso:
<EmptyStateWithSVG
  svgIllustration={<EmptyBoxIllustration />}
  title="No data"
  description="..."
/>
```

---

## Tabla de Referencia Rápida

| Contexto | Icon | Title | Description | Action |
|----------|------|-------|-------------|--------|
| Match History | ⚽ | No matches yet | Play your first game | Play Now |
| Search Results | 🔍 | No results | Try different keywords | Clear Search |
| Leaderboard | 👥 | No players | Be the first on the board | - |
| Notifications | 🔔 | All caught up | No new notifications | - |
| Error | ⚠️ | Something went wrong | Try again later | Retry |
| Coming Soon | 🚧 | Under construction | Feature in development | - |
| Locked | 🔒 | Verify email | Complete verification | Verify |
| Filter Results | 🔍 | No matches | Adjust your filters | Clear Filters |

---

## Accessibility

- [ ] Title is descriptive
- [ ] Description provides context
- [ ] Action button has descriptive label
- [ ] Keyboard navigation works
- [ ] Focus visible on action button
- [ ] Color contrast >= 4.5:1

---

## Testing

### Unit Tests
- [ ] Renders with default icon if none provided
- [ ] Action button calls onClick handler
- [ ] Size classes applied correctly
- [ ] Animation plays on mount
- [ ] Custom icon overrides default

### Visual Tests
```typescript
test('empty state renders correctly', async ({ page }) => {
  await page.goto('/match-history');
  
  await expect(page.locator('h3')).toContainText('No Match History');
  
  const playButton = page.getByRole('button', { name: 'Play Now' });
  await expect(playButton).toBeVisible();
  
  await playButton.click();
  await expect(page).toHaveURL('/play');
});
```

---

## Responsive Behavior

| Breakpoint | Icon Size | Title | Description | Padding |
|------------|-----------|-------|-------------|---------|
| Mobile | 4rem | text-lg | text-sm | p-6 |
| Tablet | 6rem | text-2xl | text-base | p-12 |
| Desktop | 8rem | text-4xl | text-lg | p-16 |

---

## Design Tokens

```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      animation: {
        'bounce-slow': 'bounce 3s infinite',
      },
    },
  },
};

// Uso para icon animado:
<div className="animate-bounce-slow">
  {icon}
</div>
```

---

## Notas para Frontend Architect

1. **Consistency**: Usar siempre EmptyState en lugar de crear custom empty messages ad-hoc.

2. **Animation**: La animación de entrada (fade + slide) debe respetar `prefers-reduced-motion`.

3. **Loading vs Empty**: No confundir empty state con loading state. Si datos están cargando, mostrar skeleton, NO empty state.

4. **SEO**: Para páginas públicas (leaderboard vacío), considerar agregar texto indexable alternativo.

5. **Error Boundaries**: EmptyState NO es para errores de componentes rotos. Usar Error Boundary para eso.

6. **Illustrations**: Para producción, considerar usar ilustraciones SVG custom de packs como unDraw, Storyset, o custom.

7. **Internationalization**: Todos los textos deben venir de archivos i18n.

---

## Notas para Backend Architect

1. **Empty Arrays**: Siempre retornar `[]` en lugar de `null` para listas vacías (facilita renderizado en frontend).

2. **Meta Info**: Considerar incluir metadata en respuestas:
```json
{
  "data": [],
  "meta": {
    "total": 0,
    "isEmpty": true,
    "reason": "NO_MATCHES_PLAYED"
  }
}
```

3. **Empty Reasons**: Backend puede sugerir razón de empty state para mejor UX:
   - `NO_DATA_YET` → "Start playing"
   - `FILTERED_OUT` → "Adjust filters"
   - `NO_PERMISSION` → "Verify email"
