import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { supabase } from '@football-connections/database';
import { setCookie, deleteCookie } from 'hono/cookie';

const app = new Hono();

// Schemas de validación
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(20),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// POST /api/auth/signup
app.post('/signup', zValidator('json', signupSchema), async (c) => {
  const { email, password, username } = c.req.valid('json');

  try {
    // Verificar que el username no esté en uso
    const { data: existingUser } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      return c.json({ error: 'Username already taken' }, 400);
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      console.error('Signup error:', authError);
      return c.json({ error: authError.message }, 400);
    }

    if (!authData.user) {
      return c.json({ error: 'User creation failed' }, 500);
    }

    // Crear perfil de usuario en la tabla users
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        username,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return c.json({ error: 'Failed to create user profile' }, 500);
    }

    // Inicializar rating del jugador
    await supabase
      .from('player_ratings')
      .insert({
        user_id: authData.user.id,
        elo: 1200,
        matches_played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      });

    return c.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username,
      },
      session: authData.session,
    }, 201);

  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Signup failed' }, 500);
  }
});

// POST /api/auth/login
app.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    if (!data.user || !data.session) {
      return c.json({ error: 'Login failed' }, 500);
    }

    // Obtener datos del usuario
    const { data: userData } = await supabase
      .from('users')
      .select('username, avatar_url')
      .eq('id', data.user.id)
      .single();

    // Establecer cookies
    setCookie(c, 'sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/',
    });

    setCookie(c, 'sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 30, // 30 días
      path: '/',
    });

    return c.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        username: userData?.username,
        avatarUrl: userData?.avatar_url,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// POST /api/auth/logout
app.post('/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      await supabase.auth.signOut();
    }

    deleteCookie(c, 'sb-access-token');
    deleteCookie(c, 'sb-refresh-token');

    return c.json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Logout failed' }, 500);
  }
});

// GET /api/auth/me - Obtener usuario actual
app.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  try {
    const token = authHeader.replace('Bearer ', '');

    // Verificar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    // Obtener datos del usuario
    const { data: userData } = await supabase
      .from('users')
      .select('username, avatar_url, created_at')
      .eq('id', user.id)
      .single();

    // Obtener rating del usuario
    const { data: rating } = await supabase
      .from('player_ratings')
      .select('elo, matches_played, wins, losses, draws')
      .eq('user_id', user.id)
      .single();

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        username: userData?.username,
        avatarUrl: userData?.avatar_url,
        createdAt: userData?.created_at,
      },
      rating: rating || {
        elo: 1200,
        matches_played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      },
    });

  } catch (error) {
    console.error('Me error:', error);
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

export default app;
