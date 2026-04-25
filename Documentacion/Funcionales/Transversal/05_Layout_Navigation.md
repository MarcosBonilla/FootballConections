# Spec Funcional: Layout & Navigation

## Descripción
Sistema de layout global de la aplicación con header persistente, footer, navegación responsiva y menú de usuario. Incluye manejo de estados autenticado/no autenticado y navegación adaptativa según contexto.

## Usuario objetivo
Todos los usuarios de la aplicación, tanto autenticados como invitados.

---

## Flujo principal: Navegación

### Usuario No Autenticado
1. Accede a landing page → ve Header simple con logo + botón "Play Now"
2. Scroll down → ve contenido de landing + Footer
3. Click "Play Now" → redirect a `/auth/register`

### Usuario Autenticado
1. Hace login → Header cambia a mostrar avatar + menú desplegable
2. Puede acceder a:
   - Play (matchmaking)
   - Profile
   - Leaderboard
   - Settings
   - Logout
3. Footer visible en todas las páginas excepto durante partida activa

---

## Pantallas / Estados

### Header - Usuario No Autenticado

**Layout Desktop:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Football Connections          [Play Now]  [Sign In] │
└─────────────────────────────────────────────────────────────┘
```

**Layout Mobile:**
```
┌─────────────────────────┐
│ [☰] [Logo]     [Play]  │
└─────────────────────────┘

Menú hamburguesa desplegable:
- Home
- How to Play
- Leaderboard (público)
- Sign In
- Play Now
```

**Elementos:**
- **Logo**: Link a home `/` (siempre clickeable)
- **Play Now**: CTA button destacado (blue bg) → `/auth/register`
- **Sign In**: Link simple → `/auth/login`
- **Hamburguesa**: Icono tres líneas, abre drawer lateral en mobile

**Sticky behavior:**
- Header sticky en scroll (siempre visible)
- Backdrop blur + semi-transparent cuando scroll > 50px

---

### Header - Usuario Autenticado

**Layout Desktop:**
```
┌──────────────────────────────────────────────────────────────────────┐
│ [Logo] Football Connections   [Play] [Leaderboard]   [1250 ELO] [👤]│
└──────────────────────────────────────────────────────────────────────┘
```

Dropdown al click en Avatar:
```
┌─────────────────────────┐
│ @username               │
│ 1250 ELO • #245         │
├─────────────────────────┤
│ 👤 My Profile           │
│ 🏆 My Stats             │
│ ⚙️  Settings            │
├─────────────────────────┤
│ 🚪 Logout               │
└─────────────────────────┘
```

**Layout Mobile:**
```
┌─────────────────────────┐
│ [☰] [Logo]  [1250] [👤]│
└─────────────────────────┘

Drawer lateral izquierdo:
- Play
- Leaderboard
- My Profile
- Settings
- Logout
```

**Elementos:**
- **Play button**: CTA destacado (blue) → `/play` (inicia matchmaking)
- **Leaderboard**: Link normal → `/leaderboard`
- **ELO badge**: Muestra ELO actual (read-only), tooltip "Your current rating"
- **Avatar**: Foto de perfil o iniciales, dropdown con menú
- **Dropdown items**: 
  - My Profile → `/profile`
  - My Stats → `/stats`
  - Settings → `/settings`
  - Logout → modal confirmación

---

### Header - Durante Partida

**Layout Simplificado:**
```
┌───────────────────────────────────────────┐
│ [Logo]                           [Leave] │
└───────────────────────────────────────────┘
```

- Solo logo (no clickeable) y botón "Leave"
- Leave button abre modal de confirmación:
  - "Are you sure you want to leave? You will lose this match."
  - [Cancel] [Leave Match]

---

### Footer

**Layout Desktop:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  [Logo]                  Links             Social        Legal      │
│  Football Connections    • How to Play     [Twitter]     • Privacy  │
│                          • Leaderboard     [Discord]     • Terms    │
│  © 2026 All rights       • About          [GitHub]      • Contact  │
│  reserved                                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Layout Mobile:**
```
┌────────────────────────────┐
│       [Logo]               │
│  Football Connections      │
│                            │
│  Links                     │
│  • How to Play             │
│  • Leaderboard             │
│  • About                   │
│                            │
│  Follow Us                 │
│  [Twitter] [Discord] [Git] │
│                            │
│  Legal                     │
│  Privacy • Terms • Contact │
│                            │
│  © 2026 All rights reserved│
└────────────────────────────┘
```

**Elementos:**
- Links funcionales a secciones internas
- Social links abren en nueva pestaña
- Legal links abren páginas dedicadas (`/privacy`, `/terms`)
- Footer visible en: landing, profile, leaderboard, settings
- Footer **NO visible** en: páginas de auth, durante partida activa

---

### Mobile Navigation Drawer

**Apertura:**
- Click en hamburguesa (☰) abre drawer desde la izquierda
- Backdrop semi-transparent cubre contenido
- Click en backdrop o botón X cierra drawer

**Contenido:**
```
┌───────────────────────────┐
│ [X]                       │
│                           │
│ [Avatar + Username]       │
│ 1250 ELO • #245          │
│                           │
│ ───────────────────       │
│                           │
│ 🎮 Play                   │
│ 🏆 Leaderboard            │
│ 👤 My Profile             │
│ 📊 My Stats               │
│ ⚙️  Settings              │
│                           │
│ ───────────────────       │
│                           │
│ 🚪 Logout                 │
│                           │
│ ───────────────────       │
│                           │
│ How to Play              │
│ About                    │
│ Contact                  │
│                           │
└───────────────────────────┘
```

**Animación:**
- Slide-in desde izquierda (300ms ease-out)
- Backdrop fade-in simultáneo
- Items con stagger animation (50ms delay entre cada uno)

---

## Reglas de negocio

**RN-01:** Header debe ser sticky (position: sticky top-0) con backdrop blur al hacer scroll.

**RN-02:** ELO badge debe actualizar en tiempo real cuando cambia después de una partida (via store Zustand).

**RN-03:** Avatar debe mostrar iniciales del username si no hay foto de perfil.

**RN-04:** Dropdown de usuario debe cerrar al hacer click fuera o al presionar Escape.

**RN-05:** Mobile drawer debe cerrar al seleccionar cualquier link (excepto submenús).

**RN-06:** Durante partida activa, el header debe simplificarse mostrando solo Logo + Leave button.

**RN-07:** Footer no debe mostrarse en páginas de autenticación ni durante partida activa.

**RN-08:** Botón "Play" debe estar deshabilitado si el usuario ya está en una partida activa.

**RN-09:** Leaderboard link debe ser público (accesible sin login) pero con funcionalidad limitada.

**RN-10:** Logo siempre redirige a home `/` excepto durante partida activa (donde no es clickeable).

---

## Casos edge

**CE-01:** Usuario hace click en "Play" mientras está en cola de matchmaking → mostrar estado "Searching..." en lugar de botón.

**CE-02:** Usuario hace logout mientras tiene drawer abierto → cerrar drawer y redirect a landing.

**CE-03:** Usuario cambia de autenticado a no autenticado (sesión expira) → header actualiza automáticamente sin refresh.

**CE-04:** Usuario con partida activa intenta acceder a otra ruta → interceptar y mostrar modal "You have an active match. Finish or leave it first".

**CE-05:** Usuario hace scroll rápido en mobile con drawer abierto → drawer permanece fijo, solo el backdrop scroll.

**CE-06:** Avatar sin foto de perfil y username muy largo → iniciales solo primeras 2 letras, uppercase.

**CE-07:** ELO badge muestra número muy grande (ej. 2485) → formato con espacio de miles "2 485" o coma "2,485".

**CE-08:** Footer links a páginas externas (Twitter, Discord) → abrir en nueva pestaña con `rel="noopener noreferrer"`.

**CE-09:** Usuario en desktop hace hover sobre item de navegación → mostrar subrayado animado.

**CE-10:** Usuario presiona Tab para navegar por teclado → focus visible en todos los elementos interactivos.

---

## Datos necesarios

### User data (desde session)
```typescript
interface UserSession {
  id: string;
  username: string;
  email: string;
  currentElo: number;
  avatarUrl?: string;
  leaderboardRank?: number; // Opcional, calculado on-demand
}
```

### Active match status
```typescript
interface ActiveMatchStatus {
  hasActiveMatch: boolean;
  matchId?: string;
  isSearching?: boolean; // En cola de matchmaking
}
```

---

## Endpoints o lógica requerida

### Client-side
- `useSession()` hook de NextAuth.js para obtener usuario actual
- Zustand store `useUserStore` para ELO en tiempo real
- Zustand store `useMatchStore` para estado de partida activa

### Server-side (opcional)
- `GET /api/user/profile` — obtener datos completos del usuario
- `GET /api/user/leaderboard-rank` — obtener posición en leaderboard
- `GET /api/matches/active` — verificar si tiene partida activa

---

## Criterios de aceptación

### Header
- [ ] **CA-01:** Header es sticky y permanece visible al hacer scroll.
- [ ] **CA-02:** Header muestra blur background cuando scroll > 50px.
- [ ] **CA-03:** Usuario no autenticado ve "Play Now" y "Sign In".
- [ ] **CA-04:** Usuario autenticado ve avatar, ELO badge y dropdown.
- [ ] **CA-05:** Dropdown de usuario abre al click y cierra con Escape o click fuera.
- [ ] **CA-06:** ELO badge actualiza en < 500ms después de cambio en partida.
- [ ] **CA-07:** Durante partida, header muestra solo Logo + Leave button.

### Mobile Navigation
- [ ] **CA-08:** Hamburguesa abre drawer lateral en mobile (< 768px).
- [ ] **CA-09:** Drawer cierra al click en backdrop o botón X.
- [ ] **CA-10:** Drawer items tienen animación stagger al abrir.
- [ ] **CA-11:** Drawer cierra automáticamente al seleccionar un link.

### Footer
- [ ] **CA-12:** Footer visible en landing, profile, leaderboard, settings.
- [ ] **CA-13:** Footer NO visible en auth pages ni durante partida.
- [ ] **CA-14:** Social links abren en nueva pestaña.
- [ ] **CA-15:** All links en footer son funcionales.

### Responsive
- [ ] **CA-16:** Layout desktop se activa en >= 768px.
- [ ] **CA-17:** Layout mobile se activa en < 768px.
- [ ] **CA-18:** Touch targets en mobile mínimo 44x44px.

### Accessibility
- [ ] **CA-19:** Navegación por teclado funciona (Tab, Enter, Escape).
- [ ] **CA-20:** Focus visible en todos los elementos interactivos.
- [ ] **CA-21:** Skip-to-content link presente para screen readers.
- [ ] **CA-22:** ARIA labels en hamburguesa, avatar dropdown.

---

## Notas para Backend Architect

### Session Management
- NextAuth.js session debe incluir `currentElo` en JWT
- Actualizar ELO en session después de cada partida (o usar store client-side)

### Active Match Check
Middleware para rutas protegidas:
```typescript
export async function middleware(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.redirect('/auth/login');
  
  const activeMatch = await checkActiveMatch(session.user.id);
  if (activeMatch && req.nextUrl.pathname !== `/game/${activeMatch.id}`) {
    return NextResponse.redirect(`/game/${activeMatch.id}`);
  }
  
  return NextResponse.next();
}
```

---

## Notas para Frontend Architect

### Layout Structure (App Router)
```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
```

### Conditional Footer
```typescript
// components/Footer.tsx
'use client';

import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();
  
  const hideFooterPaths = ['/auth', '/game'];
  const shouldHideFooter = hideFooterPaths.some(path => pathname.startsWith(path));
  
  if (shouldHideFooter) return null;
  
  return <footer>...</footer>;
}
```

### ELO Real-time Update
```typescript
// stores/userStore.ts
export const useUserStore = create<UserStore>((set) => ({
  elo: 1200,
  updateElo: (newElo: number) => set({ elo: newElo }),
}));

// Actualizar después de partida
useEffect(() => {
  if (gameResult) {
    useUserStore.getState().updateElo(gameResult.eloChange.after);
  }
}, [gameResult]);
```

### Avatar Component
```typescript
function UserAvatar({ username, avatarUrl }: { username: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={username} className="w-10 h-10 rounded-full" />;
  }
  
  // Iniciales
  const initials = username.slice(0, 2).toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
      {initials}
    </div>
  );
}
```

### Sticky Header with Blur
```tsx
'use client';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <header
      className={`
        sticky top-0 z-50 transition-all duration-300
        ${isScrolled 
          ? 'bg-gray-900/80 backdrop-blur-md border-b border-gray-800' 
          : 'bg-transparent'
        }
      `}
    >
      {/* Content */}
    </header>
  );
}
```

### Mobile Drawer with Framer Motion
```tsx
import { motion, AnimatePresence } from 'motion/react';

function MobileDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />
          
          {/* Drawer */}
          <motion.nav
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed top-0 left-0 h-full w-80 bg-gray-900 z-50 p-6"
          >
            {/* Content */}
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Dropdown Menu (Headless UI)
```tsx
import { Menu } from '@headlessui/react';

function UserMenu() {
  return (
    <Menu as="div" className="relative">
      <Menu.Button>
        <UserAvatar />
      </Menu.Button>
      
      <Menu.Items className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl">
        <Menu.Item>
          {({ active }) => (
            <a href="/profile" className={active ? 'bg-gray-700' : ''}>
              My Profile
            </a>
          )}
        </Menu.Item>
        {/* More items */}
      </Menu.Items>
    </Menu>
  );
}
```
