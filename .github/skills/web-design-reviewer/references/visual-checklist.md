# Visual Inspection Checklist

Comprehensive checklist of items to verify during web design visual inspection.

---

## 1. Layout Verification

### Structural Integrity
- [ ] Header is correctly fixed/positioned at the top of the screen
- [ ] Footer is positioned at the bottom or end of content
- [ ] Main content area is center-aligned with appropriate max-width
- [ ] Navigation is displayed in the intended position

### Overflow
- [ ] Horizontal scrollbar is not unintentionally displayed
- [ ] Content does not overflow from parent elements
- [ ] Images fit within parent containers
- [ ] Tables do not exceed container width

### Alignment
- [ ] Grid items are evenly distributed
- [ ] Flex item alignment is correct
- [ ] Text alignment (left/center/right) is consistent
- [ ] Icons and text are vertically aligned
- [ ] Form labels and input fields are correctly positioned

---

## 2. Typography Verification

### Readability
- [ ] Body text font size is sufficient (minimum 16px recommended)
- [ ] Line height is appropriate (1.5-1.8 recommended)
- [ ] Characters per line is appropriate (40-80 characters)
- [ ] Spacing between paragraphs is sufficient
- [ ] Heading size hierarchy is clear (h1 > h2 > h3)

### Text Handling
- [ ] Long words wrap appropriately
- [ ] No text clipping occurs
- [ ] Ellipsis (...) displays correctly where needed

### Fonts
- [ ] Web fonts load correctly
- [ ] Fallback fonts are appropriate
- [ ] Font weights are as intended

---

## 3. Color & Contrast Verification

### Accessibility (WCAG 2.2 AA)
- [ ] Body text: Contrast ratio 4.5:1 or higher
- [ ] Large text (18px+ bold or 24px+): 3:1 or higher
- [ ] Interactive element borders: 3:1 or higher
- [ ] Focus indicators: Sufficient contrast with background

### Color Consistency
- [ ] Brand colors are unified throughout
- [ ] Link colors are consistent
- [ ] Error states are clear (not just color — use icon/text too)
- [ ] Success states are clear
- [ ] Hover/active state colors are appropriate

### Color Vision Diversity
- [ ] Information conveyed by shape and text, not just color
- [ ] Error messages don't rely solely on color

---

## 4. Responsive Verification

### Mobile (~375px)
- [ ] Content fits within screen width
- [ ] Touch targets are 44x44px or larger
- [ ] Text is readable size (16px+)
- [ ] No horizontal scrolling occurs
- [ ] Navigation is mobile-friendly (hamburger menu, etc.)
- [ ] Form inputs are easy to use

### Tablet (768px)
- [ ] Layout is optimized for tablet
- [ ] Two-column layouts display appropriately
- [ ] Image sizes are appropriate

### Desktop (1280px)
- [ ] Maximum width is set and content doesn't stretch too wide
- [ ] Spacing is sufficient
- [ ] Multi-column layouts function correctly
- [ ] Hover states are implemented

### Wide (1920px)
- [ ] Layout doesn't break on extra-large screens
- [ ] Max-width container keeps content readable

### Breakpoint Transitions
- [ ] Layout transitions smoothly when screen size changes
- [ ] No content disappears or duplicates at any viewport

---

## 5. Interactive Element Verification

### Buttons
- [ ] Default state is clear
- [ ] Hover state exists (desktop)
- [ ] Focus state is visually clear (2px outline minimum)
- [ ] Active (pressed) state exists
- [ ] Disabled state is distinguishable
- [ ] Loading state (if applicable)

### Links
- [ ] Links are visually identifiable (underline or color distinction)
- [ ] Hover state exists
- [ ] Focus state is clear

### Form Elements
- [ ] Input field boundaries are clear
- [ ] Placeholder text contrast is appropriate (not too dim)
- [ ] Visual feedback on focus
- [ ] Error state display
- [ ] Required field indication
- [ ] Dropdowns function correctly

---

## 6. Images & Media Verification

### Images
- [ ] Images display at appropriate size
- [ ] Aspect ratio is maintained (no stretching)
- [ ] High resolution display support (@2x / WebP)
- [ ] Lazy loading behavior works correctly
- [ ] Alt text present for meaningful images

### Video & Embeds
- [ ] Videos fit within containers
- [ ] Aspect ratio is maintained
- [ ] Embedded content is responsive

---

## 7. Accessibility Verification

### Keyboard Navigation
- [ ] All interactive elements accessible via Tab key
- [ ] Focus order is logical (top-to-bottom, left-to-right)
- [ ] Focus traps work correctly (modals, drawers)
- [ ] Skip to content link exists

### Screen Reader Support
- [ ] Images have descriptive alt text
- [ ] Forms have associated labels
- [ ] ARIA labels set on icon-only buttons
- [ ] Heading hierarchy is correct (h1 → h2 → h3)

### Motion
- [ ] Animations are not excessive
- [ ] `prefers-reduced-motion` is respected
- [ ] No content flashes more than 3 times per second

---

## 8. Performance-related Visual Issues

### Loading
- [ ] No layout shift (CLS) when images load — dimensions set
- [ ] No FOUT (Flash of Unstyled Text) from fonts
- [ ] Skeleton screens appropriate where applicable
- [ ] No jumping when dynamic content loads

### Animation
- [ ] Animations are smooth (60fps)
- [ ] No performance issues when scrolling
- [ ] Transitions feel natural and purposeful

---

## Priority Matrix

| Priority | Category | Examples |
|----------|----------|----------|
| P0 Critical | Functionality breaking | Complete overlap, content disappearance |
| P1 High | Serious UX issues | Unreadable text, inoperable buttons, mobile layout break |
| P2 Medium | Moderate issues | Alignment issues, spacing inconsistencies |
| P3 Low | Minor issues | Slight color variations, minor positioning differences |
