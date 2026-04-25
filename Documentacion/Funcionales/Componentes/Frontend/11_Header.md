# Component Spec: Header

## Descripción
Header global sticky con 3 estados (no autenticado, autenticado, durante partida). Incluye logo, navegación, avatar de usuario, ELO badge, y menú desplegable.

---

## Props Interface

```typescript
interface HeaderProps {
  // No props needed - uses global state (Zustand)
}

interface HeaderState {
  isAuthenticated: boolean;
  user?: {
    username: string;
    avatarUrl?: string;
    elo: number;
  };
  isInMatch: boolean;
}
```

---

## Estados del Componente

### 1. Unauthenticated
```
┌────────────────────────────────────────────────────┐
│  ⚽ Football         [Play Now]  [Sign In]        │
│     Connections                                    │
└────────────────────────────────────────────────────┘
```

### 2. Authenticated (Desktop ≥768px)
```
┌────────────────────────────────────────────────────┐
│  ⚽ Football  [Play] [Leaderboard]  [👤 1450] ▼   │
│     Connections                                    │
└────────────────────────────────────────────────────┘

(dropdown abierto)
┌──────────────────┐
│ [👤] johnsmith   │
│ ─────────────── │
│ Profile          │
│ Match History    │
│ Settings         │
│ ─────────────── │
│ Sign Out         │
└──────────────────┘
```

### 3. Authenticated (Mobile <768px)
```
┌──────────────────────────────┐
│  ☰  ⚽ Football     [👤 1450]│
│        Connections           │
└──────────────────────────────┘

(drawer abierto desde la izquierda)
┌──────────────────┐
│                  │
│  [👤] johnsmith  │
│  ELO: 1450       │
│  ───────────────│
│  ▶ Play Now     │
│  Leaderboard    │
│  Profile        │
│  Match History  │
│  Settings       │
│  ───────────────│
│  Sign Out       │
└──────────────────┘
```

### 4. During Match (ambos breakpoints)
```
┌─────────────────────────────────────────┐
│  ⚽ Football Connections   [Leave Match]│
└─────────────────────────────────────────┘
```

---

## Sticky Header Behavior

**Scroll Trigger:** `scrollY > 50px`

**Effect:**
- Background: `bg-gray-900/90` → `bg-gray-900/95`
- Backdrop blur: `backdrop-blur-none` → `backdrop-blur-xl`
- Shadow: `shadow-none` → `shadow-xl`
- Height: `h-20` → `h-16` (opcional compact mode)

---

## Responsive Breakpoint

**Mobile (<768px):**
- Hamburger menu icon
- Logo centrado o izquierda
- Avatar + ELO badge derecha (compacto)
- Drawer navigation slide-in

**Desktop (≥768px):**
- Logo izquierda
- Nav links inline center/right
- Avatar + dropdown derecha

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from 'next-auth/react';
import { Menu } from '@headlessui/react';
import { useUserStore } from '@/stores/userStore';
import { useMatchStore } from '@/stores/matchStore';
import { UserAvatar } from './UserAvatar';
import { ELOBadge } from './ELOBadge';
import { MobileDrawer } from './MobileDrawer';

export function Header() {
  const { data: session } = useSession();
  const elo = useUserStore(state => state.elo);
  const isInMatch = useMatchStore(state => state.isActive);
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Sticky header effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [session]);
  
  return (
    <>
      <motion.header
        className={`
          fixed top-0 left-0 right-0 z-40
          transition-all duration-300
          ${isScrolled ? 'bg-gray-900/95 backdrop-blur-xl shadow-xl' : 'bg-gray-900/90'}
          ${isScrolled ? 'h-16' : 'h-20'}
        `}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          
          {/* Mobile Hamburger */}
          {session && !isInMatch && (
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 hover:bg-gray-800 rounded-lg transition"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          
          {/* Logo */}
          <Link href={session ? '/play' : '/'} className="flex items-center gap-2">
            <span className="text-3xl">⚽</span>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight">Football</span>
              <span className="font-bold text-lg leading-tight">Connections</span>
            </div>
          </Link>
          
          {/* Desktop Nav (authenticated, not in match) */}
          {session && !isInMatch && (
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/play"
                className="text-white hover:text-blue-400 font-semibold transition"
              >
                Play
              </Link>
              <Link
                href="/leaderboard"
                className="text-gray-400 hover:text-white transition"
              >
                Leaderboard
              </Link>
            </nav>
          )}
          
          {/* Right Side */}
          <div className="flex items-center gap-4">
            
            {/* Unauthenticated */}
            {!session && (
              <>
                <Link
                  href="/play"
                  className="hidden md:block px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
                >
                  Play Now
                </Link>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-gray-400 hover:text-white transition"
                >
                  Sign In
                </Link>
              </>
            )}
            
            {/* During Match */}
            {session && isInMatch && (
              <button
                onClick={() => {/* handle leave match */}}
                className="px-4 py-2 bg-red-600/10 text-red-500 hover:bg-red-600/20 rounded-lg font-semibold transition"
              >
                Leave Match
              </button>
            )}
            
            {/* Authenticated (not in match) */}
            {session && !isInMatch && (
              <>
                {/* Desktop Dropdown */}
                <Menu as="div" className="hidden md:block relative">
                  <Menu.Button className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 rounded-lg transition">
                    <UserAvatar
                      src={session.user.image}
                      username={session.user.name}
                      size="sm"
                    />
                    <ELOBadge elo={elo} />
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Menu.Button>
                  
                  <AnimatePresence>
                    <Menu.Items
                      as={motion.div}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl overflow-hidden"
                    >
                      {/* User Info */}
                      <div className="px-4 py-3 bg-gray-700">
                        <p className="font-semibold">{session.user.name}</p>
                        <p className="text-sm text-gray-400">{session.user.email}</p>
                      </div>
                      
                      <div className="py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              href="/profile"
                              className={`block px-4 py-2 ${active ? 'bg-gray-700' : ''}`}
                            >
                              Profile
                            </Link>
                          )}
                        </Menu.Item>
                        
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              href="/history"
                              className={`block px-4 py-2 ${active ? 'bg-gray-700' : ''}`}
                            >
                              Match History
                            </Link>
                          )}
                        </Menu.Item>
                        
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              href="/settings"
                              className={`block px-4 py-2 ${active ? 'bg-gray-700' : ''}`}
                            >
                              Settings
                            </Link>
                          )}
                        </Menu.Item>
                      </div>
                      
                      <div className="border-t border-gray-700">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => {/* handle sign out */}}
                              className={`block w-full text-left px-4 py-2 text-red-500 ${active ? 'bg-gray-700' : ''}`}
                            >
                              Sign Out
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </AnimatePresence>
                </Menu>
                
                {/* Mobile: Avatar + ELO only */}
                <div className="md:hidden flex items-center gap-2">
                  <UserAvatar
                    src={session.user.image}
                    username={session.user.name}
                    size="xs"
                  />
                  <ELOBadge elo={elo} compact />
                </div>
              </>
            )}
          </div>
        </div>
      </motion.header>
      
      {/* Mobile Drawer */}
      {session && !isInMatch && (
        <MobileDrawer
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          user={session.user}
          elo={elo}
        />
      )}
      
      {/* Spacer para evitar que contenido quede debajo del header fijo */}
      <div className={isScrolled ? 'h-16' : 'h-20'} />
    </>
  );
}
```

---

## Accessibility

- [ ] Skip to main content link (first focusable element)
- [ ] Hamburger menu has `aria-label`
- [ ] Dropdown menu keyboard navigable
- [ ] Logo link has descriptive text (not just icon)
- [ ] Current page highlighted in nav (aria-current)
- [ ] Leave Match button has confirmation modal

---

## Testing

### Unit Tests
- [ ] Sticky effect triggers at scroll > 50px
- [ ] Correct nav items shown for each state
- [ ] Dropdown opens/closes correctly
- [ ] Mobile drawer opens/closes correctly
- [ ] ELO updates in real-time

### Integration Tests
- [ ] Unauthenticated user sees Play Now + Sign In
- [ ] Authenticated user sees nav + avatar + dropdown
- [ ] During match shows only Leave Match button
- [ ] Mobile hamburger menu functional
- [ ] Sign out redirects to landing page

---

## Notas para Frontend Architect

1. **Zustand Stores:**
```typescript
// stores/userStore.ts
export const useUserStore = create<UserState>((set) => ({
  elo: 1200,
  updateElo: (newElo) => set({ elo: newElo }),
}));

// stores/matchStore.ts
export const useMatchStore = create<MatchState>((set) => ({
  isActive: false,
  matchId: null,
  setActive: (active, matchId) => set({ isActive: active, matchId }),
}));
```

2. **Leave Match Flow:**
```typescript
const handleLeaveMatch = async () => {
  const confirmed = await confirm('Are you sure? You will lose this match.');
  if (!confirmed) return;
  
  await fetch(`/api/matches/${matchId}/leave`, { method: 'POST' });
  useMatchStore.getState().setActive(false, null);
  router.push('/play');
};
```

3. **NextAuth Session:** Usar `useSession()` hook para obtener user data.

4. **Mobile Drawer:** Implementar en componente separado (`MobileDrawer.tsx`) con Framer Motion slide-in animation.
