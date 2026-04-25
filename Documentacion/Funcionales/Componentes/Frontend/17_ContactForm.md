# Component Spec: ContactForm

## Descripción
Formulario de contacto para soporte, bug reports, feature requests, y consultas generales. Incluye validación, rate limiting visual, y confirmación de envío.

---

## Props Interface

```typescript
interface ContactFormProps {
  onSuccess?: () => void;
  defaultTopic?: 'general' | 'bug' | 'feature' | 'account';
}

interface ContactFormData {
  name: string;
  email: string;
  topic: 'general' | 'bug' | 'feature' | 'account';
  message: string;
}
```

---

## Layout

```
┌──────────────────────────────────┐
│        Get in Touch              │
│                                  │
│  Name                            │
│  [Enter your name]               │
│                                  │
│  Email                           │
│  [Enter your email]              │
│                                  │
│  Topic                           │
│  [▼ General Inquiry]             │
│    - General Inquiry             │
│    - Bug Report                  │
│    - Feature Request             │
│    - Account Issue               │
│                                  │
│  Message                         │
│  [Enter your message...]         │
│  (multi-line textarea)           │
│                                  │
│  [Send Message →]               │
│                                  │
│  Or reach us at:                 │
│  📧 support@footballconnect.com  │
│  💬 Discord: /invite/football    │
└──────────────────────────────────┘
```

---

## Estados

### 1. Idle (inicial)
Form con todos campos vacíos, botón habilitado.

### 2. Validating (mientras escribe)
Mensajes de error inline para campos inválidos.

### 3. Submitting
```
┌──────────────────────────────────┐
│  [🔄 Sending message...]         │
│                                  │
│  (inputs disabled)               │
└──────────────────────────────────┘
```

### 4. Success
```
┌──────────────────────────────────┐
│  ✅ Message Sent!                │
│                                  │
│  We'll get back to you within   │
│  24-48 hours.                   │
│                                  │
│  [Send Another Message]          │
└──────────────────────────────────┘
```

### 5. Rate Limited
```
┌──────────────────────────────────┐
│  ⏱️ Too Many Messages            │
│                                  │
│  You can send another message   │
│  in 54 minutes.                 │
│                                  │
│  (form disabled)                 │
└──────────────────────────────────┘
```

---

## Validación (Zod Schema)

```typescript
import { z } from 'zod';

const contactSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters'),
  
  email: z
    .string()
    .email('Invalid email address'),
  
  topic: z.enum(['general', 'bug', 'feature', 'account'], {
    errorMap: () => ({ message: 'Please select a topic' }),
  }),
  
  message: z
    .string()
    .min(20, 'Message must be at least 20 characters')
    .max(1000, 'Message must be at most 1000 characters'),
});
```

---

## Rate Limiting

**Límite:** 3 mensajes por IP cada 60 minutos.

**Behavior:**
- Primer mensaje → envío exitoso
- Segundo mensaje → envío exitoso + warning "2/3 remaining"
- Tercer mensaje → envío exitoso + warning "1/3 remaining"
- Cuarto mensaje → rechazado con countdown timer

**Server Response (rate limited):**
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 3240, // Segundos hasta poder enviar de nuevo
  "messagesLeft": 0
}
```

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'motion/react';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2, 'Min 2 characters').max(50, 'Max 50 characters'),
  email: z.string().email('Invalid email'),
  topic: z.enum(['general', 'bug', 'feature', 'account']),
  message: z.string().min(20, 'Min 20 characters').max(1000, 'Max 1000 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export function ContactForm({ onSuccess, defaultTopic }: ContactFormProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    isLimited: boolean;
    messagesLeft: number;
    retryAfter: number; // seconds
  }>({
    isLimited: false,
    messagesLeft: 3,
    retryAfter: 0,
  });
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      topic: defaultTopic || 'general',
    },
  });
  
  // Countdown timer for rate limit
  useEffect(() => {
    if (rateLimitInfo.retryAfter > 0) {
      const timer = setInterval(() => {
        setRateLimitInfo(prev => {
          const newRetryAfter = prev.retryAfter - 1;
          if (newRetryAfter <= 0) {
            return { isLimited: false, messagesLeft: 3, retryAfter: 0 };
          }
          return { ...prev, retryAfter: newRetryAfter };
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [rateLimitInfo.retryAfter]);
  
  const onSubmit = async (data: ContactFormData) => {
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        if (result.error === 'RATE_LIMIT_EXCEEDED') {
          setRateLimitInfo({
            isLimited: true,
            messagesLeft: 0,
            retryAfter: result.retryAfter,
          });
          return;
        }
        
        setError('root', { message: result.error || 'Failed to send message' });
        return;
      }
      
      // Success
      setIsSuccess(true);
      setRateLimitInfo({
        isLimited: false,
        messagesLeft: result.messagesLeft || 3,
        retryAfter: 0,
      });
      onSuccess?.();
      
    } catch (error) {
      setError('root', { message: 'An error occurred. Please try again.' });
    }
  };
  
  const handleSendAnother = () => {
    setIsSuccess(false);
    reset();
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto p-8 bg-gray-900 rounded-2xl"
    >
      <h2 className="text-3xl font-bold mb-6 text-center">Get in Touch</h2>
      
      <AnimatePresence mode="wait">
        {isSuccess ? (
          /* Success State */
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✅</span>
            </div>
            
            <h3 className="text-2xl font-bold mb-2">Message Sent!</h3>
            <p className="text-gray-400 mb-6">
              We'll get back to you within <strong>24-48 hours</strong>.
            </p>
            
            <button
              onClick={handleSendAnother}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
            >
              Send Another Message
            </button>
          </motion.div>
        ) : rateLimitInfo.isLimited ? (
          /* Rate Limited State */
          <motion.div
            key="ratelimit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">⏱️</span>
            </div>
            
            <h3 className="text-2xl font-bold mb-2">Too Many Messages</h3>
            <p className="text-gray-400 mb-6">
              You can send another message in{' '}
              <strong className="text-yellow-500">
                {formatTime(rateLimitInfo.retryAfter)}
              </strong>
            </p>
          </motion.div>
        ) : (
          /* Contact Form */
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {errors.root && (
              <div role="alert" className="p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
                {errors.root.message}
              </div>
            )}
            
            {rateLimitInfo.messagesLeft < 3 && (
              <div role="alert" className="p-3 bg-yellow-500/10 border border-yellow-500 rounded-lg text-yellow-500">
                Warning: {rateLimitInfo.messagesLeft} message{rateLimitInfo.messagesLeft !== 1 ? 's' : ''} remaining this hour
              </div>
            )}
            
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                {...register('name')}
                disabled={isSubmitting}
                className={`
                  w-full px-4 py-3 bg-gray-800 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-600
                  ${errors.name ? 'ring-2 ring-red-500' : ''}
                `}
                placeholder="John Smith"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
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
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            
            {/* Topic */}
            <div>
              <label htmlFor="topic" className="block text-sm font-medium mb-2">
                Topic
              </label>
              <select
                id="topic"
                {...register('topic')}
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="general">General Inquiry</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="account">Account Issue</option>
              </select>
              {errors.topic && (
                <p className="mt-1 text-sm text-red-500">{errors.topic.message}</p>
              )}
            </div>
            
            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-2">
                Message
              </label>
              <textarea
                id="message"
                {...register('message')}
                disabled={isSubmitting}
                rows={6}
                className={`
                  w-full px-4 py-3 bg-gray-800 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-600
                  resize-none
                  ${errors.message ? 'ring-2 ring-red-500' : ''}
                `}
                placeholder="Tell us more..."
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-500">{errors.message.message}</p>
              )}
              <p className="mt-1 text-sm text-gray-400">
                {watch('message')?.length || 0} / 1000 characters
              </p>
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
              {isSubmitting ? '🔄 Sending message...' : 'Send Message'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
      
      {/* Alternative Contact Methods */}
      {!isSuccess && !rateLimitInfo.isLimited && (
        <div className="mt-8 pt-8 border-t border-gray-800 text-center">
          <p className="text-sm text-gray-400 mb-3">Or reach us at:</p>
          <div className="flex flex-col gap-2 text-sm">
            <a href="mailto:support@footballconnect.com" className="text-blue-500 hover:underline">
              📧 support@footballconnect.com
            </a>
            <a href="https://discord.gg/football" target="_blank" rel="noopener" className="text-blue-500 hover:underline">
              💬 Discord: /invite/football
            </a>
          </div>
        </div>
      )}
    </motion.div>
  );
}
```

---

## Accessibility

- [ ] All inputs have labels
- [ ] Error messages use `aria-describedby`
- [ ] Success/error states announced
- [ ] Textarea has character count
- [ ] Select dropdown keyboard accessible
- [ ] Submit button disabled state announced

---

## Testing

### Unit Tests
- [ ] Validation errors for all fields
- [ ] Rate limit warning shows when < 3 messages left
- [ ] Rate limit state blocks submission
- [ ] Success state shows after successful send
- [ ] Character count updates correctly
- [ ] Form resets after "Send Another"

### Integration Tests
- [ ] API call made with correct data
- [ ] Rate limiting enforced by backend
- [ ] Email sent successfully
- [ ] Alternative contact links work

---

## Notas para Backend Architect

1. **Rate Limiting (Redis):**
```typescript
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const key = `contact:${ip}`;
  
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 3600); // 1 hour
  }
  
  if (count > 3) {
    const ttl = await redis.ttl(key);
    return Response.json(
      { error: 'RATE_LIMIT_EXCEEDED', retryAfter: ttl },
      { status: 429 }
    );
  }
  
  // Send email...
  
  return Response.json({ success: true, messagesLeft: 3 - count });
}
```

2. **Email Service:** Usar Resend con template profesional.

3. **Logging:** Log todos los mensajes con IP, timestamp, topic para analytics.
