/**
 * Public website content: news/updates, instructors, success stories, FAQs.
 * All share the same "image + bilingual text + publish flag" shape.
 */
import { supabase, BUCKETS } from '@/lib/supabase';
import type { Faq, Instructor, NewsUpdate, SuccessStory } from '@/types/database';
import type {
  FaqFormValues, InstructorFormValues, StoryFormValues, UpdateFormValues,
} from '@/lib/validation/schemas';
import { IMAGE_PRESETS } from '@/lib/constants';
import { sanitizeRecord, searchTerm } from '@/utils/sanitize';
import { unwrap } from './base';
import { removeFiles, replaceImage } from './storage';

async function resolveImage(folder: string, current: string | null, file: File | null, remove: boolean, preset: { maxSide: number; quality: number }) {
  if (file) return replaceImage(BUCKETS.publicMedia, folder, file, preset, current);
  if (remove && current) {
    await removeFiles(BUCKETS.publicMedia, [current]);
    return null;
  }
  return current;
}

/* ---------------- News / updates ---------------- */
/** "2026-10-01T09:30" entered in Bangladesh time → ISO timestamp. */
function dhakaLocalToIso(local: string) {
  return new Date(`${local.slice(0, 16)}:00+06:00`).toISOString();
}

export async function listUpdates(opts: { search?: string; state?: 'all' | 'published' | 'draft' | 'featured' }) {
  let q = supabase.from('updates').select('*');
  const t = searchTerm(opts.search ?? '');
  if (t) q = q.or(`title_en.ilike.%${t}%,title_bn.ilike.%${t}%`);
  if (opts.state === 'published') q = q.eq('is_published', true);
  if (opts.state === 'draft') q = q.eq('is_published', false);
  if (opts.state === 'featured') q = q.eq('is_featured', true);
  return unwrap(await q.order('publish_date', { ascending: false }).limit(200)) as NewsUpdate[];
}

export async function saveUpdate(existing: NewsUpdate | null, values: UpdateFormValues, file: File | null, remove: boolean, adminId: string) {
  const cover_image_path = await resolveImage('updates', existing?.cover_image_path ?? null, file, remove, IMAGE_PRESETS.cover);
  const payload = { ...sanitizeRecord(values), publish_date: dhakaLocalToIso(values.publish_date), cover_image_path };
  const q = existing
    ? supabase.from('updates').update(payload).eq('id', existing.id).select().single()
    : supabase.from('updates').insert({ ...payload, created_by: adminId }).select().single();
  return unwrap(await q) as NewsUpdate;
}

export async function patchUpdate(id: string, patch: Partial<Pick<NewsUpdate, 'is_published' | 'is_featured'>>) {
  unwrap(await supabase.from('updates').update(patch).eq('id', id).select('id'));
}

export async function deleteUpdate(u: NewsUpdate) {
  unwrap(await supabase.from('updates').delete().eq('id', u.id).select('id'));
  await removeFiles(BUCKETS.publicMedia, [u.cover_image_path]).catch(() => undefined);
}

/* ---------------- Instructors ---------------- */
export async function listInstructors() {
  return unwrap(await supabase.from('instructors').select('*').order('display_order').order('name_en')) as Instructor[];
}

export async function saveInstructor(existing: Instructor | null, values: InstructorFormValues, file: File | null, remove: boolean) {
  const photo_path = await resolveImage('instructors', existing?.photo_path ?? null, file, remove, IMAGE_PRESETS.portrait);
  const payload = { ...sanitizeRecord(values), photo_path };
  const q = existing
    ? supabase.from('instructors').update(payload).eq('id', existing.id).select().single()
    : supabase.from('instructors').insert(payload).select().single();
  return unwrap(await q) as Instructor;
}

export async function patchInstructor(id: string, patch: Partial<Pick<Instructor, 'is_active' | 'display_order'>>) {
  unwrap(await supabase.from('instructors').update(patch).eq('id', id).select('id'));
}

export async function deleteInstructor(i: Instructor) {
  unwrap(await supabase.from('instructors').delete().eq('id', i.id).select('id'));
  await removeFiles(BUCKETS.publicMedia, [i.photo_path]).catch(() => undefined);
}

/* ---------------- Success stories ---------------- */
export interface StoryRow extends SuccessStory {
  courses: { course_name_en: string } | null;
}

export async function listStories() {
  return unwrap(
    await supabase.from('success_stories').select('*, courses(course_name_en)').order('display_order').order('created_at', { ascending: false }),
  ) as StoryRow[];
}

export async function saveStory(existing: SuccessStory | null, values: StoryFormValues, file: File | null, remove: boolean) {
  const photo_path = await resolveImage('stories', existing?.photo_path ?? null, file, remove, IMAGE_PRESETS.portrait);
  const payload = { ...sanitizeRecord(values), course_id: values.course_id || null, photo_path };
  const q = existing
    ? supabase.from('success_stories').update(payload).eq('id', existing.id).select().single()
    : supabase.from('success_stories').insert(payload).select().single();
  return unwrap(await q) as SuccessStory;
}

export async function patchStory(id: string, patch: Partial<Pick<SuccessStory, 'is_published' | 'is_featured' | 'display_order'>>) {
  unwrap(await supabase.from('success_stories').update(patch).eq('id', id).select('id'));
}

export async function deleteStory(s: SuccessStory) {
  unwrap(await supabase.from('success_stories').delete().eq('id', s.id).select('id'));
  await removeFiles(BUCKETS.publicMedia, [s.photo_path]).catch(() => undefined);
}

/* ---------------- FAQs ---------------- */
export async function listFaqs() {
  return unwrap(await supabase.from('faqs').select('*').order('display_order').order('created_at')) as Faq[];
}

export async function saveFaq(existing: Faq | null, values: FaqFormValues, nextOrder: number) {
  const payload = sanitizeRecord(values);
  const q = existing
    ? supabase.from('faqs').update(payload).eq('id', existing.id).select().single()
    : supabase.from('faqs').insert({ ...payload, display_order: nextOrder }).select().single();
  return unwrap(await q) as Faq;
}

export async function patchFaq(id: string, patch: Partial<Pick<Faq, 'is_published' | 'display_order'>>) {
  unwrap(await supabase.from('faqs').update(patch).eq('id', id).select('id'));
}

export async function deleteFaq(id: string) {
  unwrap(await supabase.from('faqs').delete().eq('id', id).select('id'));
}

/** Swap display_order of two rows in any ordered table. */
export async function swapOrder(
  table: 'faqs' | 'instructors' | 'success_stories' | 'gallery_images' | 'courses',
  a: { id: string; display_order: number }, b: { id: string; display_order: number },
) {
  // If both share the same order value, give them distinct positions.
  const aNew = b.display_order === a.display_order ? a.display_order + (a.display_order > 0 ? -1 : 1) : b.display_order;
  await Promise.all([
    supabase.from(table).update({ display_order: aNew }).eq('id', a.id).then(unwrap),
    supabase.from(table).update({ display_order: a.display_order }).eq('id', b.id).then(unwrap),
  ]);
}

export type OrderedTable = 'faqs' | 'instructors' | 'success_stories' | 'gallery_images' | 'courses';

/**
 * Persist a new order: every row gets display_order = its index.
 * Only rows whose position actually changed are written (usually two).
 */
export async function saveOrder(table: OrderedTable, rows: Array<{ id: string; display_order: number }>) {
  const changed = rows.map((r, i) => ({ id: r.id, from: r.display_order, to: i })).filter((r) => r.from !== r.to);
  await Promise.all(changed.map((r) =>
    supabase.from(table).update({ display_order: r.to }).eq('id', r.id).select('id').then(unwrap)));
}
