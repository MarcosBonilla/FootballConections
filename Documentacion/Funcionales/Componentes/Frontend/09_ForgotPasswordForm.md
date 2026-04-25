# Component Spec: ForgotPasswordForm

## Descripción
Formulario para solicitar restablecimiento de contraseña olvidada. Envía un email con link de reset válido por 1 hora.

---

## Props Interface

```typescript
interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onBackToLogin?: () => void;
}

interface ForgotPasswordFormData {
  email: string;
}
```

---

## Estados del Componente

### 1. Idle (inicial)
```
┌────────────────────────────────┐
│   ← Back to Sign In            │
│                                │
│   Forgot Password?             │
│                                │
│   Enter your email and we'll   │
│   send you a link to reset    │
│   your password.               │
│                                │
│   Email                        │
│   [Enter your email]           │
│                                │
│   [Send Reset Link →]         │
└────────────────────────────────┘
```

### 2. Submitting
```
┌────────────────────────────────┐
│   [🔄 Sending email...]        │
│                                │
│   (input disabled)             │
└────────────────────────────────┘
```

### 3. Success
```
┌────────────────────────────────┐
│   ✅ Email Sent!               │
│                                │
│   Check your inbox for a link │
│   to reset your password.      │
│   The link will expire in      │
│   1 hour.                      │
│                                │
│   Didn't receive it?           │
│   [Resend email]               │
│                                │
│   [← Back to Sign In]         │
└────────────────────────────────┘
```

### 4. Error State
```
┌────────────────────────────────┐
│   ❌ Unable to send email      │
│   Please try again later.      │
│                                │
│   [Try Again]                  │
└────────────────────────────────┘
```

---

## Validación (Zod Schema)

```typescript
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
});
```

---

## Flujo de Interacción

1. Usuario ingresa email
2. Usuario hace clic en "Send Reset Link"
3. Validación client-side
4. `POST /api/auth/forgot-password` con email
5. **Éxito** → mostrar mensaje de confirmación + deshabilitar form
6. **Error** → mostrar mensaje de error + permitir retry

---

## Security Considerations

**No revelar si el email existe:**
- Siempre mostrar mensaje de éxito, incluso si el email no existe en DB
- Esto previene email enumeration attacks

**Rate Limiting:**
- Máximo 3 peticiones por email cada 15 minutos
- Si se excede → mostrar mensaje "Too many requests"

---

## Resend Functionality

**Countdown Timer:** 60 segundos antes de permitir reenvío.

```
┌────────────────────────────────┐
│   Didn't receive it?           │
│   Resend in 0:47               │
└────────────────────────────────┘

(después de 60s)

┌────────────────────────────────┐
│   Didn't receive it?           │
│   [Resend email]               │
└────────────────────────────────┘
```

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm({
  onSuccess,
  onBackToLogin,
}: ForgotPasswordFormProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });
  
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);
  
  const sendResetEmail = async (email: string) => {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      // Always show success message (security: don't reveal if email exists)
      setIsSuccess(true);
      setResendCountdown(60);
      onSuccess?.();
      
    } catch (error) {
      setError('root', { message: 'Unable to send email. Please try again.' });
    }
  };
  
  const onSubmit = async (data: ForgotPasswordFormData) => {
    await sendResetEmail(data.email);
  };
  
  const handleResend = async () => {
    if (resendCountdown > 0) return;
    
    const email = getValues('email');
    await sendResetEmail(email);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md p-8 bg-gray-900 rounded-2xl"
    >
      {/* Back Button */}
      <button
        type="button"
        onClick={onBackToLogin}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mb-6"
      >
        <span>←</span> Back to Sign In
      </button>
      
      {!isSuccess ? (
        <>
          <h2 className="text-3xl font-bold mb-2">Forgot Password?</h2>
          <p className="text-gray-400 mb-6">
            Enter your email and we'll send you a link to reset your password.
          </p>
          
          {errors.root && (
            <div role="alert" className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
              {errors.root.message}
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                disabled={isSubmitting}
                className={`
                  w-full px-4 py-3 bg-gray-800 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-600
                  ${errors.email ? 'ring-2 ring-red-500' : ''}
                `}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" role="alert" className="mt-1 text-sm text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>
            
            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                w-full px-6 py-3 bg-blue-600 hover:bg-blue-700
                rounded-lg font-semibold transition
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isSubmitting ? '🔄 Sending email...' : 'Send Reset Link'}
            </button>
          </form>
        </>
      ) : (
        /* Success State */
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">✅</span>
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Email Sent!</h2>
          
          <p className="text-gray-400 mb-6">
            Check your inbox for a link to reset your password.
            The link will expire in <strong>1 hour</strong>.
          </p>
          
          {/* Resend */}
          <div className="mb-6">
            {resendCountdown > 0 ? (
              <p className="text-sm text-gray-400">
                Didn't receive it? Resend in {Math.floor(resendCountdown / 60)}:{String(resendCountdown % 60).padStart(2, '0')}
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-sm text-blue-500 hover:underline"
              >
                Didn't receive it? Resend email
              </button>
            )}
          </div>
          
          {/* Back to Login */}
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-sm text-gray-400 hover:text-white flex items-center justify-center gap-2 mx-auto"
          >
            <span>←</span> Back to Sign In
          </button>
        </div>
      )}
    </motion.div>
  );
}
```

---

## Email Template

**Subject:** Reset Your Football Connections Password

**Body:**
```
Hi there,

You requested to reset your password for Football Connections.

Click the button below to reset your password:

[Reset Password] (button link)

Or copy and paste this link:
https://footballconnections.com/auth/reset-password?token=abc123...

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

---
Football Connections Team
```

---

## Accessibility

- [ ] Email input has associated label
- [ ] Error messages use `role="alert"`
- [ ] Success message announced to screen readers
- [ ] Back button keyboard accessible
- [ ] Resend button disabled state announced

---

## Testing

### Unit Tests
- [ ] Invalid email shows validation error
- [ ] Valid email triggers API call
- [ ] Success state shows confirmation message
- [ ] Resend countdown works correctly
- [ ] Resend button disabled during countdown

### Integration Tests
- [ ] Email sent successfully shows success message
- [ ] Failed request shows error message
- [ ] Resend functionality works after 60s
- [ ] Back button navigates to login

---

## Notas para Backend Architect

1. **Email Service:** Usar Resend, SendGrid, o similar.

2. **Token Generation:**
```typescript
import crypto from 'crypto';

const token = crypto.randomBytes(32).toString('hex');
const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

await db.passwordResetToken.create({
  data: {
    token,
    email,
    expiresAt,
  },
});
```

3. **Rate Limiting:**
```typescript
// Redis key: `password-reset:${email}`
// Max: 3 requests per 15 minutes
```

4. **Security:** SIEMPRE retornar 200 OK, incluso si email no existe. Log attempts para detección de abuse.
