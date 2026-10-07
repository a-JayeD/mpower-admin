import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Browser client. Uses ONLY the public anon key; every private table is
 * protected by Row Level Security (see supabase/migrations/003_rls_policies.sql).
 * The service_role key must never be imported anywhere in /src.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'mpower-admin-auth',
  },
});

export const BUCKETS = {
  publicMedia: 'public-media',
  studentPhotos: 'student-photos',
} as const;
