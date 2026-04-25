import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
}

// PostgreSQL pool para Drizzle (puede fallar en Windows con DNS IPv6)
let pool: Pool | null = null;
try {
  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
  });
} catch (error) {
  console.warn('PostgreSQL pool creation failed, will use Supabase REST API only');
}

// Supabase REST API client (fallback confiable)
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Drizzle client (si el pool está disponible)
export const db = pool ? drizzle(pool, { schema }) : null;

// Export all schemas and types
export * from './schema';
export type { NodePgDatabase } from 'drizzle-orm/node-postgres';
