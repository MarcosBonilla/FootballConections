---
name: gsap-framer-scroll-animation
description: >-
  Use this skill whenever the user wants to build scroll animations, scroll effects,
  parallax, scroll-triggered reveals, pinned sections, horizontal scroll, text animations,
  or any motion tied to scroll position — in vanilla JS, React, or Next.js.
  Covers GSAP ScrollTrigger and Framer Motion / Motion v12 (useScroll, useTransform,
  useSpring, whileInView, variants). Also triggers for: "animate on scroll",
  "fade in as I scroll", "parallax effect", "sticky section", "entrance animation".
  Pairs with the premium-frontend-ui skill for creative philosophy and design-level polish.
---

# GSAP & Framer Motion — Scroll Animations

Production-grade scroll animations with ready-to-use code recipes.

> **Design Companion:** This skill provides the *technical implementation* for scroll-driven motion.
> For the *creative philosophy*, always cross-reference the **premium-frontend-ui** skill.
> premium-frontend-ui decides the **what** and **why**; this skill delivers the **how**.

---

## Quick Library Selector

| Need | Use |
|------|-----|
| Vanilla JS, Webflow, Vue | **GSAP** |
| Pinning, horizontal scroll, complex timelines | **GSAP** |
| React / Next.js, declarative style | **Framer Motion** |
| `whileInView` entrance animations | **Framer Motion** |
| Both in same Next.js app | Both (separate concerns) |

---

## Setup (Always Do First)

### GSAP
```bash
npm install gsap
```
```js
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger); // MUST call before any ScrollTrigger usage
```

### Framer Motion (Motion v12, 2025)
```bash
npm install motion   # new package name since mid-2025
# or: npm install framer-motion  — still works, same API
```
```js
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
```

---

## The 5 Most Common Scroll Patterns

### 1. Fade-in on enter (GSAP)
```js
gsap.from('.card', {
  opacity: 0, y: 50, stagger: 0.15, duration: 0.8,
  scrollTrigger: { trigger: '.card', start: 'top 85%' }
});
```

### 2. Fade-in on enter (Framer Motion)
```jsx
<motion.div
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-80px' }}
  transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
/>
```

### 3. Scrub / scroll-linked (GSAP)
```js
gsap.to('.hero-img', {
  scale: 1.3, opacity: 0, ease: 'none',
  scrollTrigger: {
    trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true
  }
});
```

### 4. Scroll-linked (Framer Motion)
```jsx
const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
return <motion.div style={{ y }} />;
```

### 5. Pinned timeline (GSAP)
```js
const tl = gsap.timeline({
  scrollTrigger: { trigger: '.section', pin: true, scrub: 1, start: 'top top', end: '+=200%' }
});
tl.from('.title', { opacity: 0, y: 60 }).from('.img', { scale: 0.85 });
```

---

## Critical Rules (Apply Always)

- **GSAP**: always call `gsap.registerPlugin(ScrollTrigger)` before using it
- **GSAP scrub**: always use `ease: 'none'` — easing feels wrong when scrub is active
- **GSAP React**: use `useGSAP` from `@gsap/react`, never plain `useEffect` — it auto-cleans ScrollTriggers
- **GSAP debug**: add `markers: true` during development; remove before production
- **Framer**: `useTransform` output must go into `style` prop of a `motion.*` element, not a plain div
- **Framer Next.js**: always add `'use client'` at top of any file using motion hooks
- **Both**: animate only `transform` and `opacity` — avoid `width`, `height`, `box-shadow`
- **Accessibility**: always check `prefers-reduced-motion`

```jsx
// Accessibility guard pattern
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// GSAP
if (!prefersReducedMotion) {
  gsap.from('.card', { opacity: 0, y: 50, scrollTrigger: { trigger: '.card' } });
}

// Framer Motion
<motion.div
  initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
  whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
  viewport={{ once: true }}
/>
```

---

## Advanced Patterns for Football Connections Game

### Match result reveal (staggered)
```jsx
// Framer Motion — reveal chain nodes one by one
const chainContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } }
};
const chainNode = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } }
};

<motion.div variants={chainContainer} initial="hidden" animate="show">
  {chain.map((player) => (
    <motion.div key={player.id} variants={chainNode} className="chain-node">
      {player.name}
    </motion.div>
  ))}
</motion.div>
```

### ELO change animation
```jsx
const elo = useMotionValue(previousElo);
const rounded = useTransform(elo, Math.round);
useEffect(() => {
  animate(elo, newElo, { duration: 1.5, ease: 'easeOut' });
}, [newElo]);
return <motion.span>{rounded}</motion.span>;
```

### Turn timer with spring physics
```jsx
const progress = useMotionValue(1);
const scaleX = useSpring(progress, { stiffness: 100, damping: 30 });
// Update: animate(progress, remainingTime / totalTime, { duration: 0.3 });
<motion.div style={{ scaleX, originX: 0 }} className="h-1 bg-blue-500" />
```

---

## Copilot Prompting Tips

- Specify selector, start/end strings, and whether you want scrub or toggleActions
- For Framer, specify: `useScroll` vs `whileInView`, offset values, what to transform
- Paste the exact error message when asking for fixes
