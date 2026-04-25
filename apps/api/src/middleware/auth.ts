import type { Context, Next } from 'hono';
import { supabase } from '@football-connections/database';
import { UnauthorizedError } from './error-handler';

// Middleware para verificar autenticación con Supabase
export const requireAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  
  try {
    // Verificar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Guardar token y userId en el contexto para uso posterior
    c.set('token', token);
    c.set('userId', user.id);

    await next();

  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Authentication verification failed');
  }
};

// Extraer user ID del token (helper para usar después de requireAuth)
export const getUserId = (c: Context): string => {
  const userId = c.get('userId');
  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }
  return userId;
};
