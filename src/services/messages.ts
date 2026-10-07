import { supabase } from '@/lib/supabase';
import type { Paged, PageParams } from '@/types/common';
import type { ContactMessage, MessageStatus } from '@/types/database';
import { searchTerm } from '@/utils/sanitize';
import { pageRange, unwrap } from './base';

export async function listMessages(f: { status: MessageStatus | 'all' | 'inbox'; search?: string }, page: PageParams): Promise<Paged<ContactMessage>> {
  let q = supabase.from('contact_messages').select('*', { count: 'exact' });
  if (f.status === 'inbox') q = q.neq('status', 'archived');
  else if (f.status !== 'all') q = q.eq('status', f.status);
  const t = searchTerm(f.search ?? '');
  if (t) q = q.or(`name.ilike.%${t}%,phone.ilike.%${t}%,email.ilike.%${t}%,subject.ilike.%${t}%`);
  const [from, to] = pageRange(page);
  const res = await q.order('created_at', { ascending: false }).range(from, to);
  return { rows: unwrap(res) as ContactMessage[], total: res.count ?? 0 };
}

export async function setMessageStatus(id: string, status: MessageStatus) {
  const patch: Record<string, unknown> = { status };
  if (status === 'replied') patch.replied_at = new Date().toISOString();
  unwrap(await supabase.from('contact_messages').update(patch).eq('id', id).select('id'));
}

export async function deleteMessage(id: string) {
  unwrap(await supabase.from('contact_messages').delete().eq('id', id).select('id'));
}
