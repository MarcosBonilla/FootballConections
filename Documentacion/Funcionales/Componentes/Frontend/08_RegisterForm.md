# Component Spec: RegisterForm

## Descripción
Formulario de registro de nueva cuenta con validación en tiempo real. Soporta registro vía email/password con validaciones de complejidad, o OAuth providers (Google, Discord) para registro rápido.

---

## Props Interface

```typescript
interface RegisterFormProps {
  onSuccess?: (user: User) => void;
  redirectTo?: string; // Post-registration redirect (default: '/play')
  showOAuth?: boolean; // Default: true
}

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}
```

---

## Estados del Componente

### 1. Idle (inicial)
```
┌────────────────────────────────┐
│      Create Account            │
├────────────────────────────────┤
│  Username                      │
│  [Enter username]              │
│                                │
│  Email                         │
│  [Enter email]                 │
│                                │
│  Password                      │
│  [Enter password]              │
│  (strength indicator)           │
│                                │
│  Confirm Password              │
│  [Re-enter password]           │
│                                │
│  [x] I accept the Terms of    │
│      Service and Privacy      │
│      Policy                    │
│                                │
│  [Create Account →]           │
│                                │
│  ───────── or ─────────       │
│                                │
│  [🔵 Sign up with Google]    │
│  [💜 Sign up with Discord]    │
│                                │
│  Already have an account?      │
│  [Sign in]                    │
└────────────────────────────────┘
```

### 2. Validation (real-time)

**Username Validation:**
```
┌────────────────────────────────┐
│  Username                      │
│  [johnsmith]                   │
│  ✅ Available                  │
└────────────────────────────────┘

┌────────────────────────────────┐
│  Username                      │
│  [messi]                       │
│  ❌ Username already taken     │
└────────────────────────────────┘
```

**Password Strength:**
```
┌────────────────────────────────┐
│  Password                      │
│  [Pass123!]                    │
│                                │
│  Strength: Strong 🟢          │
│  ✅ At least 8 characters     │
│  ✅ Uppercase letter           │
│  ✅ Lowercase letter           │
│  ✅ Number                     │
└────────────────────────────────┘
```

**Password Mismatch:**
```
┌────────────────────────────────┐
│  Confirm Password              │
│  [Pass123!@]                   │
│  ❌ Passwords don't match      │
└────────────────────────────────┘
```

### 3. Submitting
```
┌────────────────────────────────┐
│  [🔄 Creating account...]      │
│                                │
│  (all inputs disabled)         │
└────────────────────────────────┘
```

### 4. Error State
```
┌────────────────────────────────┐
│  ❌ Email already registered   │
│  An account with this email   │
│  already exists. Please sign  │
│  in instead.                  │
│                                │
│  [Go to Sign In]              │
└────────────────────────────────┘
```

---

## Validación (Zod Schema)

```typescript
import { z } from 'zod';

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .refine(
      async (username) => {
        // Check username availability
        const response = await fetch(`/api/auth/check-username?username=${username}`);
        const data = await response.json();
        return data.available;
      },
      { message: 'Username already taken' }
    ),
  
  email: z
    .string()
    .email('Invalid email address')
    .refine(
      async (email) => {
        const response = await fetch(`/api/auth/check-email?email=${email}`);
        const data = await response.json();
        return data.available;
      },
      { message: 'Email already registered' }
    ),
  
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  confirmPassword: z.string(),
  
  acceptTerms: z
    .boolean()
    .refine(val => val === true, { message: 'You must accept the terms' }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

---

## Password Strength Indicator

```typescript
type PasswordStrength = 'weak' | 'medium' | 'strong';

function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++; // Special char
  
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
}
```

---

## Flujo de Interacción

1. Usuario ingresa username → debounced check (500ms) → `/api/auth/check-username`
2. Usuario ingresa email → debounced check (500ms) → `/api/auth/check-email`
3. Usuario ingresa password → calcular strength en tiempo real
4. Usuario ingresa confirmPassword → validar match en tiempo real
5. Usuario acepta términos → habilitar botón "Create Account"
6. Submit → validación client-side → `POST /api/auth/register`
7. **Éxito** → redirect a `/auth/verify-email` (si email verification enabled) o `/play`
8. **Error**:
   - Email duplicado → mostrar mensaje + link a sign in
   - Username duplicado → highlight username field
   - Otro error → mensaje genérico

---

## Username Availability Check

**Endpoint:** `GET /api/auth/check-username?username={value}`

**Response:**
```json
{
  "available": true
}
```

**Debounce:** 500ms después del último keystroke.

**UI Feedback:**
- Durante check: spinner pequeño al lado del input
- Available: checkmark verde ✅
- Taken: X rojo ❌ + mensaje

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { motion } from 'motion/react';
import { z } from 'zod';
import { useDebounce } from '@/hooks/useDebounce';

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Min 3 characters')
    .max(20, 'Max 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, underscores'),
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must have uppercase')
    .regex(/[a-z]/, 'Must have lowercase')
    .regex(/[0-9]/, 'Must have number'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val, 'Must accept terms'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm({
  onSuccess,
  redirectTo = '/play',
  showOAuth = true,
}: RegisterFormProps) {
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });
  
  const username = watch('username');
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');
  
  const debouncedUsername = useDebounce(username, 500);
  
  // Check username availability
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    
    setUsernameStatus('checking');
    
    fetch(`/api/auth/check-username?username=${debouncedUsername}`)
      .then(res => res.json())
      .then(data => {
        setUsernameStatus(data.available ? 'available' : 'taken');
      })
      .catch(() => setUsernameStatus('idle'));
  }, [debouncedUsername]);
  
  // Calculate password strength
  useEffect(() => {
    if (!password) return;
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 2) setPasswordStrength('weak');
    else if (score <= 4) setPasswordStrength('medium');
    else setPasswordStrength('strong');
  }, [password]);
  
  const onSubmit = async (data: RegisterFormData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        if (result.error === 'EMAIL_EXISTS') {
          setError('email', { message: 'Email already registered' });
        } else if (result.error === 'USERNAME_EXISTS') {
          setError('username', { message: 'Username already taken' });
        } else {
          setError('root', { message: result.error || 'Registration failed' });
        }
        return;
      }
      
      // Auto sign in after registration
      await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      
      onSuccess?.(result.user);
      window.location.href = redirectTo;
      
    } catch (error) {
      setError('root', { message: 'An error occurred. Please try again.' });
    }
  };
  
  const handleOAuthSignUp = (provider: 'google' | 'discord') => {
    signIn(provider, { callbackUrl: redirectTo });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md p-8 bg-gray-900 rounded-2xl"
    >
      <h2 className="text-3xl font-bold mb-6">Create Account</h2>
      
      {errors.root && (
        <div role="alert" className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
          {errors.root.message}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        
        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-2">
            Username
          </label>
          <div className="relative">
            <input
              id="username"
              type="text"
              {...register('username')}
              disabled={isSubmitting}
              className={`
                w-full px-4 py-3 bg-gray-800 rounded-lg pr-10
                focus:outline-none focus:ring-2 focus:ring-blue-600
                ${errors.username ? 'ring-2 ring-red-500' : ''}
                ${usernameStatus === 'available' ? 'ring-2 ring-green-500' : ''}
              `}
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? 'username-error' : 'username-status'}
            />
            
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameStatus === 'checking' && <span>🔄</span>}
              {usernameStatus === 'available' && <span className="text-green-500">✅</span>}
              {usernameStatus === 'taken' && <span className="text-red-500">❌</span>}
            </div>
          </div>
          
          {errors.username && (
            <p id="username-error" role="alert" className="mt-1 text-sm text-red-500">
              {errors.username.message}
            </p>
          )}
          
          {usernameStatus === 'taken' && !errors.username && (
            <p id="username-status" className="mt-1 text-sm text-red-500">
              Username already taken
            </p>
          )}
          
          {usernameStatus === 'available' && !errors.username && (
            <p id="username-status" className="mt-1 text-sm text-green-500">
              Username available
            </p>
          )}
        </div>
        
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
        
        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            {...register('password')}
            disabled={isSubmitting}
            className={`
              w-full px-4 py-3 bg-gray-800 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-600
              ${errors.password ? 'ring-2 ring-red-500' : ''}
            `}
            aria-invalid={!!errors.password}
            aria-describedby="password-strength password-error"
          />
          
          {/* Password Strength Indicator */}
          {password && (
            <div id="password-strength" className="mt-2">
              <div className="flex gap-1 mb-1">
                <div className={`h-1 flex-1 rounded ${passwordStrength === 'weak' ? 'bg-red-500' : passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                <div className={`h-1 flex-1 rounded ${passwordStrength === 'medium' || passwordStrength === 'strong' ? 'bg-yellow-500 bg-green-500' : 'bg-gray-700'}`}></div>
                <div className={`h-1 flex-1 rounded ${passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-700'}`}></div>
              </div>
              
              <p className="text-sm text-gray-400">
                Strength: {' '}
                <span className={
                  passwordStrength === 'weak' ? 'text-red-500' :
                  passwordStrength === 'medium' ? 'text-yellow-500' :
                  'text-green-500'
                }>
                  {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                </span>
              </p>
              
              <ul className="mt-2 text-xs text-gray-400 space-y-1">
                <li className={password.length >= 8 ? 'text-green-500' : ''}>
                  {password.length >= 8 ? '✅' : '○'} At least 8 characters
                </li>
                <li className={/[A-Z]/.test(password) ? 'text-green-500' : ''}>
                  {/[A-Z]/.test(password) ? '✅' : '○'} Uppercase letter
                </li>
                <li className={/[a-z]/.test(password) ? 'text-green-500' : ''}>
                  {/[a-z]/.test(password) ? '✅' : '○'} Lowercase letter
                </li>
                <li className={/[0-9]/.test(password) ? 'text-green-500' : ''}>
                  {/[0-9]/.test(password) ? '✅' : '○'} Number
                </li>
              </ul>
            </div>
          )}
          
          {errors.password && (
            <p id="password-error" role="alert" className="mt-1 text-sm text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>
        
        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
            disabled={isSubmitting}
            className={`
              w-full px-4 py-3 bg-gray-800 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-600
              ${errors.confirmPassword ? 'ring-2 ring-red-500' : ''}
              ${confirmPassword && confirmPassword === password ? 'ring-2 ring-green-500' : ''}
            `}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
          />
          {errors.confirmPassword && (
            <p id="confirm-password-error" role="alert" className="mt-1 text-sm text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        
        {/* Accept Terms */}
        <div>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              {...register('acceptTerms')}
              className="mt-1"
              aria-invalid={!!errors.acceptTerms}
              aria-describedby={errors.acceptTerms ? 'terms-error' : undefined}
            />
            <span className="text-sm text-gray-400">
              I accept the{' '}
              <a href="/terms" target="_blank" className="text-blue-500 hover:underline">
                Terms of Service
              </a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" className="text-blue-500 hover:underline">
                Privacy Policy
              </a>
            </span>
          </label>
          {errors.acceptTerms && (
            <p id="terms-error" role="alert" className="mt-1 text-sm text-red-500">
              {errors.acceptTerms.message}
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
          {isSubmitting ? '🔄 Creating account...' : 'Create Account'}
        </button>
      </form>
      
      {/* OAuth */}
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
              onClick={() => handleOAuthSignUp('google')}
              className="w-full px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              🔵 Sign up with Google
            </button>
            
            <button
              type="button"
              onClick={() => handleOAuthSignUp('discord')}
              className="w-full px-6 py-3 bg-[#5865F2] text-white rounded-lg font-semibold hover:bg-[#4752C4] transition"
            >
              💜 Sign up with Discord
            </button>
          </div>
        </>
      )}
      
      {/* Sign In Link */}
      <p className="mt-6 text-center text-sm text-gray-400">
        Already have an account?{' '}
        <a href="/auth/login" className="text-blue-500 hover:underline">
          Sign in
        </a>
      </p>
    </motion.div>
  );
}
```

---

## Accessibility

- [ ] All inputs have associated labels
- [ ] Error messages use `aria-describedby` and `role="alert"`
- [ ] Password strength announced to screen readers
- [ ] Username availability status announced
- [ ] Terms checkbox accessible with keyboard
- [ ] Submit button disabled state announced

---

## Testing

### Unit Tests
- [ ] Username validation (length, characters, availability)
- [ ] Email validation format
- [ ] Password strength calculation correct
- [ ] Confirm password match validation
- [ ] Accept terms validation
- [ ] Form submission with valid data calls register API

### Integration Tests
- [ ] Successful registration redirects to correct URL
- [ ] Duplicate email shows error
- [ ] Duplicate username shows error
- [ ] Password mismatch prevents submission
- [ ] OAuth sign up redirects correctly

---

## Notas para Frontend Architect

1. **Debounce Hook:**
```typescript
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}
```

2. **API Endpoints:**
   - `POST /api/auth/register` — crear cuenta
   - `GET /api/auth/check-username?username=x` — check disponibilidad
   - `GET /api/auth/check-email?email=x` — check disponibilidad

3. **Password Strength:** Usar librería como `zxcvbn` para cálculo más sofisticado (opcional).

4. **Focus Management:** Auto-focus en primer input (username) al montar.

5. **Analytics:** Track registration attempts, conversions, OAuth provider usage.
