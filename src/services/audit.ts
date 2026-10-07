import { supabase } from '@/lib/supabase';
import type { Paged, PageParams } from '@/types/common';
import type { AuditLog } from '@/types/database';
import { searchTerm } from '@/utils/sanitize';
import { pageRange, unwrap } from './base';

export async function listAuditLogs(
  f: { entity?: string; action?: string; search?: string; from?: string; to?: string; entityId?: string },
  page: PageParams,
): Promise<Paged<AuditLog>> {
  let q = supabase.from('audit_logs').select('*', { count: 'exact' });
  if (f.entity) q = q.eq('entity', f.entity);
  if (f.entityId) q = q.eq('entity_id', f.entityId);
  if (f.action) q = q.eq('action', f.action);
  const t = searchTerm(f.search ?? '');
  if (t) q = q.or(`summary.ilike.%${t}%,admin_email.ilike.%${t}%`);
  if (f.from) q = q.gte('created_at', `${f.from}T00:00:00+06:00`);
  if (f.to) q = q.lte('created_at', `${f.to}T23:59:59+06:00`);
  const [from, to] = pageRange(page);
  const res = await q.order('created_at', { ascending: false }).range(from, to);
  return { rows: unwrap(res) as AuditLog[], total: res.count ?? 0 };
}
