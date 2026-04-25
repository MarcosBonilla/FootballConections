# Spec Funcional: Accesibilidad (WCAG 2.2 AA)

## Descripción
Guía de implementación de estándares de accesibilidad WCAG 2.2 AA para todos los componentes de Football Connections. Cubre navegación por teclado, lectores de pantalla, contraste visual, y patrones ARIA específicos del juego.

> **Cumplimiento Legal:** EAA (EU) vigente desde junio 2025. ADA Title II (US) vigente desde abril 2026. La accesibilidad es un requisito legal y ético.

---

## Principios POUR

| Principio | Aplicación en Football Connections |
|-----------|-----------------------------------|
| **Perceivable** | Alt text en avatares, contraste 4.5:1, timer visible y audible |
| **Operable** | Tab navigation en todo, sin keyboard traps, skip links |
| **Understandable** | Labels claros, errores descriptivos, navegación consistente |
| **Robust** | HTML semántico, ARIA correcto, compatible con screen readers |

---

## Navegación por Teclado

### Flujo de Tab Order

**Landing Page:**
```
Tab 1: Skip to content link
Tab 2: Logo / Home link
Tab 3: "Play Now" button
Tab 4: "Watch Demo" button
Tab 5: Footer links
```

**Game Board (durante partida):**
```
Tab 1: Leave Match button (en header)
Tab 2: Player input field (auto-focus al inicio del turno)
Tab 3: Submit button
Tab 4: (Chain display no recibe focus, es read-only)
```

**Matchmaking Queue:**
```
Tab 1: Cancel Search button
(No otros elementos focusables durante búsqueda)
```

**Result Modal:**
```
Tab 1: Close button (X icon)
Tab 2: "Rematch" button
Tab 3: "View Stats" button
Tab 4: "Back to Menu" button
```

### Keyboard Shortcuts

| Tecla | Acción | Contexto |
|-------|--------|----------|
| Enter | Submit player | Durante turno propio |
| Esc | Cancel / Close modal | Anywhere |
| Tab | Next focusable element | Global |
| Shift+Tab | Previous focusable element | Global |
| Space | Activate button | Cualquier botón |
| / | Focus search/input | Leaderboard, Profile |

---

## Focus Management

### Reglas Generales

**RN-01:** Focus outline visible en todos los elementos interactivos.
```css
:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  border-radius: 4px;
}
```

**RN-02:** Focus trap en modals (focus no puede salir del modal mientras está abierto).

**RN-03:** Restaurar focus al elemento trigger después de cerrar modal.

**RN-04:** Auto-focus en input de jugador al inicio de cada turno.

---

### Implementación de Focus Trap (Modal)

```tsx
import { Dialog } from '@headlessui/react';
import { FocusTrap } from '@headlessui/react';

function ResultModal({ isOpen, onClose }: ResultModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <FocusTrap>
        <Dialog.Panel>
          <button ref={closeButtonRef}>Close</button>
          {/* Otros elementos */}
        </Dialog.Panel>
      </FocusTrap>
    </Dialog>
  );
}
```

---

### Skip to Content Link

**Ubicación:** Primer elemento en el DOM (antes del header).

**Comportamiento:** Invisible por defecto, visible al recibir focus.

```tsx
// app/layout.tsx
<a
  href="#main-content"
  className="
    sr-only focus:not-sr-only
    focus:fixed focus:top-4 focus:left-4 focus:z-50
    focus:px-4 focus:py-2
    focus:bg-blue-600 focus:text-white
    focus:rounded-lg focus:shadow-xl
  "
>
  Skip to main content
</a>

<main id="main-content">
  {children}
</main>
```

---

## ARIA Labels y Roles

### Componentes Interactivos

**Player Input (autocomplete):**
```tsx
<div role="combobox" aria-expanded={isOpen} aria-haspopup="listbox">
  <input
    type="text"
    role="searchbox"
    aria-label="Search for a player"
    aria-autocomplete="list"
    aria-controls="player-suggestions"
    aria-activedescendant={selectedId}
  />
  <ul id="player-suggestions" role="listbox">
    {suggestions.map(player => (
      <li
        key={player.id}
        role="option"
        aria-selected={selectedId === player.id}
      >
        {player.name}
      </li>
    ))}
  </ul>
</div>
```

**Game Timer:**
```tsx
<div
  role="timer"
  aria-live="polite"
  aria-atomic="true"
  aria-label={`${timeLeft} seconds remaining`}
>
  <span className="text-5xl font-bold">{timeLeft}s</span>
</div>
```

**Chain Display:**
```tsx
<div role="list" aria-label="Player chain">
  {chain.map((node, index) => (
    <div key={node.position} role="listitem">
      <span className="sr-only">Position {index + 1}:</span>
      {node.playerName}
    </div>
  ))}
</div>
```

**Matchmaking Status:**
```tsx
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {status === 'searching' && 'Searching for opponent...'}
  {status === 'found' && 'Opponent found! Starting match...'}
</div>
```

**ELO Change (Result):**
```tsx
<div role="alert" aria-live="assertive" aria-atomic="true">
  <span className="sr-only">Your ELO changed:</span>
  <span className={elo >= 0 ? 'text-green-500' : 'text-red-500'}>
    {elo >= 0 ? '+' : ''}{elo}
  </span>
</div>
```

---

### Live Regions

**Tipos de Live Regions:**
- `aria-live="polite"` — Anuncia cuando screen reader termina de hablar (timer, status updates)
- `aria-live="assertive"` — Interrumpe inmediatamente (errores, alertas críticas, turno propio)
- `role="status"` — Equivalente a `aria-live="polite"`
- `role="alert"` — Equivalente a `aria-live="assertive"`

**Casos de Uso en el Juego:**

| Evento | Live Region Type | Texto Anunciado |
|--------|------------------|-----------------|
| Turno cambia a ti | `assertive` | "Your turn. 20 seconds remaining." |
| Turno del oponente | `polite` | "Opponent's turn." |
| Jugador válido aceptado | `polite` | "Player accepted: Lionel Messi" |
| Jugador inválido | `assertive` | "Invalid player. Try again." |
| Timer < 5s | `assertive` | "5 seconds remaining!" |
| Partida terminada | `assertive` | "You win! ELO +15" |

---

## Semántica HTML

### Estructura Correcta

```html
<!-- Landing Page -->
<header role="banner">
  <nav role="navigation">...</nav>
</header>

<main role="main">
  <section aria-labelledby="hero-heading">
    <h1 id="hero-heading">Football Connections</h1>
  </section>
  
  <section aria-labelledby="features-heading">
    <h2 id="features-heading">Features</h2>
  </section>
</main>

<footer role="contentinfo">...</footer>
```

### Headings Hierarchy

**Regla:** No saltar niveles (h1 → h2 → h3, nunca h1 → h3).

**Ejemplo Correcto:**
```html
<!-- Landing Page -->
<h1>Football Connections</h1>
<h2>How to Play</h2>
<h3>Step 1: Join a Match</h3>
<h3>Step 2: Name Players</h3>
<h2>Features</h2>
<h3>Real-time Multiplayer</h3>
```

---

## Contraste de Color

### Ratios Mínimos (WCAG 2.2 AA)

| Tipo de Texto | Ratio Mínimo |
|---------------|--------------|
| Normal (< 18px) | 4.5:1 |
| Large (≥ 18px o ≥ 14px bold) | 3:1 |
| UI Components (botones, bordes) | 3:1 |
| Decorativo | Sin requisito |

### Validación de Colores

**Texto en background oscuro (gray-900: #111827):**
- Blanco (#FFFFFF): 15.68:1 ✅
- Gray-400 (#9CA3AF): 5.02:1 ✅
- Gray-600 (#4B5563): 3.12:1 ❌ (solo para texto grande)

**Botones:**
- Blue-600 (#2563EB) sobre white: 4.54:1 ✅
- Green-500 (#10B981) sobre white: 3.02:1 ✅ (solo para large text)

**Error States:**
- Red-500 (#EF4444) sobre white: 3.93:1 ❌ (usar red-600 #DC2626 → 4.51:1 ✅)

### Herramienta de Verificación
```bash
# Lighthouse Accessibility Audit
npm run build
npm run start
# Abrir DevTools > Lighthouse > Accessibility
```

---

## Forms Accesibles

### Labels Correctos

```tsx
// ❌ MAL — placeholder no reemplaza label
<input type="text" placeholder="Username" />

// ✅ BIEN
<label htmlFor="username">Username</label>
<input id="username" type="text" />

// ✅ BIEN (label implícito)
<label>
  Username
  <input type="text" />
</label>
```

### Error Messages

```tsx
// ✅ BIEN — error asociado con input
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-describedby="email-error"
  aria-invalid={hasError}
/>
{hasError && (
  <p id="email-error" role="alert" className="text-red-600">
    {errorMessage}
  </p>
)}
```

### Required Fields

```tsx
// ✅ BIEN — indicador visual + atributo
<label htmlFor="password">
  Password <span aria-label="required" className="text-red-500">*</span>
</label>
<input id="password" type="password" required aria-required="true" />
```

---

## Imágenes y Multimedia

### Alt Text

**Imágenes de contenido:**
```tsx
<Image src="/hero.webp" alt="Two players competing in a football knowledge match" />
```

**Imágenes decorativas:**
```tsx
<Image src="/pattern.svg" alt="" role="presentation" />
```

**Avatares:**
```tsx
<Image
  src={user.avatarUrl}
  alt={`${user.username}'s profile picture`}
/>
```

**Icons con función:**
```tsx
// ❌ MAL
<button><SearchIcon /></button>

// ✅ BIEN
<button aria-label="Search players">
  <SearchIcon aria-hidden="true" />
</button>
```

---

## Animaciones

### prefers-reduced-motion

```tsx
import { useReducedMotion } from 'motion/react';

function GameTimer({ timeLeft }: { timeLeft: number }) {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      animate={
        shouldReduceMotion
          ? {} // Sin animación
          : { scale: [1, 1.1, 1] } // Con animación
      }
    >
      {timeLeft}s
    </motion.div>
  );
}
```

```css
/* CSS global */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Screen Readers

### Texto Solo para Screen Readers

```css
/* Tailwind utility: sr-only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**Uso:**
```tsx
<button>
  <TrashIcon aria-hidden="true" />
  <span className="sr-only">Delete player</span>
</button>
```

---

### Anuncios de Estado del Juego

```tsx
function GameStateAnnouncer({ state }: { state: GameState }) {
  const announcement = useMemo(() => {
    switch (state.phase) {
      case 'waiting':
        return 'Waiting for your turn.';
      case 'your-turn':
        return `Your turn. ${state.timeLeft} seconds remaining. Current player: ${state.currentPlayer}`;
      case 'opponent-turn':
        return `Opponent's turn. Current player: ${state.currentPlayer}`;
      case 'game-over':
        return state.winner === 'you'
          ? `You win! ELO increased by ${state.eloChange}.`
          : `You lose. ELO decreased by ${state.eloChange}.`;
    }
  }, [state]);
  
  return (
    <div
      className="sr-only"
      role="status"
      aria-live={state.phase === 'your-turn' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {announcement}
    </div>
  );
}
```

---

## Testing de Accesibilidad

### Herramientas

1. **Lighthouse** (Chrome DevTools)
   - Score mínimo: 90/100
   
2. **axe DevTools** (browser extension)
   - 0 critical issues
   
3. **Screen Reader Testing**
   - NVDA (Windows, gratis)
   - JAWS (Windows, pago)
   - VoiceOver (macOS, built-in)
   - TalkBack (Android, built-in)

4. **Keyboard Only Testing**
   - Desconectar mouse
   - Navegar toda la app con Tab/Enter/Esc
   - Verificar que todo sea accesible

---

### Checklist de Testing

#### Por Componente
- [ ] Navegable con teclado solamente
- [ ] Focus visible en todos los estados
- [ ] Sin keyboard traps
- [ ] Labels presentes en todos los inputs
- [ ] Errores descriptivos y asociados con campos
- [ ] Contraste de color >= 4.5:1
- [ ] Alt text en todas las imágenes de contenido
- [ ] ARIA roles y labels correctos
- [ ] Screen reader anuncia cambios de estado

#### Por Página
- [ ] Heading hierarchy correcta
- [ ] Skip to content link funcional
- [ ] Landmarks semánticos (header, nav, main, footer)
- [ ] `<title>` descriptivo y único
- [ ] `lang` attribute en `<html>`

#### Global
- [ ] Zoom hasta 200% sin romper layout
- [ ] `prefers-reduced-motion` respetado
- [ ] No flash/parpadeo > 3 veces por segundo
- [ ] Lighthouse Accessibility score >= 90
- [ ] axe DevTools 0 critical issues

---

## Reglas de negocio

**RN-01:** Todos los componentes deben ser navegables por teclado.

**RN-02:** Focus outline visible en todos los elementos interactivos (no `outline: none` sin reemplazo).

**RN-03:** Modals deben implementar focus trap.

**RN-04:** Live regions para anunciar cambios de turno y estado del juego.

**RN-05:** Alt text obligatorio en todas las imágenes de contenido.

**RN-06:** Contraste de color >= 4.5:1 para texto normal.

**RN-07:** Headings en orden jerárquico (h1 → h2 → h3).

**RN-08:** Forms con labels asociados (no solo placeholders).

**RN-09:** Error messages descriptivos y asociados con `aria-describedby`.

**RN-10:** Animaciones respetan `prefers-reduced-motion`.

---

## Casos edge

**CE-01:** Screen reader usuario navega por chain display → cada nodo anuncia posición + nombre.

**CE-02:** Keyboard usuario en modal Result → Tab cycle dentro del modal, Esc cierra.

**CE-03:** Usuario con zoom 200% → layout no rompe, texto no se corta.

**CE-04:** Usuario con `prefers-reduced-motion` → animaciones deshabilitadas pero feedback visual presente (color, opacity).

**CE-05:** Focus en input cuando teclado virtual abre (móvil) → scroll ajusta para mantener input visible.

**CE-06:** Screen reader durante countdown < 5s → anuncia cada segundo restante.

**CE-07:** Usuario ciega modal antes de que cargen datos → focus restaurado al trigger button.

**CE-08:** High contrast mode (Windows) → colores ajustados automáticamente, no hardcodeados en `background-image`.

---

## Criterios de aceptación

### Navegación
- [ ] **CA-01:** Skip to content link presente y funcional.
- [ ] **CA-02:** Tab order lógico en todas las pantallas.
- [ ] **CA-03:** Todos los botones activables con Space/Enter.
- [ ] **CA-04:** No keyboard traps en ningún flujo.

### Focus Management
- [ ] **CA-05:** Focus visible en todos los elementos interactivos.
- [ ] **CA-06:** Modals implementan focus trap.
- [ ] **CA-07:** Focus restaurado correctamente al cerrar modals.
- [ ] **CA-08:** Auto-focus en input de jugador al inicio de turno.

### ARIA y Semántica
- [ ] **CA-09:** Heading hierarchy correcta (h1 único por página).
- [ ] **CA-10:** Landmarks semánticos presentes (nav, main, footer).
- [ ] **CA-11:** Live regions anuncian cambios de estado.
- [ ] **CA-12:** Combobox (autocomplete) con ARIA completo.

### Forms
- [ ] **CA-13:** Todos los inputs tienen labels asociados.
- [ ] **CA-14:** Errores descriptivos con `aria-describedby`.
- [ ] **CA-15:** Campos requeridos indicados visualmente + `aria-required`.

### Visual
- [ ] **CA-16:** Contraste de color >= 4.5:1 en texto normal.
- [ ] **CA-17:** Contraste >= 3:1 en UI components.
- [ ] **CA-18:** Imágenes de contenido con alt text.

### Testing
- [ ] **CA-19:** Lighthouse Accessibility score >= 90.
- [ ] **CA-20:** axe DevTools 0 critical issues.
- [ ] **CA-21:** Navegable con keyboard only (sin mouse).
- [ ] **CA-22:** Screen reader testing passed (NVDA/VoiceOver).

---

## Notas para Frontend Architect

### Utilidades Tailwind para Accesibilidad

```tsx
// Screen reader only
<span className="sr-only">Hidden from visual users</span>

// Focus visible (sin focus en click)
<button className="focus-visible:outline-2 focus-visible:outline-blue-600">

// Not sr-only when focused (skip link)
<a href="#main" className="sr-only focus:not-sr-only">
```

### Headless UI Accessibility

**Todos los componentes de Headless UI ya incluyen:**
- Focus trap (Dialog)
- Keyboard navigation (Listbox, Combobox, Menu)
- ARIA attributes automáticos
- Escape key handling

```tsx
import { Dialog, Listbox, Combobox } from '@headlessui/react';

// Ya son accesibles out-of-the-box
<Dialog>...</Dialog>
<Listbox>...</Listbox>
<Combobox>...</Combobox>
```

### useId para IDs únicos

```tsx
import { useId } from 'react';

function FormField({ label, ...props }) {
  const id = useId(); // Genera ID único
  
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...props} />
    </>
  );
}
```

### Next.js Metadata para SEO

```tsx
// app/page.tsx
export const metadata: Metadata = {
  title: 'Football Connections - Test Your Knowledge',
  description: '...',
  generator: 'Next.js',
  applicationName: 'Football Connections',
  referrer: 'origin-when-cross-origin',
  keywords: ['football', 'soccer', 'trivia'],
  colorScheme: 'dark',
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
};
```

### Accessible Icon Button Pattern

```tsx
interface IconButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}

function IconButton({ icon: Icon, label, onClick }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="
        p-2 rounded-full
        focus-visible:outline-2 focus-visible:outline-blue-600
        hover:bg-gray-700 transition
      "
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
    </button>
  );
}
```

### Testing Script

```json
// package.json
{
  "scripts": {
    "test:a11y": "npm run build && start-server-and-test 'npm run start' http://localhost:3000 'axe http://localhost:3000'"
  }
}
```
