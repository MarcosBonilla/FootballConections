# Component Spec: ServerErrorPage (500)

## Descripción
Página de error 500 "Server Error" con tracking ID único para debugging, retry functionality, y ETA opcional de resolución si el error es conocido.

---

## Props Interface

```typescript
interface ServerErrorPageProps {
  error?: Error;
  reset?: () => void; // Next.js error boundary prop
  trackingId?: string; // Generated server-side
  estimatedResolution?: string; // e.g., "30 minutes" if planned maintenance
}
```

---

## Layout

```
┌──────────────────────────────────────────┐
│                                          │
│          🚨 500 🚨                       │
│                                          │
│    TECHNICAL FOUL!                       │
│                                          │
│   Something went wrong on our end.       │
│   Our team has been notified.            │
│                                          │
│   Error Tracking ID:                     │
│   #FC-2025-01-15-A3F7B                  │
│                                          │
│   [Try Again]    [Go Home]              │
│                                          │
│   Still not working?                     │
│   Contact support@footballconnect.com    │
│                                          │
└──────────────────────────────────────────┘
```

---

## Estados

### 1. Generic Server Error (default)
Sin ETA, tracking ID aleatorio, mensaje genérico.

### 2. Maintenance Mode
```
┌──────────────────────────────────────────┐
│          🔧 Maintenance                  │
│                                          │
│   We're upgrading the pitch!             │
│                                          │
│   Expected back in: 25 minutes           │
│                                          │
│   (Auto-refresh countdown)               │
└──────────────────────────────────────────┘
```

### 3. Database Connection Error
```
┌──────────────────────────────────────────┐
│          ⚠️ Service Unavailable          │
│                                          │
│   Unable to connect to database.         │
│   Retrying automatically...              │
│                                          │
│   [Retry Now (3s)]                      │
└──────────────────────────────────────────┘
```

---

## Tracking ID Generation

```typescript
// Server-side (error.tsx)
function generateTrackingId(): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `FC-${date}-${random}`;
}
```

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';

export default function ServerErrorPage({
  error,
  reset,
  trackingId: propTrackingId,
  estimatedResolution,
}: ServerErrorPageProps) {
  const [trackingId] = useState(propTrackingId || generateClientTrackingId());
  const [countdown, setCountdown] = useState(3);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Auto-countdown for retry
  useEffect(() => {
    if (countdown <= 0) return;
    
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown]);
  
  const handleRetry = async () => {
    setIsRetrying(true);
    
    // Log retry attempt
    fetch('/api/log/error-retry', {
      method: 'POST',
      body: JSON.stringify({ trackingId }),
    });
    
    // Wait a bit for any transient issues to resolve
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    reset?.();
    setIsRetrying(false);
  };
  
  const handleCopyTrackingId = () => {
    navigator.clipboard.writeText(trackingId);
    alert('Tracking ID copied to clipboard');
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-gray-900 to-black">
      
      {/* Warning Icon */}
      <motion.div
        animate={{
          rotate: [0, -10, 10, -10, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 2,
          repeatDelay: 2,
        }}
        className="text-6xl mb-6"
      >
        🚨
      </motion.div>
      
      {/* Error Code */}
      <h1 className="text-8xl md:text-9xl font-bold text-red-500 mb-4">
        500
      </h1>
      
      {/* Title */}
      <h2 className="text-3xl md:text-4xl font-bold mb-4">
        TECHNICAL FOUL!
      </h2>
      
      {/* Description */}
      <p className="text-lg text-gray-400 text-center max-w-md mb-6">
        {estimatedResolution ? (
          <>We're performing scheduled maintenance. Expected back in <strong>{estimatedResolution}</strong>.</>
        ) : (
          <>Something went wrong on our end. Our team has been notified and is working on it.</>
        )}
      </p>
      
      {/* Tracking ID */}
      <div className="mb-8 text-center">
        <p className="text-sm text-gray-500 mb-2">Error Tracking ID:</p>
        <button
          onClick={handleCopyTrackingId}
          className="
            px-4 py-2 bg-gray-800 hover:bg-gray-700
            rounded-lg font-mono text-sm
            border border-gray-700
            transition
            flex items-center gap-2
          "
          title="Click to copy"
        >
          <span>#{trackingId}</span>
          <span className="text-xs">📋</span>
        </button>
      </div>
      
      {/* CTAs */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {reset && (
          <button
            onClick={handleRetry}
            disabled={isRetrying || countdown > 0}
            className="
              px-6 py-3 bg-blue-600 hover:bg-blue-700
              rounded-lg font-semibold transition
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isRetrying ? (
              '🔄 Retrying...'
            ) : countdown > 0 ? (
              `Retry (${countdown}s)`
            ) : (
              'Try Again'
            )}
          </button>
        )}
        
        <Link
          href="/"
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition"
        >
          Go Home
        </Link>
      </div>
      
      {/* Support */}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-2">Still not working?</p>
        <a
          href="mailto:support@footballconnect.com"
          className="text-blue-500 hover:underline text-sm"
        >
          support@footballconnect.com
        </a>
        <p className="text-xs text-gray-600 mt-1">
          Include the tracking ID above in your message
        </p>
      </div>
      
      {/* Dev-only Error Details */}
      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-8 p-4 bg-gray-800 rounded-lg max-w-2xl w-full">
          <summary className="cursor-pointer text-sm text-gray-400 mb-2">
            Developer Info
          </summary>
          <pre className="text-xs text-red-400 overflow-auto">
            {error.message}
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}

function generateClientTrackingId(): string {
  const date = new Date().toISOString().split('T')[0];
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `FC-${date}-${random}`;
}
```

---

## Global Error Boundary (Next.js)

```tsx
// app/global-error.tsx
'use client';

import { useEffect } from 'react';
import ServerErrorPage from '@/components/errors/ServerErrorPage';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Global error:', error);
    
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: true,
      });
    }
  }, [error]);
  
  return (
    <html lang="es">
      <body>
        <ServerErrorPage
          error={error}
          reset={reset}
          trackingId={error.digest}
        />
      </body>
    </html>
  );
}
```

---

## Error Logging Service

```typescript
// app/api/log/error/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { trackingId, error, url, userAgent } = await request.json();
  
  await db.errorLog.create({
    data: {
      trackingId,
      message: error.message,
      stack: error.stack,
      url,
      userAgent,
      timestamp: new Date(),
    },
  });
  
  // Send to error monitoring service (Sentry, Datadog, etc.)
  
  return NextResponse.json({ success: true });
}
```

---

## Metadata (Next.js)

```typescript
export const metadata: Metadata = {
  title: '500 - Server Error | Football Connections',
  description: 'An error occurred on our server.',
  robots: 'noindex, nofollow',
};
```

---

## Accessibility

- [ ] Error details announced to screen readers
- [ ] Tracking ID copyable via keyboard
- [ ] Retry button disabled state announced
- [ ] Countdown timer announced (aria-live)
- [ ] Links have descriptive text
- [ ] Color contrast >= 4.5:1

---

## Testing

### Unit Tests
- [ ] Tracking ID generated correctly
- [ ] Retry button disabled during retry
- [ ] Countdown decrements correctly
- [ ] Copy tracking ID works
- [ ] Error details only shown in dev

### E2E Tests
```typescript
test('500 error page shows and allows retry', async ({ page }) => {
  // Force 500 error
  await page.route('**/api/test', route => 
    route.fulfill({ status: 500, body: 'Error' })
  );
  
  await page.goto('/test-error');
  
  await expect(page.locator('h1')).toContainText('500');
  
  const trackingId = await page.locator('[title="Click to copy"]').textContent();
  expect(trackingId).toMatch(/^#FC-\d{4}-\d{2}-\d{2}-[A-Z0-9]{6}$/);
  
  const retryButton = page.getByRole('button', { name: /Try Again/ });
  await expect(retryButton).toBeVisible();
});
```

---

## Monitoring Integration

### Sentry Example
```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  beforeSend(event, hint) {
    // Add tracking ID to Sentry event
    if (hint.originalException instanceof Error) {
      event.tags = {
        ...event.tags,
        trackingId: generateTrackingId(),
      };
    }
    return event;
  },
});
```

---

## Notas para Backend Architect

1. **Database Logging:** Todas las 500 errors deben loggearse con:
   - Tracking ID
   - Error message + stack
   - Request URL + method
   - User ID (si está autenticado)
   - Timestamp
   - User agent

2. **Status Page:** Considerar integrar con status page (e.g., StatusPage.io) para mostrar incidents en tiempo real.

3. **Retry Strategy:** Implementar exponential backoff en backend para evitar thundering herd problem.

4. **Alerting:** Configurar alertas para alta tasa de 500 errors (> 5% de requests en 5 minutos).

5. **Maintenance Mode:** Usar feature flag o variable de entorno para activar maintenance mode sin deployar.
