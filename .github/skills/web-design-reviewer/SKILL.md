---
name: web-design-reviewer
description: 'This skill enables visual inspection of websites running locally or remotely to identify and fix design issues. Triggers on requests like "review website design", "check the UI", "fix the layout", "find design problems". Detects issues with responsive design, accessibility, visual consistency, and layout breakage, then performs fixes at the source code level.'
---

# Web Design Reviewer

This skill enables visual inspection and validation of website design quality, identifying and fixing issues at the source code level.

## Scope of Application

- Next.js App Router projects (primary target)
- React SPAs
- Any web application with Tailwind CSS

## Prerequisites

1. **Target website must be running** — `http://localhost:3000` or staging URL
2. **Browser automation available** — screenshot capture, page navigation, DOM retrieval
3. **Access to source code** — for fixing detected issues

---

## Workflow Overview

```
Step 1: Information Gathering
  ↓
Step 2: Visual Inspection (screenshot + DOM)
  ↓
Step 3: Issue Fixing (source-level)
  ↓
Step 4: Re-verification
  ↓
Issues Remaining? → Yes → Step 2 | No → Completion Report
```

---

## Step 1: Information Gathering

Automatically detect from workspace:
- `package.json` → Framework and dependencies
- `tailwind.config.*` → Tailwind CSS
- `next.config.*` → Next.js
- `app/` or `src/` → Source directory

Ask if unclear:
- Framework (Next.js, React, etc.)
- Styling method (Tailwind / CSS Modules / CSS-in-JS)
- Review scope (specific pages or entire site)

---

## Step 2: Visual Inspection Phase

### 2.1 Page Traversal
1. Navigate to URL
2. Capture full-page screenshot
3. Retrieve DOM snapshot
4. Traverse all navigation links

### 2.2 Inspection Items

#### Layout Issues (High/Medium Severity)
| Issue | Severity |
|-------|----------|
| Element overflow from parent/viewport | High |
| Unintended element overlap | High |
| Grid/flex alignment problems | Medium |
| Inconsistent padding/margin | Medium |
| Text clipping on long content | Medium |

#### Responsive Issues
| Issue | Severity |
|-------|----------|
| Layout breaks on mobile | High |
| Unnatural breakpoint transitions | Medium |
| Touch targets too small (< 44px) | Medium |

#### Accessibility Issues
| Issue | Severity |
|-------|----------|
| Text contrast ratio < 4.5:1 | High |
| No visible focus state | High |
| Missing alt text on images | Medium |

#### Visual Consistency
| Issue | Severity |
|-------|----------|
| Mixed font families | Medium |
| Non-unified brand colors | Medium |
| Inconsistent spacing between similar elements | Low |

### 2.3 Viewport Testing
| Name | Width | Device |
|------|-------|--------|
| Mobile | 375px | iPhone SE/12 mini |
| Tablet | 768px | iPad |
| Desktop | 1280px | Standard PC |
| Wide | 1920px | Large display |

---

## Step 3: Issue Fixing Phase

### Priority Matrix
| Priority | Category | Examples |
|----------|----------|----------|
| P0 Critical | Functionality breaking | Complete element overlap, content disappearance |
| P1 High | Serious UX | Unreadable text, inoperable buttons |
| P2 Medium | Moderate | Alignment issues, spacing inconsistencies |
| P3 Low | Minor | Slight positioning differences |

### Fix Principles
1. **Minimal Changes** — only make changes necessary to resolve the issue
2. **Respect Existing Patterns** — follow existing Tailwind class conventions
3. **Avoid Breaking Changes** — verify other pages/viewports not affected
4. **Add Comments** — explain the reason for fixes

### Tailwind Fix Patterns
```tsx
// ❌ Overflow issue
<div className="flex gap-4">
  <div className="w-96">...</div> {/* breaks on mobile */}
</div>

// ✅ Fixed
<div className="flex flex-col gap-4 md:flex-row">
  <div className="w-full md:w-96">...</div>
</div>

// ❌ Text contrast issue
<p className="text-gray-300 bg-gray-100">...</p>

// ✅ Fixed (contrast 4.5:1+)
<p className="text-gray-700 bg-gray-100">...</p>

// ❌ Touch target too small
<button className="p-1 text-xs">...</button>

// ✅ Fixed (44px minimum)
<button className="min-h-[44px] min-w-[44px] px-4 py-2 text-sm">...</button>
```

---

## Step 4: Re-verification

1. Reload browser (or wait for HMR)
2. Capture screenshots of fixed areas
3. Compare before/after
4. Test all breakpoints again
5. If > 3 fix attempts on same issue → consult user

---

## Output Format

```markdown
# Web Design Review — Football Connections

## Summary
| Item | Value |
|------|-------|
| URL | http://localhost:3000 |
| Framework | Next.js 15 App Router |
| Styling | Tailwind CSS |
| Viewports Tested | Mobile (375px), Tablet (768px), Desktop (1280px) |
| Issues Detected | N |
| Issues Fixed | M |

## Detected Issues

### [P1] Mobile Navigation Overflow
- **Page**: `/`
- **Element**: `.nav-links`
- **Issue**: Navigation links overflow on 375px viewport
- **Fixed File**: `app/components/Nav.tsx`
- **Fix**: Added `flex-wrap` and reduced gap on mobile

## Recommendations
- Consider adding skeleton loaders for game board
- Ensure ELO rating update animation is accessible
```

---

## Required Capabilities

| Capability | Required |
|------------|----------|
| Web Page Navigation | ✅ |
| Screenshot Capture | ✅ |
| DOM Retrieval | Recommended |
| File Read/Write | Required for fixes |
| Code Search | Required for fixes |

Use Playwright MCP (`browser_navigate`, `browser_take_screenshot`, `browser_snapshot`, `browser_resize`) when available.

---

## Visual Checklist Reference

See `references/visual-checklist.md` for the complete 8-category inspection checklist covering:
1. Layout Verification
2. Typography Verification
3. Color & Contrast (WCAG standards)
4. Responsive Verification (4 breakpoints)
5. Interactive Element States
6. Images & Media
7. Accessibility
8. Performance-related Visual Issues
