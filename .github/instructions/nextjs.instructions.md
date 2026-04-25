---
description: "Best practices for building Next.js (App Router) apps with modern caching, tooling, and server/client boundaries (aligned with Next.js 16.1.1)."
applyTo: "**/*.tsx, **/*.ts, **/*.jsx, **/*.js, **/*.css"
---

# Next.js Best Practices for LLMs (2026)

_Last updated: January 2026 (aligned to Next.js 16.1.1)_

## 1. Project Structure & Organization

- **Use the `app/` directory** (App Router) for all new projects.
- **Top-level folders:**
  - `app/` — Routing, layouts, pages, and route handlers
  - `public/` — Static assets
  - `lib/` — Shared utilities, API clients, and logic
  - `components/` — Reusable UI components
  - `hooks/` — Custom React hooks
  - `types/` — TypeScript type definitions
- **Colocation:** Place files near where they are used.
- **Route Groups:** Use parentheses (e.g., `(admin)`) to group routes without affecting the URL.
- **Private Folders:** Prefix with `_` to opt out of routing.
- **Feature Folders:** For large apps, group by feature (e.g., `app/dashboard/`, `app/auth/`).

## 2. Next.js 16+ App Router Best Practices

### 2.1. Server and Client Component Integration

**Never use `next/dynamic` with `{ ssr: false }` inside a Server Component.**

- Move all client-only logic into a dedicated Client Component (with `'use client'` at the top).
- Import and use that Client Component directly in the Server Component.

```tsx
// Server Component
import DashboardNavbar from "@/components/DashboardNavbar";

export default async function DashboardPage() {
  return (
    <>
      <DashboardNavbar /> {/* Client Component */}
    </>
  );
}
```

### 2.2. Next.js 16+ async request APIs

- APIs like `cookies()`, `headers()`, and `draftMode()` are **async** in App Router.
- `params` / `searchParams` may be Promises in Server Components — prefer `await`.
- Avoid dynamic rendering by accident; isolate dynamic parts behind `Suspense` boundaries.

## 3. Component Best Practices

- **Server Components** (default): For data fetching, heavy logic, and non-interactive UI.
- **Client Components:** Add `'use client'`. Use for interactivity, state, or browser APIs.
- **Naming Conventions:**
  - `PascalCase` for component files (e.g., `UserCard.tsx`)
  - `camelCase` for hooks (e.g., `useUser.ts`)
  - `kebab-case` for static assets
- **Props:** Use TypeScript interfaces. Prefer explicit prop types and default values.

## 4. Naming Conventions

- **Folders:** `kebab-case`
- **Files:** `PascalCase` for components, `camelCase` for utilities/hooks
- **Variables/Functions:** `camelCase`
- **Types/Interfaces:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE`

## 5. API Routes (Route Handlers)

- **Location:** `app/api/` (e.g., `app/api/users/route.ts`)
- **HTTP Methods:** Export async functions named after HTTP verbs (`GET`, `POST`, etc.)
- **Do NOT call your own Route Handlers from Server Components** — extract logic into `lib/`.
- **Validation:** Always validate and sanitize input (use `zod` or `yup`).
- **Authentication:** Protect sensitive routes using middleware or server-side session checks.

## 6. General Best Practices

- **TypeScript:** Enable `strict` mode in `tsconfig.json`.
- **Environment Variables:** Store secrets in `.env.local`. Never commit.
  - `NEXT_PUBLIC_` variables are **inlined at build time**.
- **Testing:** Use Jest, React Testing Library, or Playwright.
- **Performance:**
  - Use built-in Image and Font optimization.
  - Prefer Cache Components (`use cache`) over legacy caching.
  - Use Suspense and loading states for async data.
  - Avoid large client bundles; keep most logic in Server Components.
- **Security:**
  - Sanitize all user input.
  - Use HTTPS in production.
  - Set secure HTTP headers.
  - Never trust client input in Server Actions and Route Handlers.

## 7. Caching & Revalidation (Next.js 16 Cache Components)

- Enable via `cacheComponents: true` in `next.config.*`.
- Use the **`use cache` directive** to opt a component/function into caching.
- Use `cacheTag(...)` to associate cached results with tags.
- Use `cacheLife(...)` to control cache lifetime.
- Prefer `revalidateTag(tag, 'max')` (stale-while-revalidate).
- **Avoid `unstable_cache`** — treat as legacy.

## 8. Tooling (Next.js 16)

- **Turbopack is the default dev bundler.** Configure via top-level `turbopack` in `next.config.*`.
- **Typed routes** are stable via `typedRoutes`.

## 9. Avoid Unnecessary Example Files

Do not create example/demo files unless explicitly requested. Keep the repository clean.

## 10. Always Use the Latest Documentation

For every Next.js related request, search for up-to-date documentation using available tools.
