# Component Spec: UserAvatar

## Descripción
Componente de avatar de usuario con fallback a initials. Soporta múltiples tamaños y loading states.

---

## Props Interface

```typescript
interface UserAvatarProps {
  src?: string | null; // URL de la imagen (opcional)
  username: string; // Para generar initials
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}
```

---

## Tamaños

| Size | Dimensions | Use Case |
|------|------------|----------|
| `xs` | 32x32px | Header mobile, inline mentions |
| `sm` | 40x40px | Header desktop, dropdown |
| `md` | 64x64px | Profile cards, leaderboard |
| `lg` | 80x80px | Mobile drawer, profile page header |
| `xl` | 128x128px | Full profile page |

---

## Estados Visuales

### 1. Con Imagen
```
┌──────┐
│      │
│ [📷]│ ← Imagen cargada
│      │
└──────┘
```

### 2. Fallback (Initials)
```
┌──────┐
│      │
│  JS  │ ← Initials del username
│      │
└──────┘
```

### 3. Loading
```
┌──────┐
│      │
│ [⚪]│ ← Skeleton/shimmer
│      │
└──────┘
```

---

## Generación de Initials

**Regla:** Tomar primeras 2 letras del username.

```typescript
function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

// Ejemplos:
// "johnsmith" → "JO"
// "messi" → "ME"
// "cr7" → "CR"
```

---

## Color de Fondo (si no hay imagen)

Generar color consistente basado en username:

```typescript
function getAvatarColor(username: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  
  // Hash username para obtener index consistente
  const hash = username.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  return colors[hash % colors.length];
}
```

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';

const sizeMap = {
  xs: 'w-8 h-8 text-xs',
  sm: 'w-10 h-10 text-sm',
  md: 'w-16 h-16 text-lg',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-32 h-32 text-3xl',
};

export function UserAvatar({
  src,
  username,
  size = 'md',
  className = '',
  onClick,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  const initials = username.slice(0, 2).toUpperCase();
  
  const avatarColor = getAvatarColor(username);
  
  const sizeClass = sizeMap[size];
  
  const showImage = src && !imageError;
  
  return (
    <motion.div
      className={`
        ${sizeClass}
        rounded-full overflow-hidden
        flex items-center justify-center
        font-semibold
        ${showImage ? 'bg-gray-800' : avatarColor}
        ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
        ${className}
      `}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      {showImage ? (
        <Image
          src={src}
          alt={`${username}'s avatar`}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="text-white">{initials}</span>
      )}
    </motion.div>
  );
}

// Helper function
function getAvatarColor(username: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  
  const hash = username.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  return colors[hash % colors.length];
}
```

---

## Variantes de Uso

### 1. Avatar Simple
```tsx
<UserAvatar src={user.image} username={user.name} />
```

### 2. Avatar Clickable (abrir perfil)
```tsx
<UserAvatar
  src={user.image}
  username={user.name}
  onClick={() => router.push(`/profile/${user.id}`)}
/>
```

### 3. Avatar con Badge (online status)
```tsx
<div className="relative">
  <UserAvatar src={user.image} username={user.name} />
  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
</div>
```

### 4. Avatar Group (múltiples usuarios)
```tsx
<div className="flex -space-x-2">
  {users.map(user => (
    <UserAvatar
      key={user.id}
      src={user.image}
      username={user.name}
      size="sm"
      className="ring-2 ring-gray-900"
    />
  ))}
</div>
```

---

## Accessibility

- [ ] Image has `alt` text with username
- [ ] Clickable avatars have `role="button"` if not a link
- [ ] Avatar color contrast sufficient (all chosen colors pass WCAG AA)
- [ ] Hover/focus states visible
- [ ] Keyboard accessible if clickable

---

## Testing

### Unit Tests
- [ ] Renders image when src provided
- [ ] Falls back to initials when no src
- [ ] Falls back to initials on image load error
- [ ] Initials generated correctly (first 2 letters uppercase)
- [ ] Color is consistent for same username
- [ ] Correct size class applied
- [ ] onClick handler called when clicked

### Visual Regression Tests
- [ ] Avatar renders correctly at all sizes
- [ ] Initials centered vertically and horizontally
- [ ] Image crops correctly (object-cover)
- [ ] Hover animation smooth

---

## Notas para Frontend Architect

1. **Next/Image:** Usar `fill` layout para avatares circulares. Asegurar parent tiene `position: relative`.

2. **Image Optimization:** Next.js optimiza automáticamente. Para avatares externos (OAuth), agregar domains a `next.config.js`:
```javascript
module.exports = {
  images: {
    domains: ['lh3.googleusercontent.com', 'cdn.discordapp.com'],
  },
};
```

3. **Loading State:** Agregar skeleton mientras imagen carga:
```tsx
const [isLoading, setIsLoading] = useState(true);

<Image
  src={src}
  alt={alt}
  onLoad={() => setIsLoading(false)}
  className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity'}
/>
```

4. **Color Accessibility:** Todos los colores del array tienen contrast ratio >= 4.5:1 con blanco.

5. **Memo:** Considerar `React.memo` si avatar se renderiza muchas veces (ej: leaderboard con 100+ users).
