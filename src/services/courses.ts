import { supabase, BUCKETS } from '@/lib/supabase';
import type { Course, CourseStatus } from '@/types/database';
import type { CourseFormValues } from '@/lib/validation/schemas';
import { sanitizeRecord, searchTerm } from '@/utils/sanitize';
import { IMAGE_PRESETS } from '@/lib/constants';
import { unwrap } from './base';
import { removeFiles, replaceImage } from './storage';

export interface CourseWithCounts extends Course {
  student_courses: Array<{ count: number }>;
}

export async function listCourses(opts: { search?: string; status?: CourseStatus | 'all' | 'current' } = {}) {
  let q = supabase.from('courses').select('*, student_courses(count)');
  if (!opts.status || opts.status === 'current') q = q.neq('status', 'archived');
  else if (opts.status !== 'all') q = q.eq('status', opts.status);
  const t = searchTerm(opts.search ?? '');
  if (t) q = q.or(`course_name_en.ilike.%${t}%,course_name_bn.ilike.%${t}%`);
  return unwrap(await q.order('display_order').order('course_name_en')) as CourseWithCounts[];
}

/** Lightweight list for dropdowns. */
export async function listCourseOptions(includeInactive = false) {
  let q = supabase.from('courses').select('id, course_name_en, course_name_bn, total_classes, status');
  q = includeInactive ? q.neq('status', 'archived') : q.in('status', ['active', 'upcoming']);
  return unwrap(await q.order('course_name_en')) as Pick<
    Course, 'id' | 'course_name_en' | 'course_name_bn' | 'total_classes' | 'status'
  >[];
}

export async function saveCourse(existing: Course | null, values: CourseFormValues, image: File | null, removeImage: boolean) {
  let image_path = existing?.image_path ?? null;
  if (image) image_path = await replaceImage(BUCKETS.publicMedia, 'courses', image, IMAGE_PRESETS.cover, image_path);
  else if (removeImage && image_path) {
    await removeFiles(BUCKETS.publicMedia, [image_path]);
    image_path = null;
  }
  const payload = { ...sanitizeRecord(values), image_path };
  const q = existing
    ? supabase.from('courses').update(payload).eq('id', existing.id).select().single()
    : supabase.from('courses').insert(payload).select().single();
  return unwrap(await q) as Course;
}

export async function setCourseStatus(id: string, status: CourseStatus) {
  unwrap(await supabase.from('courses').update({ status }).eq('id', id).select('id'));
}

export async function deleteCourse(course: Course) {
  unwrap(await supabase.from('courses').delete().eq('id', course.id).select('id'));
  await removeFiles(BUCKETS.publicMedia, [course.image_path]).catch(() => undefined);
}
