# Spec Funcional: Sistema de Autenticación

## Descripción
Sistema completo de autenticación de usuarios con registro, login, cierre de sesión, recuperación de contraseña y gestión de sesiones. Implementado con NextAuth.js (Auth.js v5) con soporte para OAuth (Google, Discord) y credenciales tradicionales.

## Usuario objetivo
Cualquier persona que quiera jugar al juego. Registro obligatorio para acceder al matchmaking y guardar progreso.

---

## Flujo principal: Registro

### Paso 1: Usuario accede a la landing page
- Ve botón "Play Now" o "Sign Up"
- Click redirige a `/auth/register`

### Paso 2: Pantalla de registro
- Usuario elige método de registro:
  - **Opción A**: OAuth (Google / Discord) → flujo automático
  - **Opción B**: Email + Password → formulario manual

### Paso 3a: Registro con OAuth (Google/Discord)
- Click en botón "Continue with Google" / "Continue with Discord"
- Redirección a proveedor OAuth
- Usuario autoriza permisos
- Redirección de vuelta a la app
- Backend crea usuario automáticamente con datos del proveedor
- Usuario redirigido a `/dashboard` (o `/play` si viene del flujo directo)

### Paso 3b: Registro con Email/Password
- Usuario completa formulario:
  - Username (requerido, único, 3-20 chars, alfanumérico + guiones)
  - Email (requerido, único, validación de formato)
  - Password (requerido, mínimo 8 chars, debe incluir: mayúscula, minúscula, número)
  - Confirm Password (debe coincidir)
  - [Checkbox] Accept Terms & Conditions (requerido)
- Click en "Create Account"
- Validación client-side en tiempo real
- Validación server-side al submit
- Si éxito: email de verificación enviado (opcional en MVP)
- Usuario redirigido a `/dashboard` o `/play`

### Paso 4: Asignación de ELO inicial
- Backend asigna 1200 ELO al nuevo usuario
- Usuario puede empezar a jugar inmediatamente

---

## Flujo secundario: Login

### Paso 1: Usuario accede a `/auth/login`
- Opciones visibles:
  - OAuth buttons (Google / Discord)
  - Formulario email/password
  - Link "Forgot password?"
  - Link "Don't have an account? Sign up"

### Paso 2a: Login con OAuth
- Click en proveedor
- Redirección y autorización
- Si usuario existe: login exitoso → redirect a `/dashboard` o página previa
- Si usuario no existe: error "No account found. Please sign up first"

### Paso 2b: Login con Email/Password
- Usuario ingresa email + password
- Click "Sign In"
- Validación backend
- Si correcto: sesión creada, redirect a página previa o `/dashboard`
- Si incorrecto: mensaje "Invalid email or password" (sin especificar cuál es incorrecto por seguridad)

### Paso 3: Rate limiting
- Máximo 5 intentos fallidos por IP en 15 minutos
- Después de 5 intentos: bloqueo temporal de 15 minutos
- Mensaje: "Too many attempts. Please try again in X minutes"

---

## Flujo secundario: Forgot Password

### Paso 1: Usuario click en "Forgot password?" desde `/auth/login`
- Redirige a `/auth/forgot-password`

### Paso 2: Formulario de recuperación
- Usuario ingresa email
- Click "Send reset link"
- Backend verifica que email existe
- Siempre muestra "If an account exists, you'll receive an email" (por seguridad)

### Paso 3: Email con link de reset
- Email contiene link con token temporal (expira en 1 hora)
- Link formato: `https://app.com/auth/reset-password?token={uuid}`

### Paso 4: Formulario de nueva contraseña
- Usuario click en link del email → redirige a `/auth/reset-password`
- Formulario:
  - New Password
  - Confirm New Password
- Validación de contraseña (mismos requisitos que registro)
- Click "Reset Password"
- Si éxito: "Password reset successfully. Please log in"
- Redirect a `/auth/login`

---

## Flujo secundario: Logout

### Paso 1: Usuario click en "Logout" desde menú de usuario (header)
- Modal de confirmación: "Are you sure you want to log out?"
- Botones: "Cancel" / "Log Out"

### Paso 2: Confirmación
- Click "Log Out"
- Backend destruye sesión
- Frontend limpia stores de Zustand
- Redirect a landing page `/`

---

## Pantallas / Estados

### Pantalla 1: Register (`/auth/register`)

**Layout:**
```
[Header simple con logo]

Centro de la pantalla:
  - Título "Create Account"
  - Subtítulo "Join thousands of football fans"
  
  [ OAuth Buttons ]
  - [Icon Google] Continue with Google
  - [Icon Discord] Continue with Discord
  
  [Divider] ── OR ──
  
  [Formulario]
  - Input: Username *
  - Input: Email *
  - Input: Password * (con eye icon para show/hide)
  - Input: Confirm Password *
  - Checkbox: I accept the Terms & Conditions (link)
  
  [Button] Create Account (full width)
  
  [Footer text]
  Already have an account? [Sign In]
```

**Elementos interactivos:**
- OAuth buttons → redirección a proveedor
- Inputs con validación en tiempo real (checkmark verde o error rojo)
- Password strength meter (Weak / Medium / Strong)
- Checkbox requiere click para habilitar botón Submit
- Link Terms & Conditions → abre modal con texto legal

**Validaciones client-side:**
- Username: 3-20 chars, alfanumérico + guiones, sin espacios
- Email: formato válido (regex)
- Password: min 8 chars, mayúscula + minúscula + número
- Confirm password: debe coincidir exactamente
- Checkbox: debe estar marcado

---

### Pantalla 2: Login (`/auth/login`)

**Layout:**
```
[Header simple con logo]

Centro:
  - Título "Welcome Back"
  - Subtítulo "Sign in to continue playing"
  
  [ OAuth Buttons ]
  - [Icon Google] Continue with Google
  - [Icon Discord] Continue with Discord
  
  [Divider] ── OR ──
  
  [Formulario]
  - Input: Email
  - Input: Password (con eye icon)
  - [Link] Forgot password?
  
  [Button] Sign In (full width)
  
  [Footer text]
  Don't have an account? [Sign Up]
```

**Estados:**
- Input error state (borde rojo) después de submit fallido
- Loading state en botón Submit (spinner + deshabilitado)
- Error mensaje global arriba del formulario si hay error de autenticación

---

### Pantalla 3: Forgot Password (`/auth/forgot-password`)

**Layout:**
```
[Header simple con logo]

Centro:
  - Título "Reset Password"
  - Subtítulo "Enter your email and we'll send you a reset link"
  
  [Formulario]
  - Input: Email
  
  [Button] Send Reset Link (full width)
  
  [Footer text]
  Remember your password? [Sign In]
```

**Estado éxito:**
- Reemplaza formulario por:
  - Icono check verde
  - "Check your email"
  - "If an account exists, you'll receive a password reset link"
  - Botón "Back to Sign In"

---

### Pantalla 4: Reset Password (`/auth/reset-password?token=...`)

**Layout:**
```
[Header simple con logo]

Centro:
  - Título "Create New Password"
  - Subtítulo "Enter a secure password"
  
  [Formulario]
  - Input: New Password (con strength meter)
  - Input: Confirm New Password
  
  [Button] Reset Password (full width)
```

**Estados especiales:**
- Si token inválido o expirado:
  - Mensaje error: "Reset link is invalid or expired"
  - Botón "Request a new link" → redirect a forgot-password

---

## Reglas de negocio

**RN-01:** Username debe ser único en toda la plataforma.

**RN-02:** Email debe ser único. Si usuario intenta registrarse con email existente, mostrar "Email already in use".

**RN-03:** Password debe cumplir: mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número. Opcionalmente 1 símbolo especial.

**RN-04:** Sesiones: JWT con refresh token. Access token expira en 15 minutos, refresh token en 7 días.

**RN-05:** OAuth: si usuario ya tiene cuenta con email del proveedor OAuth, vincular automáticamente. No crear duplicados.

**RN-06:** Rate limiting login: máximo 5 intentos fallidos por IP en 15 minutos. Bloqueo temporal después.

**RN-07:** Password reset tokens expiran en 1 hora. Solo se puede usar una vez.

**RN-08:** Usuario recién registrado obtiene 1200 ELO inicial y 0 partidas jugadas.

**RN-09:** Email verification es opcional en MVP. En producción, enviar email de confirmación pero permitir jugar sin confirmar.

**RN-10:** Logout debe limpiar sesión en servidor (invalidar refresh token) y en cliente (borrar cookies/localStorage).

---

## Casos edge

**CE-01:** Usuario intenta registrarse con email ya existente → mostrar error específico "Email already in use" para que pueda hacer login o recuperar contraseña.

**CE-02:** Usuario inicia OAuth pero cancela en la pantalla del proveedor → vuelve a `/auth/register` sin cambios, sin error.

**CE-03:** Usuario tiene cuenta con email pero intenta OAuth con ese mismo email → vincular automáticamente si el proveedor confirma la identidad.

**CE-04:** Token de reset password usado dos veces → segunda vez muestra "Token already used. Request a new one".

**CE-05:** Usuario olvida contraseña mientras está jugando una partida → sesión se mantiene hasta que expire o haga logout explícito.

**CE-06:** Dos usuarios intentan registrarse con mismo username simultáneamente → el segundo recibe error "Username already taken".

**CE-07:** Usuario bloqueado por rate limiting intenta desde otra IP → puede intentar normalmente (bloqueo es por IP, no por cuenta).

**CE-08:** OAuth provider retorna email vacío o sin email → solicitar email manualmente antes de completar registro.

**CE-09:** Usuario con sesión activa accede a `/auth/login` → redirect automático a `/dashboard`.

**CE-10:** Usuario cierra pestaña durante OAuth flow → al volver, OAuth flow ya expiró. Debe reiniciar.

---

## Datos necesarios

### Tabla `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- NULL si es OAuth
  
  -- OAuth fields
  oauth_provider VARCHAR(50), -- 'google', 'discord', null
  oauth_provider_id VARCHAR(255), -- ID del usuario en el proveedor
  
  -- Game stats
  current_elo INTEGER DEFAULT 1200,
  highest_elo INTEGER DEFAULT 1200,
  matches_played INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  email_verified_at TIMESTAMP, -- NULL si no verificado
  last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_provider_id);
```

### Tabla `password_reset_tokens`
```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP, -- NULL si no usado
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_reset_tokens_user ON password_reset_tokens(user_id);
```

### Tabla `sessions` (opcional si NextAuth usa DB adapter)
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
```

---

## Endpoints o lógica requerida

### NextAuth.js Routes (ya incluidas en NextAuth)
- `GET/POST /api/auth/signin` — login
- `GET/POST /api/auth/signup` — registro (custom)
- `GET /api/auth/signout` — logout
- `GET /api/auth/callback/:provider` — OAuth callback
- `GET /api/auth/csrf` — CSRF token
- `GET /api/auth/session` — obtener sesión actual

### Custom API Routes
- `POST /api/auth/forgot-password`
  - Body: `{ email: string }`
  - Response: `{ success: true, message: "Email sent" }`
  
- `POST /api/auth/reset-password`
  - Body: `{ token: string, password: string }`
  - Response: `{ success: true }` o error

- `POST /api/auth/verify-email`
  - Body: `{ token: string }`
  - Response: `{ success: true }`

- `GET /api/auth/check-username`
  - Query: `?username=test`
  - Response: `{ available: boolean }`

- `GET /api/auth/check-email`
  - Query: `?email=test@test.com`
  - Response: `{ available: boolean }`

---

## Criterios de aceptación

- [ ] **CA-01:** Usuario puede registrarse con email/password y recibe 1200 ELO inicial.
- [ ] **CA-02:** Usuario puede registrarse con Google OAuth en < 3 clicks.
- [ ] **CA-03:** Usuario puede registrarse con Discord OAuth en < 3 clicks.
- [ ] **CA-04:** Email duplicado muestra error "Email already in use".
- [ ] **CA-05:** Username duplicado muestra error "Username already taken".
- [ ] **CA-06:** Password débil (< 8 chars o sin requisitos) no permite submit.
- [ ] **CA-07:** Usuario puede hacer login con credenciales correctas y accede a dashboard.
- [ ] **CA-08:** Login con credenciales incorrectas muestra error genérico sin exponer qué campo falló.
- [ ] **CA-09:** Después de 5 intentos fallidos, usuario bloqueado por 15 minutos.
- [ ] **CA-10:** Usuario puede solicitar reset de contraseña y recibe email (si existe).
- [ ] **CA-11:** Link de reset funciona y permite cambiar contraseña.
- [ ] **CA-12:** Token de reset expira después de 1 hora.
- [ ] **CA-13:** Link de reset usado dos veces muestra error.
- [ ] **CA-14:** Usuario puede hacer logout y sesión se destruye correctamente.
- [ ] **CA-15:** OAuth vincula automáticamente si email ya existe en la BD.
- [ ] **CA-16:** Validaciones client-side muestran feedback en tiempo real (< 300ms).
- [ ] **CA-17:** Formularios son accesibles por teclado (Tab navigation, Enter to submit).
- [ ] **CA-18:** Password fields tienen botón show/hide funcional.
- [ ] **CA-19:** Sesión persiste después de cerrar y abrir navegador (refresh token funciona).
- [ ] **CA-20:** Usuario con sesión activa que accede a `/auth/login` es redirigido a dashboard.

---

## Notas para Backend Architect

### NextAuth.js v5 Configuration
```typescript
// auth.config.ts
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import Discord from 'next-auth/providers/discord';

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        // Validate email/password
        // Return user object or null
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Vincular OAuth con email existente
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.elo = user.currentElo;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.elo = token.elo;
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
  },
} satisfies NextAuthConfig;
```

### Password Hashing
- Usar `bcrypt` con cost factor 12 mínimo
- Nunca almacenar passwords en texto plano
- Hash en backend, no en frontend

### Rate Limiting
- Implementar con Redis: key `rate_limit:login:{ip}`, TTL 15 min
- Incrementar contador en cada intento fallido
- Bloquear si contador >= 5

### Email Service
- Usar Resend.com o SendGrid
- Template profesional para password reset
- Incluir botón con link, no solo texto

### Security Headers
- CSP: restringir origins para OAuth callbacks
- CORS: solo permitir dominio propio
- CSRF: NextAuth.js maneja automáticamente

---

## Notas para Frontend Architect

### Form Validation Library
- Usar `react-hook-form` + `zod` para validación
- Schema reutilizable entre client y server

```typescript
// schemas/auth.ts
import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Username can only contain letters, numbers, hyphens and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

export type RegisterFormData = z.infer<typeof registerSchema>;
```

### Password Strength Meter
- Calcular en tiempo real con `zxcvbn` library
- Mostrar colores: rojo (weak) → amarillo (medium) → verde (strong)

### OAuth Button Styling
- Usar iconos oficiales de cada proveedor
- Respetar brand guidelines (colores, sizing)
- Buttons full width en mobile, side-by-side en desktop

### Loading States
- Spinner en botón Submit mientras procesa
- Deshabilitar formulario completo durante submit
- Disabled state claro visualmente

### Error Display
- Errores inline debajo de cada input (client-side)
- Error global arriba del formulario (server-side)
- Toast notification para éxitos ("Account created!")

### Accessibility
- Labels asociados a inputs (`htmlFor`)
- Error messages con `aria-describedby`
- Focus management: primer campo con error recibe focus
- Enter key submits form
- Escape key cierra modales

### Mobile Optimization
- Inputs con `inputMode="email"` para mostrar teclado apropiado
- `autocomplete` attributes correctos (`email`, `username`, `new-password`)
- Touch targets mínimo 44x44px
- Formulario ocupa 100% en mobile, max-width 400px en desktop
