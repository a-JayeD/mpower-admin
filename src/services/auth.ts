import { supabase } from '@/lib/supabase';
import type { Admin } from '@/types/database';
import { unwrap } from './base';

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

/** Returns the admin profile for the signed-in user, or null if not an admin. */
export async function fetchAdminProfile(userId: string): Promise<Admin | null> {
  return unwrap(
    await supabase.from('admins').select('*').eq('id', userId).eq('is_active', true).maybeSingle(),
  ) as Admin | null;
}
