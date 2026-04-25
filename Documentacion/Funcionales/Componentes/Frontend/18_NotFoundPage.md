# Component Spec: NotFoundPage (404)

## Descripción
Página de error 404 "Not Found" con diseño temático de fútbol, animación visual optativa, y navegación clara hacia contenido válido.

---

## Props Interface

```typescript
interface NotFoundPageProps {
  // No props — standalone page
}
```

---

## Layout

```
┌──────────────────────────────────────────┐
│                                          │
│          ⚽ 404 ⚽                        │
│                                          │
│       OFFSIDE!                          │
│                                          │
│   The page you're looking for           │
│   doesn't exist or has been moved.      │
│                                          │
│   [Go Home]    [Play Now]               │
│                                          │
│   Quick links:                           │
│   • Leaderboard                          │
│   • How to Play                          │
│   • Contact                              │
│                                          │
└──────────────────────────────────────────┘
```

---

## Animaciones

### 1. Glitch Effect en "404"
```typescript
<motion.h1
  animate={{
    x: [0, -5, 5, -3, 0],
    textShadow: [
      '0 0 0 rgba(255,0,0,0)',
      '-3px 0 0 rgba(255,0,0,0.8)',
      '3px 0 0 rgba(0,255,255,0.8)',
      '0 0 0 rgba(255,0,0,0)',
    ],
  }}
  transition={{
    duration: 0.5,
    repeat: Infinity,
    repeatDelay: 3,
  }}
  className="text-8xl font-bold"
>
  404
</motion.h1>
```

### 2. Football Bounce (opcional)
```typescript
<motion.div
  animate={{ y: [0, -20, 0] }}
  transition={{
    repeat: Infinity,
    duration: 1,
    ease: 'easeInOut',
  }}
  className="text-6xl"
>
  ⚽
</motion.div>
```

---

## Implementación (código de ejemplo)

```tsx
import Link from 'next/link';
import { motion } from 'motion/react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-gray-900 to-black">
      
      {/* Animated Football */}
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{
          repeat: Infinity,
          duration: 1.2,
          ease: 'easeInOut',
        }}
        className="text-6xl mb-6"
      >
        ⚽
      </motion.div>
      
      {/* Error Code with Glitch Effect */}
      <motion.h1
        animate={{
          x: [0, -5, 5, -3, 0],
          textShadow: [
            '0 0 0 rgba(255,0,0,0)',
            '-3px 0 0 rgba(255,0,0,0.8)',
            '3px 0 0 rgba(0,255,255,0.8)',
            '0 0 0 rgba(255,0,0,0)',
          ],
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          repeatDelay: 3,
        }}
        className="text-8xl md:text-9xl font-bold text-white mb-4"
      >
        404
      </motion.h1>
      
      {/* Title */}
      <h2 className="text-3xl md:text-4xl font-bold mb-4 text-red-500">
        OFFSIDE!
      </h2>
      
      {/* Description */}
      <p className="text-lg text-gray-400 text-center max-w-md mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      
      {/* CTAs */}
      <div className="flex flex-col md:flex-row gap-4 mb-12">
        <Link
          href="/"
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition"
        >
          Go Home
        </Link>
        
        <Link
          href="/auth/register"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
        >
          Play Now
        </Link>
      </div>
      
      {/* Quick Links */}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-3">Quick links:</p>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/leaderboard" className="text-blue-500 hover:underline">
              Leaderboard
            </Link>
          </li>
          <li>
            <Link href="/how-to-play" className="text-blue-500 hover:underline">
              How to Play
            </Link>
          </li>
          <li>
            <Link href="/contact" className="text-blue-500 hover:underline">
              Contact Us
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
```

---

## Metadata (Next.js)

```typescript
// app/not-found.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 - Page Not Found | Football Connections',
  description: 'The page you are looking for does not exist.',
  robots: 'noindex, nofollow', // Don't index error pages
};
```

---

## Variantes Creativas

### Opción 1: Red Card (Tarjeta Roja)
```tsx
<div className="w-40 h-56 bg-red-600 rounded-lg shadow-2xl flex items-center justify-center">
  <span className="text-8xl font-bold text-white">404</span>
</div>
<p className="mt-4 text-xl">You've been shown a red card!</p>
```

### Opción 2: Goalkeeper Dive
```tsx
<div className="relative w-full max-w-md h-40 mb-8">
  <motion.div
    animate={{ x: [0, 100, 0] }}
    transition={{ repeat: Infinity, duration: 3 }}
    className="absolute"
  >
    🧤
  </motion.div>
  <motion.div
    animate={{ x: [0, -100, 0] }}
    transition={{ repeat: Infinity, duration: 3 }}
    className="absolute right-0"
  >
    ⚽
  </motion.div>
</div>
<p>The goalkeeper couldn't save this page!</p>
```

---

## Accessibility

- [ ] Descriptive page title
- [ ] Error code announced to screen readers
- [ ] Links have descriptive text
- [ ] Animation respects `prefers-reduced-motion`
- [ ] Color contrast >= 4.5:1
- [ ] Focus visible on all links

---

## Testing

### Unit Tests
- [ ] Page renders without errors
- [ ] All links point to correct routes
- [ ] Animation plays correctly
- [ ] Responsive layout works on all breakpoints

### E2E Tests
```typescript
test('404 page shows correct error and navigation', async ({ page }) => {
  await page.goto('/non-existent-page');
  
  await expect(page.locator('h1')).toContainText('404');
  await expect(page.locator('h2')).toContainText('OFFSIDE');
  
  const homeLink = page.getByRole('link', { name: 'Go Home' });
  await expect(homeLink).toBeVisible();
  await homeLink.click();
  
  await expect(page).toHaveURL('/');
});
```

---

## SEO Considerations

1. **No Index:** Always add `noindex, nofollow` meta tag
2. **Status Code:** Ensure server returns `404` status (Next.js does this automatically for `not-found.tsx`)
3. **Custom URL:** Redirect old URLs to new ones via `next.config.js`:
```typescript
async redirects() {
  return [
    {
      source: '/old-path',
      destination: '/new-path',
      permanent: true,
    },
  ];
}
```

---

## Logging & Analytics

Track 404s para identificar enlaces rotos:
```typescript
// app/not-found.tsx
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function NotFound() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Log 404 to analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_not_found', {
        page_path: pathname,
        search_params: searchParams?.toString(),
      });
    }
  }, [pathname, searchParams]);
  
  return (
    // ... Component JSX
  );
}
```

---

## Notas para Frontend Architect

1. **Next.js File:** Debe ser `app/not-found.tsx` para ser detectado automáticamente.
2. **Reduced Motion:** Disable glitch effect si usuario tiene `prefers-reduced-motion: reduce`.
3. **Dark Mode Only:** Página debe funcionar solo en dark mode (consistente con el resto del juego).
4. **A/B Testing:** Considerar test entre versión "simple" vs "gamificada" para ver cuál tiene mejor retention.
