# Component Spec: LoginForm

## Descripción
Formulario de inicio de sesión con validación en tiempo real. Soporta tanto email/password como OAuth providers (Google, Discord). Incluye rate limiting visual y mensajes de error descriptivos.

---

## Props Interface

```typescript
interface LoginFormProps {
  onSuccess?: (user: User) => void;
  onForgotPassword?: () => void;
  redirectTo?: string; // Post-login redirect URL
  showOAuth?: boolean; // Default: true
}

interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}
```

---

## Estados del Componente

### 1. Idle (inicial)
```
┌────────────────────────────────┐
│      Sign In                   │
├────────────────────────────────┤
│  [Email input]                 │
│  [Password input]              │
│  [x] Remember me               │
│                                │
│  [Forgot password?]            │
│                                │
│  [Sign In →]                  │
│                                │
│  ───────── or ─────────       │
│                                │
│  [🔵 Continue with Google]   │
│  [💜 Continue with Discord]   │
│                                │
│  Don't have an account?        │
│  [Sign up]                    │
└────────────────────────────────┘
```

### 2. Validating (mientras escribe)
```
┌────────────────────────────────┐
│  Email                         │
│  [user@example.com]            │
│  ✅ Valid email                │
├────────────────────────────────┤
│  Password                      │
│  [********]                    │
│  (no validation visual)         │
└────────────────────────────────┘
```

### 3. Submitting (loading)
```
┌────────────────────────────────┐
│  [🔄 Signing in...]           │
│                                │
│  (inputs disabled)             │
└────────────────────────────────┘
```

### 4. Error State
```
┌────────────────────────────────┐
│  ❌ Invalid credentials        │
│  Please check your email and  │
│  password and try again.      │
├────────────────────────────────┤
│  [Email input] (con borde red) │
│  [Password input] (borde red)  │
│                                │
│  Attempts: 2/5 remaining       │
└────────────────────────────────┘
```

### 5. Rate Limited
```
┌────────────────────────────────┐
│  ⏱️ Too many attempts          │
│  Please wait 14:32 before      │
│  trying again.                 │
│                                │
│  (form disabled)               │
└────────────────────────────────┘
```

---

## Validación (Zod Schema)

```typescript
import { z } from 'zod';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});
```

---

## Flujo de Interacción

1. Usuario ingresa email → validación en `onBlur`
2. Usuario ingresa password → sin validación visual
3. Usuario hace clic en "Sign In" → submit form
4. **Client-side validation** → si falla, mostrar errores inline
5. **Server request** → `POST /api/auth/signin`
6. **Respuesta exitosa** → redirect a `redirectTo` o `/play`
7. **Respuesta error**:
   - Invalid credentials → mostrar mensaje + contador de intentos
   - Rate limited → deshabilitar form + mostrar countdown

---

## Manejo de Rate Limiting

```typescript
interface RateLimitState {
  isLimited: boolean;
  remainingTime: number; // En segundos
  attemptsLeft: number;
}

// Server responde con:
{
  error: 'TOO_MANY_ATTEMPTS',
  retryAfter: 900, // 15 minutos en segundos
  attemptsLeft: 0
}
```

**UI Response:**
- Deshabilitar todos los inputs y botones
- Mostrar countdown timer: "Please wait 14:59 before trying again"
- Countdown se actualiza cada segundo
- Al llegar a 0, re-habilitar form

---

## OAuth Flow

1. Usuario hace clic en "Continue with Google"
2. Redirect a `/api/auth/signin/google`
3. NextAuth maneja OAuth flow automáticamente
4. Redirect de vuelta a `callbackUrl` o `/play`

**Error handling:**
- Si usuario cancela OAuth → mostrar toast "Sign in cancelled"
- Si OAuth falla → mostrar error "Unable to sign in with Google"

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { motion } from 'motion/react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm({
  onSuccess,
  onForgotPassword,
  redirectTo = '/play',
  showOAuth = true,
}: LoginFormProps) {
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    isLimited: false,
    remainingTime: 0,
    attemptsLeft: 5,
  });
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });
  
  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      
      if (result?.error) {
        if (result.error === 'TOO_MANY_ATTEMPTS') {
          setRateLimitState({
            isLimited: true,
            remainingTime: 900, // 15 min
            attemptsLeft: 0,
          });
        } else {
          setError('root', {
            message: 'Invalid email or password',
          });
          setRateLimitState(prev => ({
            ...prev,
            attemptsLeft: prev.attemptsLeft - 1,
          }));
        }
      } else {
        onSuccess?.(result.user);
        window.location.href = redirectTo;
      }
    } catch (error) {
      setError('root', { message: 'An error occurred. Please try again.' });
    }
  };
  
  const handleOAuthSignIn = (provider: 'google' | 'discord') => {
    signIn(provider, { callbackUrl: redirectTo });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md p-8 bg-gray-900 rounded-2xl"
    >
      <h2 className="text-3xl font-bold mb-6">Sign In</h2>
      
      {errors.root && (
        <div role="alert" className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
          {errors.root.message}
        </div>
      )}
      
      {rateLimitState.isLimited && (
        <div role="alert" className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500 rounded-lg">
          <p>Too many attempts. Please wait {Math.floor(rateLimitState.remainingTime / 60)}:{String(rateLimitState.remainingTime % 60).padStart(2, '0')}</p>
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
            disabled={isSubmitting || rateLimitState.isLimited}
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
        
        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            {...register('password')}
            disabled={isSubmitting || rateLimitState.isLimited}
            className={`
              w-full px-4 py-3 bg-gray-800 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-600
              ${errors.password ? 'ring-2 ring-red-500' : ''}
            `}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <p id="password-error" role="alert" className="mt-1 text-sm text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>
        
        {/* Remember Me + Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('rememberMe')}
              className="mr-2"
            />
            <span className="text-sm">Remember me</span>
          </label>
          
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-blue-500 hover:underline"
          >
            Forgot password?
          </button>
        </div>
        
        {/* Attempts Counter */}
        {rateLimitState.attemptsLeft < 5 && !rateLimitState.isLimited && (
          <p className="text-sm text-yellow-500">
            {rateLimitState.attemptsLeft} attempt{rateLimitState.attemptsLeft !== 1 ? 's' : ''} remaining
          </p>
        )}
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || rateLimitState.isLimited}
          className="
            w-full px-6 py-3 bg-blue-600 hover:bg-blue-700
            rounded-lg font-semibold transition
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isSubmitting ? '🔄 Signing in...' : 'Sign In'}
        </button>
      </form>
      
      {/* OAuth Buttons */}
      {showOAuth && (
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={rateLimitState.isLimited}
              className="w-full px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
            >
              🔵 Continue with Google
            </button>
            
            <button
              type="button"
              onClick={() => handleOAuthSignIn('discord')}
              disabled={rateLimitState.isLimited}
              className="w-full px-6 py-3 bg-[#5865F2] text-white rounded-lg font-semibold hover:bg-[#4752C4] transition flex items-center justify-center gap-2"
            >
              💜 Continue with Discord
            </button>
          </div>
        </>
      )}
      
      {/* Sign Up Link */}
      <p className="mt-6 text-center text-sm text-gray-400">
        Don't have an account?{' '}
        <a href="/auth/register" className="text-blue-500 hover:underline">
          Sign up
        </a>
      </p>
    </motion.div>
  );
}
```

---

## Accessibility

- [ ] All inputs have associated labels
- [ ] Error messages use `role="alert"` and `aria-describedby`
- [ ] Submit button disabled state announced
- [ ] Rate limit message announced assertively
- [ ] OAuth buttons have descriptive text (not just icons)
- [ ] Keyboard navigable (Tab order: email → password → remember me → forgot → submit → OAuth)

---

## Testing

### Unit Tests
- [ ] Validation errors shown for invalid email
- [ ] Validation errors shown for empty password
- [ ] Form submission calls signIn with correct data
- [ ] Rate limit state updates correctly after 5 failed attempts
- [ ] OAuth buttons call signIn with correct provider

### Integration Tests
- [ ] Successful login redirects to correct URL
- [ ] Failed login shows error message
- [ ] Rate limited login disables form for 15 minutes
- [ ] "Forgot password" link navigates correctly
- [ ] "Sign up" link navigates correctly

---

## Notas para Frontend Architect

1. **NextAuth Integration:** Usa `signIn` de `next-auth/react`. Configuración en `app/api/auth/[...nextauth]/route.ts`.

2. **Rate Limiting:** El backend debe responder con headers `X-RateLimit-Remaining` y `Retry-After`.

3. **Remember Me:** Configura `maxAge` de la session en NextAuth si `rememberMe` es true (7 días vs 15 min).

4. **Focus Management:** Auto-focus en primer input al montar el componente.

5. **Security:** Nunca mostrar si el email existe o no (mensaje genérico "Invalid credentials").
