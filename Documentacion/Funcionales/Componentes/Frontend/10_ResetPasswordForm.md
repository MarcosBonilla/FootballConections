# Component Spec: ResetPasswordForm

## Descripción
Formulario para establecer nueva contraseña después de hacer clic en link de reset enviado por email. Valida token, muestra indicador de fortaleza de contraseña, y confirma cambio exitoso.

---

## Props Interface

```typescript
interface ResetPasswordFormProps {
  token: string; // Token desde URL query param
  onSuccess?: () => void;
}

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}
```

---

## Estados del Componente

### 1. Validating Token (inicial)
```
┌────────────────────────────────┐
│                                │
│   🔄 Validating reset link...  │
│                                │
└────────────────────────────────┘
```

### 2. Token Valid (form visible)
```
┌────────────────────────────────┐
│   Reset Password               │
│                                │
│   Enter your new password      │
│   below.                       │
│                                │
│   New Password                 │
│   [Enter password]             │
│   (strength indicator)          │
│                                │
│   Confirm Password             │
│   [Re-enter password]          │
│                                │
│   [Reset Password →]          │
└────────────────────────────────┘
```

### 3. Token Expired/Invalid
```
┌────────────────────────────────┐
│   ❌ Invalid or Expired Link   │
│                                │
│   This password reset link is  │
│   no longer valid.             │
│                                │
│   [Request New Link →]        │
└────────────────────────────────┘
```

### 4. Submitting
```
┌────────────────────────────────┐
│   [🔄 Resetting password...]   │
│                                │
│   (inputs disabled)            │
└────────────────────────────────┘
```

### 5. Success
```
┌────────────────────────────────┐
│   ✅ Password Reset!           │
│                                │
│   Your password has been       │
│   successfully reset.          │
│                                │
│   [Sign In →]                 │
└────────────────────────────────┘
```

---

## Validación (Zod Schema)

```typescript
import { z } from 'zod';

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

---

## Flujo de Interacción

1. **Componente monta** → validar token `GET /api/auth/validate-reset-token?token=xxx`
2. **Token válido** → mostrar form
3. **Token inválido/expirado** → mostrar error state
4. Usuario ingresa password → mostrar strength indicator
5. Usuario ingresa confirmPassword → validar match
6. Usuario hace clic "Reset Password" → `POST /api/auth/reset-password`
7. **Éxito** → mostrar success state + redirect a login después de 3s
8. **Error** → mostrar mensaje de error

---

## Token Validation

**Endpoint:** `GET /api/auth/validate-reset-token?token={token}`

**Response:**
```json
// Valid
{
  "valid": true,
  "email": "user@example.com"
}

// Invalid/Expired
{
  "valid": false,
  "reason": "EXPIRED" | "NOT_FOUND" | "ALREADY_USED"
}
```

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must have uppercase')
    .regex(/[a-z]/, 'Must have lowercase')
    .regex(/[0-9]/, 'Must have number'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

type TokenStatus = 'validating' | 'valid' | 'invalid' | 'expired' | 'used';

export function ResetPasswordForm({ token, onSuccess }: ResetPasswordFormProps) {
  const router = useRouter();
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>('validating');
  const [isSuccess, setIsSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });
  
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');
  
  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/validate-reset-token?token=${token}`);
        const data = await response.json();
        
        if (data.valid) {
          setTokenStatus('valid');
        } else {
          setTokenStatus(data.reason === 'EXPIRED' ? 'expired' : 'invalid');
        }
      } catch (error) {
        setTokenStatus('invalid');
      }
    };
    
    validateToken();
  }, [token]);
  
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
  
  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });
      
      if (!response.ok) {
        const result = await response.json();
        setError('root', { message: result.error || 'Failed to reset password' });
        return;
      }
      
      setIsSuccess(true);
      onSuccess?.();
      
      // Redirect to login after 3s
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
      
    } catch (error) {
      setError('root', { message: 'An error occurred. Please try again.' });
    }
  };
  
  // Loading state
  if (tokenStatus === 'validating') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-md p-8 bg-gray-900 rounded-2xl text-center"
      >
        <div className="text-5xl mb-4">🔄</div>
        <p className="text-gray-400">Validating reset link...</p>
      </motion.div>
    );
  }
  
  // Invalid/Expired token
  if (tokenStatus !== 'valid') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 bg-gray-900 rounded-2xl text-center"
      >
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">❌</span>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">
          {tokenStatus === 'expired' ? 'Link Expired' : 'Invalid Link'}
        </h2>
        
        <p className="text-gray-400 mb-6">
          {tokenStatus === 'expired'
            ? 'This password reset link has expired. Please request a new one.'
            : 'This password reset link is invalid or has already been used.'}
        </p>
        
        <button
          onClick={() => router.push('/auth/forgot-password')}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
        >
          Request New Link
        </button>
      </motion.div>
    );
  }
  
  // Success state
  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 bg-gray-900 rounded-2xl text-center"
      >
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">✅</span>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Password Reset!</h2>
        
        <p className="text-gray-400 mb-6">
          Your password has been successfully reset.
          Redirecting to sign in...
        </p>
        
        <button
          onClick={() => router.push('/auth/login')}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
        >
          Sign In Now
        </button>
      </motion.div>
    );
  }
  
  // Reset password form
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md p-8 bg-gray-900 rounded-2xl"
    >
      <h2 className="text-3xl font-bold mb-2">Reset Password</h2>
      <p className="text-gray-400 mb-6">Enter your new password below.</p>
      
      {errors.root && (
        <div role="alert" className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
          {errors.root.message}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        
        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            New Password
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
          
          {/* Password Strength */}
          {password && (
            <div id="password-strength" className="mt-2">
              <div className="flex gap-1 mb-1">
                <div className={`h-1 flex-1 rounded ${passwordStrength === 'weak' ? 'bg-red-500' : passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                <div className={`h-1 flex-1 rounded ${passwordStrength === 'medium' || passwordStrength === 'strong' ? passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500' : 'bg-gray-700'}`}></div>
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
          {isSubmitting ? '🔄 Resetting password...' : 'Reset Password'}
        </button>
      </form>
    </motion.div>
  );
}
```

---

## Accessibility

- [ ] Token validation status announced to screen readers
- [ ] Password strength indicator accessible
- [ ] Error messages use `role="alert"`
- [ ] Success state announced
- [ ] All inputs have labels
- [ ] Form navigable by keyboard only

---

## Testing

### Unit Tests
- [ ] Token validation triggered on mount
- [ ] Invalid token shows error state
- [ ] Expired token shows expired state
- [ ] Password strength calculated correctly
- [ ] Confirm password match validation works
- [ ] Form submission calls reset API

### Integration Tests
- [ ] Valid token shows form
- [ ] Invalid token shows error + redirect to forgot password
- [ ] Successful reset shows success message
- [ ] Auto-redirect to login after 3s
- [ ] Failed reset shows error message

---

## Notas para Backend Architect

1. **Token Validation Endpoint:**
```typescript
// GET /api/auth/validate-reset-token?token=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  
  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
  });
  
  if (!resetToken) {
    return Response.json({ valid: false, reason: 'NOT_FOUND' });
  }
  
  if (resetToken.usedAt) {
    return Response.json({ valid: false, reason: 'ALREADY_USED' });
  }
  
  if (new Date() > resetToken.expiresAt) {
    return Response.json({ valid: false, reason: 'EXPIRED' });
  }
  
  return Response.json({
    valid: true,
    email: resetToken.email,
  });
}
```

2. **Reset Password Endpoint:**
```typescript
// POST /api/auth/reset-password
export async function POST(request: Request) {
  const { token, password } = await request.json();
  
  // Validate token (same as above)
  // Hash password with bcrypt
  // Update user password
  // Mark token as used
  
  return Response.json({ success: true });
}
```

3. **Security:** Marcar token como usado inmediatamente. Un token solo puede usarse UNA vez.
