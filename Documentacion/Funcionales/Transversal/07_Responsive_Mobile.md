# Spec Funcional: Responsive Design & Mobile Optimization

## Descripción
Guía completa de diseño responsivo y optimización móvil para todos los componentes de la aplicación. Incluye breakpoints, patrones de layout, consideraciones táctiles y optimizaciones de rendimiento para dispositivos móviles.

---

## Breakpoints Estándar

```typescript
const breakpoints = {
  xs: '320px',   // Móviles pequeños (iPhone SE)
  sm: '640px',   // Móviles grandes
  md: '768px',   // Tablets
  lg: '1024px',  // Laptops
  xl: '1280px',  // Desktops
  '2xl': '1536px' // Pantallas grandes
};
```

### Estrategia: Mobile-First
Todos los estilos base son para móvil, con progressive enhancement para pantallas más grandes.

```css
/* Base: Mobile */
.container {
  padding: 1rem;
}

/* Tablet y superior */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
}
```

---

## Componentes Responsivos

### 1. Header / Navigation

**Mobile (< 768px):**
- Logo centrado o izquierda
- Hamburguesa menu (drawer lateral)
- Avatar pequeño (32x32px)
- ELO badge colapsado a solo número

**Desktop (>= 768px):**
- Logo izquierda
- Navegación horizontal inline
- Avatar normal (40x40px)
- ELO badge con label "ELO"

**Código:**
```tsx
<header className="px-4 md:px-8 py-3 md:py-4">
  {/* Mobile: Hamburger */}
  <button className="md:hidden">
    <MenuIcon />
  </button>
  
  {/* Desktop: Horizontal nav */}
  <nav className="hidden md:flex gap-6">
    <Link href="/play">Play</Link>
    <Link href="/leaderboard">Leaderboard</Link>
  </nav>
</header>
```

---

### 2. Landing Page

**Mobile:**
- Hero: texto centrado, botones stacked verticalmente
- Features: cards 1 por fila
- Stats: 1 columna con 3 filas

**Tablet (768px):**
- Features: cards 2 por fila
- Stats: 3 columnas inline

**Desktop (1024px):**
- Hero: texto más grande, botones inline
- Features: cards 4 por fila
- Stats: 3 columnas con animaciones más elaboradas

**Código:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {features.map(feature => <FeatureCard key={feature.id} {...feature} />)}
</div>
```

---

### 3. Matchmaking Queue

**Mobile:**
- Spinner grande centrado
- Texto "Searching..." más pequeño
- Timer counter grande (40px)
- Botón "Cancel" full-width

**Desktop:**
- Layout más espaciado
- Información adicional (rango ELO visible)
- Botón "Cancel" width auto

**Código:**
```tsx
<div className="flex flex-col items-center gap-4 md:gap-8">
  <Spinner className="w-16 h-16 md:w-20 md:h-20" />
  <p className="text-lg md:text-xl">Searching for opponent</p>
  <p className="text-sm md:text-base text-gray-400">
    ELO Range: ±{currentRange}
  </p>
  <button className="w-full md:w-auto">Cancel</button>
</div>
```

---

### 4. Game Board (Partida)

**Mobile (< 768px):**
```
┌──────────────────────┐
│ [Timer: 15s]         │ ← Arriba, centrado
├──────────────────────┤
│                      │
│  LIONEL MESSI       │ ← Nombre grande
│                      │
├──────────────────────┤
│ [Input field]        │ ← Full width
│ [Submit]            │ ← Full width button
├──────────────────────┤
│ CHAIN               │
│ 1. Messi            │
│ 2. Busquets         │
│ 3. Xavi             │ ← Lista vertical scrollable
└──────────────────────┘
```

**Desktop (>= 768px):**
```
┌────────────────────────────────────┐
│         [Timer: 15s]               │ ← Centrado, más grande
├────────────────────────────────────┤
│                                    │
│        LIONEL MESSI                │ ← Texto más grande
│                                    │
├────────────────────────────────────┤
│  [Input field + Submit inline]     │ ← Input más ancho
├────────────────────────────────────┤
│  CHAIN                             │
│  1. Messi  →  2. Busquets  →       │ ← Horizontal scroll
│     3. Xavi  →  4. Iniesta         │
└────────────────────────────────────┘
```

**Touch Considerations:**
- Input height mínimo 48px en móvil (touch target)
- Submit button mínimo 44x44px
- Espacio entre chain items >= 8px para evitar mis-taps

**Código:**
```tsx
<div className="flex flex-col items-center justify-between min-h-screen p-4 md:p-8">
  {/* Timer */}
  <GameTimer className="mb-4 md:mb-8" />
  
  {/* Current player */}
  <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold">
    {currentPlayer}
  </h1>
  
  {/* Input */}
  <div className="w-full max-w-xl">
    <PlayerInput className="h-12 md:h-14" />
  </div>
  
  {/* Chain */}
  <div className="w-full md:max-w-2xl">
    <ChainDisplay 
      layout={isMobile ? 'vertical' : 'horizontal'}
    />
  </div>
</div>
```

---

### 5. ChainDisplay

**Mobile: Vertical List**
- Items stack verticalmente
- Auto-scroll al último
- Max height 300px

**Desktop: Horizontal Scroll (Opcional)**
- Items inline con arrows
- Auto-scroll al último
- Full width container

**Código:**
```tsx
function ChainDisplay({ layout = 'vertical' }: { layout?: 'vertical' | 'horizontal' }) {
  if (layout === 'horizontal') {
    return (
      <div className="flex gap-4 overflow-x-auto">
        {chain.map(node => (
          <div key={node.position} className="flex-shrink-0 w-32">
            {node.playerName}
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
      {chain.map(node => (
        <div key={node.position}>
          {node.playerName}
        </div>
      ))}
    </div>
  );
}
```

---

### 6. ResultModal

**Mobile:**
- Modal full-screen (100vh)
- Padding reducido (p-4)
- Font sizes más pequeños
- Chain summary colapsada por defecto

**Desktop:**
- Modal centrado (max-w-lg)
- Padding generoso (p-8)
- Font sizes normales
- Chain summary visible

**Código:**
```tsx
<Dialog.Panel className="
  fixed md:relative
  inset-0 md:inset-auto
  w-full md:w-auto md:max-w-lg
  h-full md:h-auto
  p-4 md:p-8
  bg-gray-900 rounded-none md:rounded-2xl
">
  <h2 className="text-3xl md:text-4xl">Victory!</h2>
  {/* Content */}
</Dialog.Panel>
```

---

### 7. Leaderboard

**Mobile:**
- Lista completa vertical
- 1 columna (username + ELO stacked)
- Swipe para refresh

**Tablet:**
- 2 columnas (username | ELO)
- Pagination buttons más grandes

**Desktop:**
- 4 columnas (rank | username | ELO | matches played)
- Hover states
- Más rows visibles (20 vs 10)

**Código:**
```tsx
<div className="overflow-x-auto">
  <table className="w-full">
    <thead>
      <tr>
        <th className="text-left">#</th>
        <th className="text-left">Player</th>
        <th className="text-right">ELO</th>
        <th className="text-right hidden md:table-cell">Matches</th>
      </tr>
    </thead>
    <tbody>
      {players.map(player => (
        <tr key={player.id}>
          <td>{player.rank}</td>
          <td>{player.username}</td>
          <td>{player.elo}</td>
          <td className="hidden md:table-cell">{player.matches}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## Optimizaciones Móviles

### Performance

**1. Lazy Loading de Imágenes**
```tsx
<Image
  src="/hero.webp"
  alt="Hero"
  loading="lazy"
  placeholder="blur"
/>
```

**2. Reducir Animaciones**
```tsx
const prefersReducedMotion = useReducedMotion();

<motion.div
  animate={prefersReducedMotion ? {} : { scale: [1, 1.1, 1] }}
/>
```

**3. Infinite Scroll con Virtualización**
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

// Solo renderizar items visibles en viewport
```

**4. Debounce de Input más agresivo en móvil**
```tsx
const debounceMs = isMobile ? 500 : 300; // Más tiempo en móvil
```

---

### Touch Interactions

**1. Swipe to Refresh (opcional)**
```tsx
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

function LeaderboardPage() {
  usePullToRefresh(() => refetchLeaderboard());
  
  return <div>...</div>;
}
```

**2. Long Press for Contextual Menus**
```tsx
function ChainNode({ node }: { node: ChainNode }) {
  const [isPressed, setIsPressed] = useState(false);
  
  return (
    <div
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      className={isPressed ? 'bg-gray-700' : 'bg-gray-800'}
    >
      {node.playerName}
    </div>
  );
}
```

**3. Touch Feedback (Ripple Effect)**
```css
.button {
  position: relative;
  overflow: hidden;
}

.button::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.1);
  transform: scale(0);
  transition: transform 0.3s;
}

.button:active::after {
  transform: scale(1);
}
```

---

### Keyboard Behavior

**1. Input Focus en Móvil**
```tsx
// Evitar zoom al hacer focus en input (iOS)
<input
  type="text"
  style={{ fontSize: '16px' }} // Mínimo 16px
  autoComplete="off"
  autoCorrect="off"
  autoCapitalize="off"
/>
```

**2. Scroll Adjustment cuando teclado abre**
```tsx
useEffect(() => {
  const handleResize = () => {
    if (window.visualViewport) {
      const offsetBottom = window.innerHeight - window.visualViewport.height;
      document.body.style.paddingBottom = `${offsetBottom}px`;
    }
  };
  
  window.visualViewport?.addEventListener('resize', handleResize);
  return () => window.visualViewport?.removeEventListener('resize', handleResize);
}, []);
```

---

### Offline Support

**1. Service Worker para Cache**
```typescript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({
  // ...
});
```

**2. Offline Fallback**
```tsx
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}
```

---

## Testing Responsivo

### Breakpoints a Testear
- [x] 320px (iPhone SE)
- [x] 375px (iPhone standard)
- [x] 390px (iPhone Pro)
- [x] 768px (iPad portrait)
- [x] 1024px (iPad landscape)
- [x] 1280px (Desktop standard)

### Checklist por Componente
- [ ] Textos legibles sin zoom
- [ ] Botones con touch target >= 44x44px
- [ ] Espaciado adecuado entre elementos clickables
- [ ] Sin scroll horizontal no intencional
- [ ] Imágenes responsive (no desbordadas)
- [ ] Formularios usables sin zoom
- [ ] Animaciones no causan lag
- [ ] Carga inicial < 3s en 3G

---

## Reglas de negocio

**RN-01:** Touch targets interactivos deben ser mínimo 44x44px (WCAG 2.2).

**RN-02:** Font size base en mobile debe ser mínimo 16px para evitar zoom automático en iOS.

**RN-03:** Inputs deben tener `autocomplete`, `inputMode` y `autocapitalize` apropiados.

**RN-04:** Animaciones deben respetar `prefers-reduced-motion`.

**RN-05:** Imágenes deben tener `loading="lazy"` excepto above-the-fold.

**RN-06:** Mobile drawer debe cerrar al navegar a nueva ruta.

**RN-07:** Modals en mobile deben ser full-screen (100vh) no centrados.

**RN-08:** Horizontal scroll debe tener indicadores visuales (fade edges).

**RN-09:** Tables con > 3 columnas deben tener scroll horizontal en mobile.

**RN-10:** Landing page debe cargar < 3s en 3G slow connection.

---

## Casos edge

**CE-01:** Teclado virtual abierto empuja contenido arriba → ajustar scroll automático al input activo.

**CE-02:** Usuario rota dispositivo durante partida → layout se adapta sin perder estado.

**CE-03:** Landscape mode en móvil pequeño (480x320) → ajustar font sizes y padding.

**CE-04:** iPad en split-view (ancho < 768px) → usar layout móvil.

**CE-05:** Touch accidental en elemento cercano → agregar padding entre elementos táctiles.

**CE-06:** Long username desborda en mobile → truncate con ellipsis.

**CE-07:** Chain muy larga causa lag en scroll → implementar virtualización.

**CE-08:** Swipe gesture conflict con browser gestures → usar touch-action CSS.

---

## Criterios de aceptación

### General
- [ ] **CA-01:** App funcional en todos los breakpoints (320px - 2560px).
- [ ] **CA-02:** Touch targets >= 44x44px en todas las pantallas.
- [ ] **CA-03:** Font size base >= 16px en mobile.
- [ ] **CA-04:** Sin scroll horizontal no intencional en ninguna pantalla.

### Performance
- [ ] **CA-05:** First Contentful Paint < 1.5s en mobile.
- [ ] **CA-06:** Largest Contentful Paint < 2.5s en mobile.
- [ ] **CA-07:** Interaction to Next Paint < 200ms.
- [ ] **CA-08:** Lighthouse Mobile score >= 90.

### UX
- [ ] **CA-09:** Keyboard virtual no tapa inputs (scroll automático).
- [ ] **CA-10:** Rotación de dispositivo no pierde estado.
- [ ] **CA-11:** Swipe to refresh funciona en listas largas.
- [ ] **CA-12:** Offline state muestra mensaje apropiado.

### Accessibility
- [ ] **CA-13:** Zoom hasta 200% no rompe layout.
- [ ] **CA-14:** `prefers-reduced-motion` respetado.
- [ ] **CA-15:** Color contrast >= 4.5:1 en todos los textos.

---

## Notas para Frontend Architect

### Utilidades Tailwind Responsive
```tsx
// Mostrar/ocultar basado en breakpoint
<div className="block md:hidden">Mobile only</div>
<div className="hidden md:block">Desktop only</div>

// Spacing responsive
<div className="p-4 md:p-8 lg:p-12">

// Grid responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

// Text size responsive
<h1 className="text-3xl md:text-5xl lg:text-7xl">
```

### Hook para detectar Mobile
```tsx
import { useEffect, useState } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
}
```

### Safe Area Insets (iOS notch)
```css
/* globals.css */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

### PWA Configuration
```json
// public/manifest.json
{
  "name": "Football Connections",
  "short_name": "FC",
  "description": "Test your football knowledge",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#111827",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```
