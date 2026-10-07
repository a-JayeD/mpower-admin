function required(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  const value = import.meta.env[name];
  if (!value || typeof value !== 'string') {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local (or set it in Cloudflare Pages) and rebuild.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY'),
  appName: import.meta.env.VITE_APP_NAME || 'M.Power Engineering Admin',
};
