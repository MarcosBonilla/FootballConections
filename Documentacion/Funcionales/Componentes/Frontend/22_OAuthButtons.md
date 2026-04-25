# Component Spec: OAuthButtons

## Descripción
Botones reutilizables para autenticación con OAuth (Google y Discord). Incluye loading states, error handling, y diseño consistente con los proveedores.

---

## Props Interface

```typescript
type OAuthProvider = 'google' | 'discord';

interface OAuthButtonsProps {
  onSuccess?: (provider: OAuthProvider) => void;
  onError?: (provider: OAuthProvider, error: Error) => void;
  disabled?: boolean;
  callbackUrl?: string; // Redirect after auth (default: '/dashboard')
  mode?: 'signin' | 'signup'; // Changes button text
}
```

---

## Layout

```
┌────────────────────────────────────┐
│                                    │
│  [🔵 Continue with Google]        │
│                                    │
│  [💜 Continue with Discord]       │
│                                    │
└────────────────────────────────────┘
```

### Con Divider (uso común en forms)

```
┌────────────────────────────────────┐
│  [Email/Password Form Above]       │
│                                    │
│  ────────── OR ──────────         │
│                                    │
│  [🔵 Continue with Google]        │
│  [💜 Continue with Discord]       │
└────────────────────────────────────┘
```

---

## Estados

### 1. Idle (default)
Botones habilitados, sin loading.

### 2. Loading (uno a la vez)
```
[🔄 Signing in with Google...]
[💜 Continue with Discord]
```

### 3. Error
```
[🔵 Continue with Google]
❌ Failed to sign in with Google. Try again.
```

### 4. Disabled (e.g., durante form submission)
Ambos botones grayed out y no clickeables.

---

## Brand Guidelines

### Google
- **Color**: `#4285F4` (Google Blue)
- **Logo**: Official Google "G" logo
- **Text**: "Continue with Google" (no "Sign in with Google" por políticas de branding)
- **Font**: Roboto (fallback: system sans-serif)

### Discord
- **Color**: `#5865F2` (Blurple)
- **Logo**: Discord logo blanco
- **Text**: "Continue with Discord"
- **Font**: Whitney (fallback: system sans-serif)

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { motion } from 'motion/react';

const providerConfig = {
  google: {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
    color: 'bg-white hover:bg-gray-100 text-gray-900',
    label: 'Continue with Google',
  },
  discord: {
    icon: (
      <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
    color: 'bg-[#5865F2] hover:bg-[#4752C4] text-white',
    label: 'Continue with Discord',
  },
};

export function OAuthButtons({
  onSuccess,
  onError,
  disabled = false,
  callbackUrl = '/dashboard',
  mode = 'signin',
}: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);
  const [errorProvider, setErrorProvider] = useState<OAuthProvider | null>(null);
  
  const handleOAuth = async (provider: OAuthProvider) => {
    try {
      setLoadingProvider(provider);
      setErrorProvider(null);
      
      const result = await signIn(provider, {
        callbackUrl,
        redirect: false,
      });
      
      if (result?.error) {
        throw new Error(result.error);
      }
      
      if (result?.ok) {
        onSuccess?.(provider);
        // NextAuth handles redirect automatically if redirect: true
        window.location.href = callbackUrl;
      }
      
    } catch (error) {
      console.error(`OAuth ${provider} error:`, error);
      setErrorProvider(provider);
      onError?.(provider, error as Error);
    } finally {
      setLoadingProvider(null);
    }
  };
  
  return (
    <div className="space-y-3">
      {(['google', 'discord'] as OAuthProvider[]).map(provider => {
        const config = providerConfig[provider];
        const isLoading = loadingProvider === provider;
        const hasError = errorProvider === provider;
        
        return (
          <div key={provider}>
            <motion.button
              whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
              whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
              onClick={() => handleOAuth(provider)}
              disabled={disabled || loadingProvider !== null}
              className={`
                w-full px-4 py-3 rounded-lg font-semibold
                flex items-center justify-center gap-3
                transition-all duration-200
                ${config.color}
                disabled:opacity-50 disabled:cursor-not-allowed
                border border-gray-700
              `}
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                config.icon
              )}
              
              <span>
                {isLoading
                  ? `Signing in...`
                  : mode === 'signup'
                  ? `Sign up with ${provider.charAt(0).toUpperCase() + provider.slice(1)}`
                  : config.label
                }
              </span>
            </motion.button>
            
            {hasError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 text-sm text-red-500 flex items-center gap-2"
                role="alert"
              >
                <span>❌</span>
                <span>Failed to sign in with {provider}. Please try again.</span>
              </motion.p>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## Divider Component (opcional)

```tsx
export function OAuthDivider() {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-gray-700" />
      <span className="text-sm text-gray-500 uppercase">or</span>
      <div className="flex-1 h-px bg-gray-700" />
    </div>
  );
}

// Uso:
<LoginForm />
<OAuthDivider />
<OAuthButtons />
```

---

## NextAuth Configuration

```typescript
// auth.ts (NextAuth v5)
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Discord from 'next-auth/providers/discord';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if user already exists in database
      const existingUser = await db.user.findUnique({
        where: { email: user.email },
      });
      
      if (!existingUser) {
        // Create new user
        await db.user.create({
          data: {
            email: user.email!,
            username: generateUsername(user.name || user.email!),
            avatarUrl: user.image,
            provider: account?.provider,
            providerId: account?.providerAccountId,
            emailVerified: new Date(), // OAuth emails are pre-verified
          },
        });
      }
      
      return true;
    },
    
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id;
        token.provider = account?.provider;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.provider = token.provider as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
});
```

---

## Environment Variables

```env
# .env.local

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_here
```

---

## OAuth Setup Instructions

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google`

### Discord OAuth
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create new application
3. Go to OAuth2 settings
4. Add redirect URIs:
   - `http://localhost:3000/api/auth/callback/discord`
   - `https://yourdomain.com/api/auth/callback/discord`
5. Select scopes: `identify`, `email`

---

## Error Handling

```typescript
// Common OAuth errors:
const errorMessages: Record<string, string> = {
  OAuthSignin: 'Error starting OAuth flow',
  OAuthCallback: 'Error handling OAuth callback',
  OAuthCreateAccount: 'Could not create OAuth account',
  EmailCreateAccount: 'Could not create email account',
  Callback: 'Error in callback handler',
  OAuthAccountNotLinked: 'Email already registered with different method',
  EmailSignin: 'Check your email for sign-in link',
  CredentialsSignin: 'Invalid credentials',
  SessionRequired: 'Please sign in to access this page',
};
```

---

## Accessibility

- [ ] Buttons have descriptive labels
- [ ] Loading state announced to screen readers
- [ ] Error messages use `role="alert"`
- [ ] Keyboard navigation works correctly
- [ ] Focus visible on all buttons
- [ ] Color contrast >= 4.5:1

---

## Testing

### Unit Tests
- [ ] Google button calls signIn with 'google'
- [ ] Discord button calls signIn with 'discord'
- [ ] Loading state disables both buttons
- [ ] Error message shows for failed auth
- [ ] onSuccess callback called on success
- [ ] onError callback called on failure

### E2E Tests
```typescript
test('oauth sign in redirects correctly', async ({ page }) => {
  await page.goto('/auth/login');
  
  const googleButton = page.getByRole('button', { name: /Continue with Google/ });
  await googleButton.click();
  
  // Should redirect to Google OAuth consent screen
  await expect(page).toHaveURL(/accounts\.google\.com/);
});
```

---

## Security Considerations

1. **CSRF Protection**: NextAuth handles CSRF tokens automatically
2. **State Parameter**: NextAuth includes state parameter in OAuth flow
3. **Email Verification**: OAuth providers verify emails, mark as verified in DB
4. **Account Linking**: Check if email exists before creating new account
5. **Session Security**: Use httpOnly cookies for session tokens

---

## Notas para Backend Architect

1. **Database Schema**: Necesitas campo `provider` y `providerId` en tabla `users`:
```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  username     String   @unique
  provider     String?  // 'google' | 'discord' | 'credentials'
  providerId   String?  // Provider's internal user ID
  emailVerified DateTime?
  avatarUrl    String?
}
```

2. **Username Generation**: Si OAuth profile no tiene username, generar uno único:
```typescript
function generateUsername(name: string): string {
  const base = name.toLowerCase().replace(/\s+/g, '');
  const random = Math.random().toString(36).substring(2, 6);
  return `${base}_${random}`;
}
```

3. **Avatar Sync**: Guardar `avatarUrl` del provider para mostrar en perfil.

4. **Email Conflicts**: Si email ya existe con `provider: 'credentials'`, mostrar error "Email already registered. Please sign in with email/password."

5. **Rate Limiting**: OAuth endpoints también necesitan rate limiting para prevenir abuse.
