---
name: html-css-style-color-guide
description: 'Color theory and CSS styling standards for web applications. Covers the 60-30-10 color rule, background/text color guidelines, gradient best practices, and visual harmony principles.'
applyTo: '**/*.html, **/*.css, **/*.js, **/*.tsx, **/*.ts, **/*.jsx'
---

# HTML/CSS Style & Color Guide

Practical color usage standards to ensure visual harmony, readability, and brand consistency.

---

## The 60-30-10 Rule

The fundamental ratio for balanced color composition:

| Role | Percentage | Usage |
|------|-----------|-------|
| **Primary** | 60% | Backgrounds, large surfaces, base UI |
| **Secondary** | 30% | Cards, panels, sidebar, supporting elements |
| **Accent** | 10% | CTAs, highlights, interactive indicators, brand moments |

### Color Category Definitions

| Category | Examples | Use as |
|----------|----------|--------|
| **Hot colors** | Red, orange, yellow, coral | Accent (10%) only |
| **Cool colors** | Blue, teal, cyan, green, purple, grey | Primary/Secondary |
| **Neutral binary** | Black, white, off-white, near-black | Always safe for any role |
| **Warm neutrals** | Beige, warm grey, sand | Secondary or Primary |

---

## Background Color Guidelines

### ✅ DO Use
- White (`#ffffff`, `#fafafa`, `#f8f9fa`)
- Off-white / light cool (`#f0f4f8`, `#e8edf2`, `#f5f7fa`)
- Subtle light neutral (`#f9f9f9`, `#efefef`)
- Dark navy / near-black (`#0f1117`, `#111827`, `#0a0a0a`) for dark mode
- Dark cool grey (`#1a1d27`, `#16181f`) for dark mode panels

### ❌ NEVER Use as Background
- Purple, magenta, hot pink
- Red, orange, yellow
- Highly saturated greens

### Tailwind Reference
```tsx
// Light mode backgrounds
className="bg-white"                // Primary surface
className="bg-gray-50"             // Page background
className="bg-gray-100"            // Subtle section
className="bg-slate-100"           // Cool light

// Dark mode
className="bg-gray-900"            // Dark page
className="bg-gray-800"            // Dark card
className="bg-slate-800"           // Dark cool panel

// ❌ Never for backgrounds
className="bg-purple-500"          // TOO VIVID
className="bg-red-400"             // ACCENT ONLY
className="bg-yellow-300"          // ACCENT ONLY
```

---

## Text Color Guidelines

### On Light Backgrounds
| Role | Color | Tailwind | Hex |
|------|-------|----------|-----|
| Primary text | Near-black | `text-gray-900` | `#111827` |
| Body text | Dark grey | `text-gray-700` | `#374151` |
| Secondary / muted | Medium grey | `text-gray-500` | `#6b7280` |
| Placeholder | Light grey | `text-gray-400` | `#9ca3af` |

### On Dark Backgrounds
| Role | Color | Tailwind | Hex |
|------|-------|----------|-----|
| Primary text | Near-white | `text-gray-50` | `#f9fafb` |
| Body text | Light grey | `text-gray-200` | `#e5e7eb` |
| Secondary / muted | Muted white | `text-gray-400` | `#9ca3af` |
| Placeholder | Dimmed | `text-gray-500` | `#6b7280` |

### ❌ Never Use for Text
- Yellow, lime, pink, coral on any background
- Brand accent color for long body text (only for links/labels)
- Same color as background (obvious, but check hover states)

---

## Accent Color Usage

Accent colors should appear in:
- Primary CTA buttons
- Active navigation indicators
- Key data highlights (ELO gain, score)
- Progress bars and loading indicators
- Badge/chip labels
- Link colors within body text

```tsx
// Football Connections — accent system example
// Primary accent: Blue (engagement, trust, action)
// Secondary accent: Green (success, correct answer)
// Danger: Red (wrong answer, time out) — still accent-only

const colors = {
  accent: {
    primary: 'bg-blue-600 hover:bg-blue-500',    // CTAs
    success: 'bg-green-500',                      // Correct answer
    danger:  'bg-red-500',                        // Wrong answer / alert
    warning: 'bg-amber-500',                      // Caution (timer low)
  }
};
```

---

## Gradient Best Practices

### ✅ DO
- Use gradient within the **same color family** (blue-600 → blue-800)
- Use gradient for **subtle depth** (background → slightly darker background)
- Use gradient on **cards, hero sections, buttons**
- Prefer `linear-gradient` over `radial-gradient` for most uses

### ❌ DON'T
- Gradient across **opposing hues** (red → green, orange → purple)
- Use gradient on **body text** (except decorative display headings)
- Multiple gradients competing on the same viewport section

### Tailwind Gradient Patterns
```tsx
// Subtle dark background depth
className="bg-gradient-to-br from-gray-900 to-slate-800"

// Card highlight accent
className="bg-gradient-to-r from-blue-600 to-blue-700"

// Glass layer overlay (over dark background)
className="bg-gradient-to-b from-white/5 to-white/0"

// ❌ Avoid — clashing hues
className="bg-gradient-to-r from-red-500 to-green-500"
```

---

## Visual Harmony Quick Rules

1. **Limit palette**: 1 brand color + 1 accent + neutrals. Add a second accent only for semantic states (success, error, warning).
2. **Variation within family**: Use shades of the same hue (blue-400/blue-600/blue-800) rather than different hues (blue/purple/teal).
3. **Dark mode mirror**: Light mode primary → dark mode equivalent (white → gray-900, gray-100 → gray-800).
4. **Saturation discipline**: High saturation = small area only. Large areas = desaturated/muted tones.
5. **Test blindness simulation**: Ensure all meaning works without color—add icons, patterns, or labels.

---

## Football Connections Palette Reference

```tsx
// Tailwind config extension for the project
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      brand: {
        primary: '#2563eb',   // Blue — main actions
        success: '#16a34a',   // Green — correct chain
        danger:  '#dc2626',   // Red — wrong answer
        warning: '#d97706',   // Amber — timer < 5s
      }
    }
  }
}
```
