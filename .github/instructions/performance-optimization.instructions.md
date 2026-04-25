---
name: performance-optimization
description: 'Core Web Vitals optimization standards and performance anti-patterns for Next.js App Router applications. Covers LCP, INP, CLS optimization, image/font/bundle best practices, and Next.js-specific caching patterns.'
applyTo: '**'
---

# Performance Optimization Standards

Optimize for Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1.

---

## Core Web Vitals Quick Reference

| Metric | Good | Needs Work | Poor | Measures |
|--------|------|-----------|------|----------|
| **LCP** | < 2.5s | 2.5–4s | > 4s | Largest element load time |
| **INP** | < 200ms | 200–500ms | > 500ms | Interaction-to-next-paint |
| **CLS** | < 0.1 | 0.1–0.25 | > 0.25 | Cumulative Layout Shift |

### LCP Phases
1. Time to First Byte (TTFB) — server response
2. Resource Load Delay — time from TTFB to LCP resource request
3. Resource Load Duration — time to load LCP resource
4. Render Delay — time from resource load to paint

### INP Phases
1. Input Delay — time from interaction to event handler start (< 50ms ideal)
2. Processing Time — time for event handler to complete (< 50ms ideal)
3. Presentation Delay — time for browser to render update

---

## Loading Anti-Patterns (L1–L10)

**L1**: No critical CSS extraction → inline critical CSS for above-fold content.

**L2**: Render-blocking scripts.
```html
<!-- BAD -->
<script src="analytics.js"></script>

<!-- GOOD -->
<script src="analytics.js" defer></script>
```

**L3**: Missing preconnect for third-party origins.
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

**L4**: LCP image not preloaded.
```html
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />
```

**L5**: Data fetching on client that could be server-side (waterfalls).

**L6**: Missing `fetchpriority="high"` on LCP `<img>`.

**L7**: No Brotli compression configured on server.

**L8**: Large uncompressed JSON API responses — paginate and stream.

**L9**: No route preloading for likely next navigation.

**L10**: Eagerly loading below-fold third-party widgets (maps, embeds).

---

## Rendering Anti-Patterns (R1–R8)

**R1**: Marking entire page/layout as `'use client'` unnecessarily.
```tsx
// BAD — entire layout re-renders client-side
'use client';
export default function Layout({ children }) { ... }

// GOOD — push client state to leaf components
export default function Layout({ children }) {
  return <main>{children}<ThemeToggle /></main>; // ThemeToggle uses 'use client'
}
```

**R2**: Missing Suspense boundaries for async components.
```tsx
<Suspense fallback={<PlayerCardSkeleton />}>
  <PlayerStats playerId={id} />
</Suspense>
```

**R3**: Not using streaming SSR for slow data → use `loading.tsx` in App Router.

**R4**: Heavy computations blocking main thread → use `useTransition`.
```tsx
const [isPending, startTransition] = useTransition();
startTransition(() => setSearchQuery(value));
```

**R5**: Filtering/sorting large arrays on every render → use `useMemo`.

**R6**: `useDeferredValue` not used to defer non-urgent state updates.

**R7**: Long lists without virtualization (> 100 items) → use `@tanstack/virtual`.

**R8**: Unmemoized context value causing entire tree re-render.
```tsx
// BAD — new object on every render
<GameContext.Provider value={{ player, setPlayer }}>

// GOOD
const value = useMemo(() => ({ player, setPlayer }), [player]);
<GameContext.Provider value={value}>
```

---

## JavaScript Anti-Patterns (J1–J8)

**J1**: Long tasks blocking main thread (> 50ms) → break with `scheduler.yield()`.
```js
// Chrome 129+ / Firefox 129+ (check before use — NOT in Safari as of April 2026)
for (const item of largeArray) {
  process(item);
  if (typeof scheduler !== 'undefined' && 'yield' in scheduler) {
    await scheduler.yield();
  }
}
```

**J2**: Layout thrashing — batch reads before writes.
```js
// BAD — interleaved read/write causes forced reflows
el.style.width = `${el.offsetWidth + 10}px`;

// GOOD — read all, then write all
const width = el.offsetWidth;
requestAnimationFrame(() => { el.style.width = `${width + 10}px`; });
```

**J3**: Event listeners without cleanup.
```tsx
useEffect(() => {
  const controller = new AbortController();
  window.addEventListener('resize', handler, { signal: controller.signal });
  return () => controller.abort();
}, []);
```

**J4**: Not debouncing/throttling high-frequency events (scroll, resize, input).

**J5**: Synchronous `localStorage` in render — use `useEffect` or server cookies.

**J6**: `JSON.parse`/`JSON.stringify` on large objects in render cycle.

**J7**: Unguarded `new Date()` causing hydration mismatch.

**J8**: `useEffect` with missing dependencies causing stale closure bugs.

---

## CSS Anti-Patterns (C1–C7)

**C1**: Animating layout-triggering properties.
```css
/* BAD — triggers layout recalculation */
.card:hover { width: 300px; margin-top: 10px; }

/* GOOD — compositor-only */
.card:hover { transform: scale(1.02); }
```

**C2**: Not using `content-visibility: auto` for off-screen sections.
```css
.game-history-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* estimated height */
}
```

**C3**: Not checking View Transitions API support before using.
```tsx
if (document.startViewTransition) {
  document.startViewTransition(() => navigate(url));
} else {
  navigate(url);
}
```

**C4**: `will-change` applied to too many elements (GPU memory waste).

**C5**: CSS custom properties not used for theming — increases maintainability.

**C6**: `@import` in CSS (blocking) — use `<link>` or native bundler imports.

**C7**: Unused CSS not purged — Tailwind handles this automatically in production.

---

## Image Anti-Patterns (I1–I8)

**I1**: Images without explicit `width` and `height` → causes CLS.
```tsx
// BAD
<img src="/player.jpg" />

// GOOD
<img src="/player.jpg" width={300} height={200} alt="Player photo" />

// BEST (Next.js)
<Image src="/player.jpg" width={300} height={200} alt="Player photo" />
```

**I2**: `loading="lazy"` on above-fold images (delays LCP).
```tsx
// Hero image — NEVER lazy load
<Image src="/hero.webp" priority alt="..." />

// Below fold — lazy is correct default in next/image
<Image src="/card.webp" alt="..." />
```

**I3**: No modern format (WebP/AVIF) — `next/image` handles automatically.

**I4**: No responsive `srcset` — `next/image` handles with `sizes` prop.
```tsx
<Image src="/player.jpg" sizes="(max-width: 768px) 100vw, 50vw" fill alt="..." />
```

**I5**: Font not using `font-display: swap` or `optional`.

**I6**: Not preloading critical fonts.
```html
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />
```

**I7**: SVG not inlined for small icons (HTTP request overhead).

**I8**: Background images via CSS without lazy loading strategy.

---

## Bundle Anti-Patterns (B1–B6)

**B1**: Importing from barrel files (causes full module pull in).
```ts
// BAD — imports entire library
import { format } from 'date-fns';

// GOOD for tree-shaking (date-fns v3 supports both)
import { format } from 'date-fns/format';
```

**B2**: Using `require()` (CommonJS) instead of ESM `import`.

**B3**: `moment.js` for date handling — use `date-fns` or `Temporal` API instead.

**B4**: No code splitting for heavy routes.
```tsx
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});
```

**B5**: `package.json` missing `"sideEffects": false` for library packages.

**B6**: Not analyzing bundle — run `ANALYZE=true next build` periodically.

---

## Next.js Specific (NX1–NX6)

**NX1**: Using `<img>` instead of `next/image` — loses optimization, lazy loading, WebP conversion.

**NX2**: Using `unstable_cache` in Next.js 16+ — use `"use cache"` directive instead.
```tsx
// Next.js 16+ (App Router)
async function getGameHistory(userId: string) {
  'use cache';
  cacheLife('hours');
  cacheTag(`user-${userId}-history`);
  return db.query.gameHistory.findMany({ where: eq(table.userId, userId) });
}
```

**NX3**: Importing server-only code in Client Components — use `server-only` package.
```ts
import 'server-only'; // throws if accidentally imported in client
```

**NX4**: Fetching data on client when it can be a Server Component.

**NX5**: Using `next/font` incorrectly — must be called at module level, not inside component.
```tsx
// GOOD — module level
const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function RootLayout({ children }) {
  return <html className={inter.className}>{children}</html>;
}
```

**NX6**: No cache invalidation strategy — use `revalidateTag()` after mutations.
```tsx
// Server Action
async function submitAnswer(answer: string) {
  'use server';
  await processAnswer(answer);
  revalidateTag(`game-${gameId}`);
}
```

---

## Performance Checklist

### LCP Optimization
- [ ] LCP element identified (hero image or heading)
- [ ] `fetchpriority="high"` or `priority` on LCP image
- [ ] `preconnect` to external resource domains
- [ ] Critical CSS inlined or preloaded
- [ ] TTFB < 600ms (server response fast enough)

### INP Optimization
- [ ] No long tasks > 50ms on interaction handlers
- [ ] `useTransition` for non-urgent state updates
- [ ] Event handlers debounced where appropriate
- [ ] Heavy computation moved to Web Worker or server

### CLS Optimization
- [ ] All images have `width` + `height` attributes
- [ ] Fonts use `font-display: swap` and are preloaded
- [ ] Dynamic content inserts don't push layout (use `min-height` reservations)
- [ ] No ads/embeds without reserved space

### General
- [ ] `next build` completes without warnings
- [ ] Bundle analyzer reviewed (no unexpected large packages)
- [ ] `npm audit` passing (no high/critical vulnerabilities)
- [ ] `prefers-reduced-motion` respected in all animations
