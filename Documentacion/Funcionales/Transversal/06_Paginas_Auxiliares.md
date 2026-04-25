# Spec Funcional: Páginas Auxiliares

## Descripción
Páginas de soporte y error (Landing Page, 404 Not Found, 500 Server Error, Privacy Policy, Terms of Service, How to Play) que complementan la experiencia del usuario fuera del flujo principal del juego.

---

## 1. Landing Page (`/`)

### Descripción
Página de bienvenida para usuarios no autenticados. Presenta el juego, sus características, y CTA para empezar a jugar.

### Layout

**Hero Section:**
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│          ⚽ FOOTBALL CONNECTIONS ⚽                    │
│                                                        │
│     Test your football knowledge against players      │
│              from around the world                    │
│                                                        │
│              [Play Now →]  [Watch Demo]              │
│                                                        │
│     [Animated preview: chain of players scrolling]    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**How It Works Section:**
```
┌────────────────────────────────────────────────────────┐
│                    How to Play                         │
│                                                        │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐          │
│  │    1    │    │    2    │    │    3    │          │
│  │  Join   │ →  │  Name   │ →  │  Build  │          │
│  │ Match   │    │ Players │    │  Chain  │          │
│  └─────────┘    └─────────┘    └─────────┘          │
│                                                        │
│  Get matched with an opponent. Take turns naming      │
│  players who played together. Win by outlasting       │
│  your opponent!                                        │
└────────────────────────────────────────────────────────┘
```

**Features Section:**
```
┌────────────────────────────────────────────────────────┐
│                       Features                         │
│                                                        │
│  ⚡ Real-time Multiplayer    🏆 ELO Ranking System    │
│     Battle in 1v1 matches      Climb the leaderboard  │
│                                                        │
│  🎮 Smart Autocomplete       📊 Track Your Stats      │
│     Instant player search      View match history     │
└────────────────────────────────────────────────────────┘
```

**Stats Section (si hay datos públicos):**
```
┌────────────────────────────────────────────────────────┐
│              Join Our Community                        │
│                                                        │
│     12,482              450K+             1,247        │
│   Active Players      Matches Played    Online Now    │
└────────────────────────────────────────────────────────┘
```

**CTA Final:**
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│           Ready to Test Your Knowledge?               │
│                                                        │
│                  [Start Playing →]                    │
│                                                        │
│           No download required • Free forever         │
└────────────────────────────────────────────────────────┘
```

### Elementos interactivos
- **Play Now** → `/auth/register`
- **Watch Demo** → Video modal o animación explicativa
- **Start Playing** → `/auth/register`
- Scroll down trigger: animaciones de entrada para cada sección

### Animaciones
- Hero text: fade-in con slide-up
- Player chain preview: scroll horizontal automático (loop infinito)
- Features cards: fade-in en viewport con stagger
- Stats counters: CountUp animation cuando entran en viewport

---

## 2. 404 Not Found (`/404`)

### Descripción
Página de error cuando la ruta no existe.

### Layout
```
┌────────────────────────────────────────┐
│                                        │
│              404                       │
│                                        │
│         ⚠️  Page Not Found             │
│                                        │
│   Looks like you're offside!          │
│   The page you're looking for         │
│   doesn't exist.                      │
│                                        │
│     [← Go Home]  [Play Now →]        │
│                                        │
└────────────────────────────────────────┘
```

### Elementos
- **404**: Número grande, animado con glitch effect
- **Metáfora futbolística**: "offside", "out of bounds", etc.
- **Go Home**: Redirect a `/`
- **Play Now**: Redirect a `/auth/register` o `/play` si autenticado

### Accesibilidad
- `<title>404 - Page Not Found</title>`
- Status code HTTP 404 correcto (no 200)
- Breadcrumb trail si es posible

---

## 3. 500 Server Error (`/500`)

### Descripción
Página de error cuando hay fallo del servidor.

### Layout
```
┌────────────────────────────────────────┐
│                                        │
│              500                       │
│                                        │
│      🔧 Something Went Wrong          │
│                                        │
│   We're working on fixing this.       │
│   Please try again later.             │
│                                        │
│   Error ID: #abc123def                │
│                                        │
│     [Try Again]  [Go Home]            │
│                                        │
└────────────────────────────────────────┘
```

### Elementos
- **Error ID**: Tracking ID para debugging (UUID)
- **Try Again**: Reload la página actual
- **Go Home**: Redirect a `/`
- **Status message**: Opcional, tiempo estimado de resolución

### Estado offline
Si el error es de red (cliente sin internet):
```
┌────────────────────────────────────────┐
│                                        │
│          📡 No Connection              │
│                                        │
│   Check your internet connection      │
│   and try again.                      │
│                                        │
│         [Retry Connection]            │
└────────────────────────────────────────┘
```

---

## 4. How to Play (`/how-to-play`)

### Descripción
Tutorial completo del juego con ejemplos visuales.

### Layout

**Section 1: Objetivo**
```
Goal: Build the longest chain of players
who have played together in real life.
```

**Section 2: Reglas**
```
1. You and your opponent take turns
2. Each turn you have 20 seconds
3. Name a player who played with the previous player
4. Players can only be used once per game
5. First to make an invalid move loses
```

**Section 3: Ejemplo Visual**
```
Example Chain:
  Lionel Messi
      ↓ (played together at Barcelona)
  Sergio Busquets
      ↓ (played together at Barcelona & Spain)
  Xavi Hernández
      ↓ (played together at Barcelona)
  Andrés Iniesta
```

**Section 4: Tips**
```
💡 Tips for Success:
- Use autocomplete to find players quickly
- Remember iconic teams (Barcelona 2010, Real Madrid 2016)
- Know international teammates
- Keep an eye on the timer!
```

**Section 5: ELO System**
```
📊 ELO Rating System:
- Start at 1200 ELO
- Win → gain points (+10 to +30)
- Lose → lose points (-10 to -30)
- Climb the leaderboard!
```

### Elementos interactivos
- **Start Playing** CTA al final → `/auth/register` o `/play`
- **Example chains** interactivos (click para ver detalles de cada jugador)
- Video embed o GIF animado mostrando gameplay

---

## 5. Privacy Policy (`/privacy`)

### Descripción
Política de privacidad con información sobre recolección y uso de datos.

### Secciones
1. **Information We Collect**
   - Account information (email, username)
   - Usage data (matches played, ELO)
   - Technical data (IP, browser, device)

2. **How We Use Your Information**
   - Provide game services
   - Calculate rankings
   - Improve user experience

3. **Data Sharing**
   - We do not sell your data
   - Third-party services (auth providers, analytics)

4. **Your Rights**
   - Access your data
   - Delete your account
   - Opt-out of analytics

5. **Contact**
   - Email: privacy@footballconnections.com

### Layout
```
Simple vertically scrolling document with:
- Table of contents (sticky sidebar on desktop)
- Headings with anchor links
- Last updated date at top
```

---

## 6. Terms of Service (`/terms`)

### Descripción
Términos y condiciones del uso del servicio.

### Secciones
1. **Acceptance of Terms**
2. **User Accounts**
   - Age requirement (13+)
   - Account security
   - One account per person
3. **User Conduct**
   - No cheating
   - No abusive behavior
   - No automated bots
4. **Intellectual Property**
   - Player data from public sources
   - Game mechanics are proprietary
5. **Limitation of Liability**
6. **Termination**
7. **Changes to Terms**

### Layout
Similar a Privacy Policy (documento scrollable con TOC)

---

## 7. Contact (`/contact`)

### Descripción
Formulario de contacto para soporte y feedback.

### Layout
```
┌────────────────────────────────────────┐
│         Get in Touch                   │
│                                        │
│  [Input] Name                          │
│  [Input] Email                         │
│  [Select] Topic                        │
│    - General Inquiry                  │
│    - Bug Report                       │
│    - Feature Request                  │
│    - Account Issue                    │
│  [Textarea] Message                    │
│                                        │
│         [Send Message]                 │
│                                        │
│  Or reach us at:                      │
│  📧 support@footballconnections.com    │
│  💬 Discord: /invite/football          │
└────────────────────────────────────────┘
```

### Validación
- Name: requerido, min 2 chars
- Email: requerido, formato válido
- Topic: requerido (select)
- Message: requerido, min 20 chars

### Confirmación
Después de envío exitoso:
```
✅ Message Sent!
We'll get back to you within 24-48 hours.
```

---

## Reglas de negocio

**RN-01:** Landing page solo visible para usuarios no autenticados. Usuarios autenticados son redirigidos a `/dashboard` o `/play`.

**RN-02:** Páginas 404 y 500 deben retornar HTTP status codes correctos (no siempre 200).

**RN-03:** Privacy Policy y Terms deben tener timestamps de "Last Updated".

**RN-04:** How to Play debe ser accesible sin login (público).

**RN-05:** Contact form debe tener rate limiting (máximo 3 mensajes por IP por hora).

**RN-06:** Landing page debe ser SEO-optimized con meta tags apropiados.

**RN-07:** 404 page debe incluir header y footer normales (no simplificados).

**RN-08:** Stats counters en landing solo se animan una vez (no en cada scroll).

**RN-09:** All auxiliar pages deben ser responsive (mobile-first).

**RN-10:** Legal pages (Privacy, Terms) deben tener versión en PDF descargable.

---

## Casos edge

**CE-01:** Usuario autenticado accede a landing `/` → redirect automático a `/play`.

**CE-02:** Usuario accede a ruta inválida durante partida activa → mostrar 404 simple sin footer.

**CE-03:** Error 500 ocurre durante partida → mostrar error inline sin perder estado del juego.

**CE-04:** Usuario sin JavaScript intenta acceder a landing → mostrar versión estática funcional.

**CE-05:** Contact form envío falla → mostrar error y permitir retry sin perder mensaje escrito.

**CE-06:** Stats counters en landing page son ceros (no hay datos) → mostrar placeholders o ocultar sección.

**CE-07:** Usuario intenta acceder a página que requiere autenticación y no lo está → 404 page con CTA "Sign In".

**CE-08:** How to Play video no carga → mostrar fallback con imágenes estáticas + texto.

---

## Datos necesarios

### Landing Page Stats (opcional)
```typescript
interface GlobalStats {
  activeUsers: number;
  totalMatches: number;
  onlineNow: number;
  lastUpdated: Date;
}
```

### Contact Form
```typescript
interface ContactMessage {
  id: string;
  name: string;
  email: string;
  topic: 'general' | 'bug' | 'feature' | 'account';
  message: string;
  submittedAt: Date;
  ipAddress: string; // Para rate limiting
}
```

---

## Endpoints

- `GET /api/stats/global` — stats públicas para landing
- `POST /api/contact` — enviar mensaje de contacto
- `GET /api/legal/privacy` — obtener privacy policy
- `GET /api/legal/terms` — obtener terms of service

---

## Criterios de aceptación

### Landing Page
- [ ] **CA-01:** Hero section con CTA "Play Now" visible above the fold.
- [ ] **CA-02:** Secciones con animaciones de entrada al hacer scroll.
- [ ] **CA-03:** Player chain preview con scroll automático.
- [ ] **CA-04:** Stats counters con animación CountUp.
- [ ] **CA-05:** Usuario autenticado redirigido a `/play`.

### 404 Page
- [ ] **CA-06:** Muestra cuando ruta no existe.
- [ ] **CA-07:** HTTP status 404 correcto.
- [ ] **CA-08:** Buttons "Go Home" y "Play Now" funcionales.

### 500 Page
- [ ] **CA-09:** Muestra en errores del servidor.
- [ ] **CA-10:** HTTP status 500 correcto.
- [ ] **CA-11:** Error ID visible para debugging.

### How to Play
- [ ] **CA-12:** Accesible sin login.
- [ ] **CA-13:** Ejemplos visuales de cadenas.
- [ ] **CA-14:** Tips y reglas claros.

### Legal Pages
- [ ] **CA-15:** Privacy y Terms tienen "Last Updated" date.
- [ ] **CA-16:** Table of contents con anchor links.
- [ ] **CA-17:** Versión PDF descargable.

### Contact
- [ ] **CA-18:** Formulario funcional con validación.
- [ ] **CA-19:** Rate limiting activo (3 por hora).
- [ ] **CA-20:** Confirmación visual después de envío.

---

## Notas para Frontend Architect

### Landing Page Animations
```tsx
import { motion } from 'motion/react';
import { useInView } from 'react-intersection-observer';

function FeatureCard({ title, description, icon }: FeatureProps) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.2 });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
    >
      <div className="p-6 bg-gray-800 rounded-lg">
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
      </div>
    </motion.div>
  );
}
```

### Stats Counter
```tsx
import CountUp from 'react-countup';

function StatsCounter({ value, label }: { value: number; label: string }) {
  const [ref, inView] = useInView({ triggerOnce: true });
  
  return (
    <div ref={ref}>
      <div className="text-5xl font-bold">
        {inView ? <CountUp end={value} duration={2} separator="," /> : 0}
      </div>
      <div className="text-gray-400">{label}</div>
    </div>
  );
}
```

### 404 Animation
```tsx
function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.h1
          animate={{
            textShadow: [
              '0 0 10px #f00',
              '0 0 20px #0f0',
              '0 0 10px #00f',
              '0 0 10px #f00'
            ]
          }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-9xl font-bold"
        >
          404
        </motion.h1>
        <p className="text-2xl mb-8">Page Not Found</p>
        <div className="flex gap-4 justify-center">
          <Link href="/">Go Home</Link>
          <Link href="/play">Play Now</Link>
        </div>
      </motion.div>
    </div>
  );
}
```

### Contact Form with react-hook-form
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  topic: z.enum(['general', 'bug', 'feature', 'account']),
  message: z.string().min(20, 'Message must be at least 20 characters')
});

function ContactForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(contactSchema)
  });
  
  const onSubmit = async (data: any) => {
    await fetch('/api/contact', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    // Show success message
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### SEO Meta Tags (Landing)
```tsx
// app/page.tsx
export const metadata: Metadata = {
  title: 'Football Connections - Test Your Football Knowledge',
  description: 'Challenge players worldwide in this multiplayer football trivia game. Build chains of players who played together. Climb the leaderboard!',
  keywords: ['football', 'soccer', 'trivia', 'multiplayer', 'game', 'quiz'],
  openGraph: {
    title: 'Football Connections',
    description: 'Test your football knowledge against players worldwide',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Football Connections',
    description: 'Test your football knowledge against players worldwide',
    images: ['/twitter-image.png'],
  }
};
```
