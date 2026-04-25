# Component Spec: Footer

## Descripción
Footer global con 4 columnas: logo + descripción, links rápidos, redes sociales, legal. Conditional rendering (oculto durante partida activa y en páginas de auth).

---

## Props Interface

```typescript
interface FooterProps {
  // No props needed - usa pathname para conditional rendering
}
```

---

## Layout (Desktop ≥768px)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────┐│
│  │ ⚽ Football  │  │ Quick Links │  │ Community   │  │Legal││
│  │ Connections │  │             │  │             │  │    ││
│  │             │  │ Play Now    │  │ Discord     │  │Terms││
│  │ Test your   │  │ Leaderboard │  │ Twitter     │  │    ││
│  │ football    │  │ How to Play │  │ GitHub      │  │Priv.││
│  │ knowledge   │  │ Contact     │  │             │  │    ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └────┘│
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  © 2026 Football Connections. All rights reserved.         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Layout (Mobile <768px)

```
┌──────────────────────────┐
│                          │
│  ⚽ Football Connections  │
│  Test your knowledge     │
│                          │
│  Quick Links             │
│  • Play Now              │
│  • Leaderboard           │
│  • How to Play           │
│  • Contact               │
│                          │
│  Community               │
│  [Discord] [Twitter] [GH]│
│                          │
│  Legal                   │
│  Terms | Privacy         │
│                          │
│  © 2026 Football         │
│  Connections             │
└──────────────────────────┘
```

---

## Conditional Rendering

**Ocultar Footer en:**
- Rutas de autenticación: `/auth/*`
- Durante partida activa: cuando `useMatchStore().isActive === true`
- Error pages: `/404`, `/500`

**Mostrar Footer en:**
- Landing page: `/`
- Public pages: `/how-to-play`, `/contact`, `/terms`, `/privacy`
- Dashboard: `/play`, `/leaderboard`, `/profile`, `/history`

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useMatchStore } from '@/stores/matchStore';

export function Footer() {
  const pathname = usePathname();
  const isInMatch = useMatchStore(state => state.isActive);
  
  // Hide footer in auth pages, during match, and error pages
  const hideFooter =
    pathname?.startsWith('/auth') ||
    pathname === '/404' ||
    pathname === '/500' ||
    isInMatch;
  
  if (hideFooter) return null;
  
  return (
    <footer className="bg-gray-900 border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        
        {/* Desktop: 4 columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Column 1: Logo + Description */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="text-3xl">⚽</span>
              <div className="flex flex-col">
                <span className="font-bold leading-tight">Football</span>
                <span className="font-bold leading-tight">Connections</span>
              </div>
            </Link>
            <p className="text-sm text-gray-400">
              Test your football knowledge against players from around the world.
            </p>
          </div>
          
          {/* Column 2: Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/play" className="hover:text-white transition">
                  Play Now
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="hover:text-white transition">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/how-to-play" className="hover:text-white transition">
                  How to Play
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Column 3: Community */}
          <div>
            <h3 className="font-semibold mb-4">Community</h3>
            <div className="flex gap-4">
              <a
                href="https://discord.gg/football"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#5865F2] rounded-lg flex items-center justify-center hover:bg-[#4752C4] transition"
                aria-label="Join our Discord"
              >
                <span className="text-xl">💜</span>
              </a>
              <a
                href="https://twitter.com/footballconnect"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#1DA1F2] rounded-lg flex items-center justify-center hover:bg-[#0D8BD9] transition"
                aria-label="Follow us on Twitter"
              >
                <span className="text-xl">🐦</span>
              </a>
              <a
                href="https://github.com/football-connections"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition"
                aria-label="View source on GitHub"
              >
                <span className="text-xl">💻</span>
              </a>
            </div>
          </div>
          
          {/* Column 4: Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/terms" className="hover:text-white transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <p className="text-center text-sm text-gray-400">
            © {new Date().getFullYear()} Football Connections. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
```

---

## Social Media Links

| Platform | URL Pattern | Icon |
|----------|-------------|------|
| Discord | `https://discord.gg/[invite]` | 💜 (Discord purple) |
| Twitter | `https://twitter.com/[handle]` | 🐦 (Twitter blue) |
| GitHub | `https://github.com/[org]` | 💻 (Gray) |

---

## Accessibility

- [ ] All links have descriptive text or `aria-label`
- [ ] Social media icons have `aria-label`
- [ ] External links have `rel="noopener noreferrer"`
- [ ] Footer uses `<footer>` semantic HTML tag
- [ ] Links have visible focus states
- [ ] Copyright year updates dynamically

---

## Testing

### Unit Tests
- [ ] Footer hidden on `/auth/*` routes
- [ ] Footer hidden during active match
- [ ] Footer hidden on error pages
- [ ] Footer visible on landing and dashboard
- [ ] All links render correctly
- [ ] Social media links open in new tab

### Integration Tests
- [ ] Navigation links functional
- [ ] Social media links open correct URLs
- [ ] Footer responsive on all breakpoints
- [ ] Copyright year is current year

---

## Notas para Frontend Architect

1. **Dynamic Year:**
```typescript
const currentYear = new Date().getFullYear();
```

2. **Pathname Detection:**
```typescript
import { usePathname } from 'next/navigation';
const pathname = usePathname();
```

3. **Match State:**
```typescript
import { useMatchStore } from '@/stores/matchStore';
const isInMatch = useMatchStore(state => state.isActive);
```

4. **Sticky Footer:** Usar `mt-auto` con flexbox en layout principal para que footer siempre esté abajo:
```tsx
// app/layout.tsx
<body className="flex flex-col min-h-screen">
  <Header />
  <main className="flex-1">{children}</main>
  <Footer />
</body>
```

5. **SEO:** Incluir structured data (JSON-LD) en footer con organization info.
