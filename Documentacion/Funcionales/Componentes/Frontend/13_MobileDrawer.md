# Component Spec: MobileDrawer

## Descripción
Navegación drawer deslizante desde la izquierda para móviles (<768px). Incluye perfil de usuario, ELO, links de navegación, y botón de sign out.

---

## Props Interface

```typescript
interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name: string;
    email?: string;
    image?: string;
  };
  elo: number;
}
```

---

## Layout

```
┌──────────────────────┐
│                      │
│  [X]                 │ ← Close button
│                      │
│  ┌────────────────┐ │
│  │ [Avatar]       │ │
│  │ johnsmith      │ │
│  │ ELO: 1450      │ │
│  └────────────────┘ │
│                      │
│  ▶ Play Now          │ ← Primary action
│                      │
│  Leaderboard         │
│  Profile             │
│  Match History       │
│  Settings            │
│                      │
│  ──────────────────  │
│                      │
│  Sign Out            │ ← Red text
│                      │
└──────────────────────┘
```

---

## Animaciones

**Open:**
- Drawer: `translateX(-100%)` → `translateX(0)`
- Backdrop: `opacity: 0` → `opacity: 1`
- Items: Stagger animation (cada item entra con 50ms delay)

**Close:**
- Drawer: `translateX(0)` → `translateX(-100%)`
- Backdrop: `opacity: 1` → `opacity: 0`

**Duration:** 300ms ease-out

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { Dialog, Transition } from '@headlessui/react';
import { motion } from 'motion/react';
import { signOut } from 'next-auth/react';
import { UserAvatar } from './UserAvatar';

export function MobileDrawer({ isOpen, onClose, user, elo }: MobileDrawerProps) {
  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: '/' });
  };
  
  const navItems = [
    { label: 'Play Now', href: '/play', icon: '▶️', primary: true },
    { label: 'Leaderboard', href: '/leaderboard', icon: '🏆' },
    { label: 'Profile', href: '/profile', icon: '👤' },
    { label: 'Match History', href: '/history', icon: '📊' },
    { label: 'Settings', href: '/settings', icon: '⚙️' },
  ];
  
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>
        
        {/* Drawer Panel */}
        <Transition.Child
          as={Fragment}
          enter="transition-transform duration-300 ease-out"
          enterFrom="-translate-x-full"
          enterTo="translate-x-0"
          leave="transition-transform duration-300 ease-in"
          leaveFrom="translate-x-0"
          leaveTo="-translate-x-full"
        >
          <Dialog.Panel className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-gray-900 shadow-2xl overflow-y-auto">
            
            {/* Header with Close Button */}
            <div className="p-4 flex justify-between items-center border-b border-gray-800">
              <span className="text-sm text-gray-400">Menu</span>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* User Info */}
            <div className="p-6 bg-gradient-to-br from-blue-600/10 to-purple-600/10 border-b border-gray-800">
              <div className="flex items-center gap-4">
                <UserAvatar
                  src={user.image}
                  username={user.name}
                  size="lg"
                />
                <div className="flex-1">
                  <p className="font-semibold text-lg">{user.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-400">ELO:</span>
                    <span className="text-lg font-bold text-blue-400">{elo}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Navigation Items */}
            <nav className="p-4">
              <ul className="space-y-2">
                {navItems.map((item, index) => (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg transition
                        ${item.primary
                          ? 'bg-blue-600 hover:bg-blue-700 font-semibold'
                          : 'hover:bg-gray-800'
                        }
                      `}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </nav>
            
            {/* Divider */}
            <div className="border-t border-gray-800 mx-4"></div>
            
            {/* Sign Out */}
            <div className="p-4">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-semibold">Sign Out</span>
              </button>
            </div>
          </Dialog.Panel>
        </Transition.Child>
      </Dialog>
    </Transition>
  );
}
```

---

## Interacciones

**Abrir Drawer:**
- Click en hamburger menu del header
- Drawer desliza desde la izquierda
- Backdrop aparece con blur

**Cerrar Drawer:**
- Click en botón X
- Click en backdrop
- Click en cualquier nav link
- Press Escape key

---

## Touch Gestures

**Swipe to Close:**
```typescript
import { useDragControls } from 'motion/react';

// Permitir cerrar con swipe hacia la izquierda
<motion.div
  drag="x"
  dragConstraints={{ left: -100, right: 0 }}
  dragElastic={0.2}
  onDragEnd={(e, info) => {
    if (info.offset.x < -100) {
      onClose();
    }
  }}
>
```

---

## Accessibility

- [ ] Focus trap activo (focus no puede salir del drawer)
- [ ] Escape key cierra el drawer
- [ ] Close button tiene `aria-label`
- [ ] Drawer tiene `role="dialog"`
- [ ] First focusable element recibe focus al abrir
- [ ] Focus restored al trigger button después de cerrar
- [ ] Backdrop click cierra drawer

---

## Testing

### Unit Tests
- [ ] Drawer opens with correct animation
- [ ] Drawer closes on backdrop click
- [ ] Drawer closes on X button click
- [ ] Drawer closes on nav link click
- [ ] Drawer closes on Escape key
- [ ] User info displays correctly
- [ ] ELO displays correctly

### Integration Tests
- [ ] Nav links navigate to correct routes
- [ ] Sign out redirects to landing page
- [ ] Drawer auto-closes on route change
- [ ] Touch swipe gesture works

---

## Notas para Frontend Architect

1. **Headless UI Dialog:** Maneja focus trap y Escape key automáticamente.

2. **Prevent Body Scroll:** Cuando drawer está abierto, prevenir scroll del body:
```css
/* Headless UI agrega automáticamente */
body.overflow-hidden {
  overflow: hidden;
}
```

3. **Stagger Animation:**
```typescript
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 }
};

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(item => (
    <motion.li key={item.id} variants={item}>
      {item.label}
    </motion.li>
  ))}
</motion.ul>
```

4. **Z-Index:** Drawer debe tener `z-50` o superior para estar sobre header (`z-40`).

5. **Max Width:** `max-w-[85vw]` asegura que siempre haya espacio para cerrar con click en backdrop.
