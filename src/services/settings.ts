import { supabase, BUCKETS } from '@/lib/supabase';
import type { Admin, AdminRole, SiteSettings } from '@/types/database';
import type { GrantAdminValues, SettingsFormValues } from '@/lib/validation/schemas';
import { IMAGE_PRESETS } from '@/lib/constants';
import { sanitizeRecord } from '@/utils/sanitize';
import { unwrap } from './base';
import { removeFiles, replaceImage } from './storage';

export async function getSettings() {
  return unwrap(await supabase.from('site_settings').select('*').limit(1).single()) as SiteSettings;
}

export async function saveSettings(current: SiteSettings, values: SettingsFormValues, logo: File | null, removeLogo: boolean) {
  let logo_path = current.logo_path;
  if (logo) logo_path = await replaceImage(BUCKETS.publicMedia, 'branding', logo, IMAGE_PRESETS.logo, logo_path);
  else if (removeLogo && logo_path) {
    await removeFiles(BUCKETS.publicMedia, [logo_path]);
    logo_path = null;
  }
  return unwrap(
    await supabase.from('site_settings').update({ ...sanitizeRecord(values), logo_path }).eq('id', current.id).select().single(),
  ) as SiteSettings;
}

export async function listAdmins() {
  return unwrap(await supabase.from('admins').select('*').order('created_at')) as Admin[];
}

export async function grantAdmin(values: GrantAdminValues) {
  return unwrap(
    await supabase.rpc('grant_admin', { p_email: values.email, p_full_name: values.full_name, p_role: values.role }),
  ) as Admin;
}

export async function updateAdmin(id: string, patch: { is_active?: boolean; role?: AdminRole }) {
  unwrap(await supabase.from('admins').update(patch).eq('id', id).select('id'));
}
