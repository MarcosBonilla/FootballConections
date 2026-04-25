# Component Spec: EmailVerificationBanner

## Descripción
Banner de alerta persistente para usuarios con email no verificado. Incluye botón para reenviar email de verificación con cooldown, y opción de cerrar temporalmente.

---

## Props Interface

```typescript
interface EmailVerificationBannerProps {
  email: string;
  onResend?: () => void;
  onDismiss?: () => void; // Hide banner for 24h
  autoDismiss?: boolean; // Auto-hide after 7 days (default: false)
}
```

---

## Layout

```
┌─────────────────────────────────────────────────────┐
│  ⚠️  Verify your email to unlock all features       │
│  We sent a verification link to john@example.com    │
│  [Resend Email]                          [Dismiss X]│
└─────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌──────────────────────────┐
│  ⚠️  Verify your email   │
│  john@example.com        │
│  [Resend]      [X]       │
└──────────────────────────┘
```

---

## Estados

### 1. Initial (sin verificar)
Banner visible arriba del dashboard.

### 2. Resend Cooldown
```
┌─────────────────────────────────────────────────┐
│  ⚠️  Verify your email                          │
│  [Resend in 52s]                      [Dismiss] │
└─────────────────────────────────────────────────┘
```

### 3. Email Sent Success
```
┌─────────────────────────────────────────────────┐
│  ✅  Verification email sent! Check your inbox  │
│  [Resend in 60s]                      [Dismiss] │
└─────────────────────────────────────────────────┘
```

### 4. Dismissed (hidden for 24h)
Banner no se muestra. Guardado en `localStorage`:
```json
{
  "emailVerificationBannerDismissed": "2026-04-25T10:30:00Z"
}
```

### 5. Verified
Banner no se muestra nunca más (user.emailVerified !== null).

---

## Reglas de Negocio

**RN-01**: Banner solo aparece si `user.emailVerified === null`.

**RN-02**: Cooldown de **60 segundos** entre resends.

**RN-03**: Rate limiting: **3 resends máximo por día**.

**RN-04**: Dismiss es temporal (24 horas), banner reaparece después.

**RN-05**: Después de 7 días sin verificar, el banner se vuelve **no-dismissible** (opcional con `autoDismiss={false}`).

**RN-06**: Si usuario verifica email en otra pestaña, banner desaparece automáticamente (via polling o WebSocket).

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const COOLDOWN_SECONDS = 60;
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const DISMISS_KEY = 'emailVerificationBannerDismissed';

export function EmailVerificationBanner({
  email,
  onResend,
  onDismiss,
  autoDismiss = false,
}: EmailVerificationBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  
  // Check if banner was dismissed
  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissTime = new Date(dismissedAt).getTime();
      const now = Date.now();
      
      if (now - dismissTime < DISMISS_DURATION_MS) {
        setIsVisible(false);
        return;
      } else {
        // Dismiss expired, remove from storage
        localStorage.removeItem(DISMISS_KEY);
      }
    }
  }, []);
  
  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    
    const timer = setInterval(() => {
      setCooldown(c => c - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [cooldown]);
  
  const handleResend = async () => {
    if (cooldown > 0 || resendCount >= 3) return;
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'RATE_LIMIT_EXCEEDED') {
          alert('Maximum resends reached for today. Try again tomorrow.');
          return;
        }
        throw new Error(data.error);
      }
      
      setCooldown(COOLDOWN_SECONDS);
      setShowSuccess(true);
      setResendCount(resendCount + 1);
      onResend?.();
      
      // Hide success message after 5s
      setTimeout(() => setShowSuccess(false), 5000);
      
    } catch (error) {
      console.error('Resend verification email error:', error);
      alert('Failed to resend verification email. Please try again.');
    }
  };
  
  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setIsVisible(false);
    onDismiss?.();
  };
  
  // Auto-poll to check if email was verified
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/auth/check-verification');
        const data = await response.json();
        
        if (data.verified) {
          setIsVisible(false);
          clearInterval(pollInterval);
        }
      } catch (error) {
        // Ignore polling errors
      }
    }, 10000); // Poll every 10 seconds
    
    return () => clearInterval(pollInterval);
  }, []);
  
  if (!isVisible) return null;
  
  const canDismiss = autoDismiss || resendCount === 0; // Can't dismiss after resending
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div
          className={`
            px-4 py-3 flex items-center justify-between gap-4
            ${showSuccess
              ? 'bg-green-500/10 border-b border-green-500'
              : 'bg-yellow-500/10 border-b border-yellow-500'
            }
          `}
          role="alert"
        >
          {/* Icon + Message */}
          <div className="flex items-center gap-3 flex-1">
            <span className="text-2xl flex-shrink-0">
              {showSuccess ? '✅' : '⚠️'}
            </span>
            
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${showSuccess ? 'text-green-400' : 'text-yellow-400'}`}>
                {showSuccess ? 'Verification email sent!' : 'Verify your email to unlock all features'}
              </p>
              <p className="text-sm text-gray-400 truncate">
                {showSuccess ? 'Check your inbox' : `We sent a link to ${email}`}
              </p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Resend Button */}
            <button
              onClick={handleResend}
              disabled={cooldown > 0 || resendCount >= 3}
              className="
                px-4 py-2 bg-yellow-600 hover:bg-yellow-700
                rounded-lg text-sm font-semibold transition
                disabled:opacity-50 disabled:cursor-not-allowed
                whitespace-nowrap
              "
            >
              {cooldown > 0
                ? `Resend in ${cooldown}s`
                : resendCount >= 3
                ? 'Limit reached'
                : 'Resend Email'
              }
            </button>
            
            {/* Dismiss Button */}
            {canDismiss && (
              <button
                onClick={handleDismiss}
                className="
                  p-2 hover:bg-gray-700 rounded-lg transition
                  text-gray-400 hover:text-white
                "
                aria-label="Dismiss for 24 hours"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## Layout Wrapper (uso típico)

```tsx
// app/dashboard/layout.tsx
import { auth } from '@/auth';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';

export default async function DashboardLayout({ children }) {
  const session = await auth();
  
  return (
    <div>
      {session?.user && !session.user.emailVerified && (
        <EmailVerificationBanner email={session.user.email} />
      )}
      
      <main>{children}</main>
    </div>
  );
}
```

---

## API Endpoints

### Resend Verification Email

```typescript
// app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendVerificationEmail } from '@/lib/email';
import { db } from '@/lib/db';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Rate limiting: 3 per day per user
  const rateKey = `resend-verification:${session.user.id}`;
  const count = await redis.incr(rateKey);
  
  if (count === 1) {
    await redis.expire(rateKey, 86400); // 24 hours
  }
  
  if (count > 3) {
    return NextResponse.json(
      { error: 'RATE_LIMIT_EXCEEDED' },
      { status: 429 }
    );
  }
  
  // Generate new verification token
  const token = crypto.randomUUID();
  
  await db.verificationToken.create({
    data: {
      identifier: session.user.email,
      token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
  });
  
  // Send email
  await sendVerificationEmail({
    to: session.user.email,
    token,
  });
  
  return NextResponse.json({ success: true, resendCount: count });
}
```

### Check Verification Status

```typescript
// app/api/auth/check-verification/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ verified: false });
  }
  
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });
  
  return NextResponse.json({
    verified: user?.emailVerified !== null,
  });
}
```

---

## Email Template (Verification Email)

```tsx
// emails/verification-email.tsx
interface VerificationEmailProps {
  username: string;
  verificationUrl: string;
}

export function VerificationEmail({ username, verificationUrl }: VerificationEmailProps) {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Verify your email</h1>
      
      <p>Hi {username},</p>
      
      <p>
        Thanks for signing up for Football Connections!
        Click the button below to verify your email address:
      </p>
      
      <a
        href={verificationUrl}
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#3B82F6',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: 'bold',
        }}
      >
        Verify Email
      </a>
      
      <p style={{ marginTop: '24px', fontSize: '14px', color: '#666' }}>
        Or copy and paste this link into your browser:
        <br />
        <a href={verificationUrl}>{verificationUrl}</a>
      </p>
      
      <p style={{ fontSize: '14px', color: '#666' }}>
        This link expires in 24 hours.
      </p>
      
      <p style={{ fontSize: '14px', color: '#999', marginTop: '32px' }}>
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  );
}
```

---

## Accessibility

- [ ] Banner uses `role="alert"`
- [ ] Dismiss button has descriptive label
- [ ] Cooldown timer announced to screen readers
- [ ] Color contrast >= 4.5:1
- [ ] Focus visible on buttons
- [ ] Success state announced

---

## Testing

### Unit Tests
- [ ] Banner hidden if emailVerified !== null
- [ ] Banner hidden if dismissed < 24h ago
- [ ] Resend button disabled during cooldown
- [ ] Cooldown decrements correctly
- [ ] Max 3 resends enforced
- [ ] Success message shows after resend

### E2E Tests
```typescript
test('email verification banner flow', async ({ page }) => {
  // Sign up with new account
  await page.goto('/auth/register');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'SecurePass123!');
  await page.click('[type="submit"]');
  
  // Should see banner on dashboard
  await expect(page.locator('role=alert')).toContainText('Verify your email');
  
  // Click resend
  await page.getByRole('button', { name: 'Resend Email' }).click();
  
  // Should see success message
  await expect(page.locator('role=alert')).toContainText('Verification email sent');
  
  // Button should be disabled with countdown
  const button = page.getByRole('button', { name: /Resend in/ });
  await expect(button).toBeDisabled();
});
```

---

## Notas para Frontend Architect

1. **Position**: Banner debe estar en el layout más alto posible (RootLayout o DashboardLayout) para ser visible en todas las páginas.

2. **Polling vs WebSocket**: Usar polling simple (10s) para MVP. En producción, considerar WebSocket para updates en tiempo real.

3. **Persistent Dismiss**: `localStorage` funciona para MVP, pero en producción considera guardar dismiss en backend para sync entre dispositivos.

4. **Mobile UX**: En mobile, banner debe colapsarse a 2 líneas max para no ocupar mucho espacio vertical.

5. **Email Clients**: Algunos clientes tardan en recibir emails. Agregar texto "Check spam folder if not received in 5 minutes".

---

## Notas para Backend Architect

1. **Token Security**: Usar UUID v4 para tokens, almacenar hashed en DB.

2. **Token Expiry**: Tokens expiran en 24h. Limpiar tokens expirados diariamente (cron job).

3. **Email Queue**: Usar queue (e.g., BullMQ) para envío de emails async.

4. **Verification Flow**: Al hacer click en link, marcar `emailVerified = NOW()` y eliminar token.

5. **Notifications**: Enviar email de bienvenida después de verificación exitosa.
