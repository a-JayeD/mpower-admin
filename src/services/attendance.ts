import { supabase } from '@/lib/supabase';
import type { Paged, PageParams } from '@/types/common';
import type { AttendanceDetail, AttendanceRecord, AttendanceStatus } from '@/types/database';
import { searchTerm } from '@/utils/sanitize';
import { pageRange, unwrap } from './base';

export async function getAttendanceForDate(enrollmentIds: string[], date: string) {
  if (!enrollmentIds.length) return [];
  return unwrap(
    await supabase.from('attendance').select('*').in('enrollment_id', enrollmentIds).eq('class_date', date),
  ) as AttendanceRecord[];
}

/**
 * Save a whole sheet in one request. The unique (enrollment_id, class_date)
 * constraint + upsert means re-saving edits existing rows, never duplicates.
 */
export async function saveAttendance(date: string, marks: Array<{ enrollment_id: string; status: AttendanceStatus }>) {
  if (!marks.length) return;
  unwrap(
    await supabase.from('attendance')
      .upsert(marks.map((m) => ({ ...m, class_date: date })), { onConflict: 'enrollment_id,class_date' })
      .select('id'),
  );
}

export async function deleteAttendance(ids: string[]) {
  if (!ids.length) return;
  unwrap(await supabase.from('attendance').delete().in('id', ids).select('id'));
}

export interface AttendanceFilters {
  courseId?: string;
  studentId?: string;
  studentSearch?: string;
  from?: string;
  to?: string;
  status?: AttendanceStatus | 'all';
}

export async function listAttendanceHistory(f: AttendanceFilters, page: PageParams): Promise<Paged<AttendanceDetail>> {
  let q = supabase.from('attendance_details').select('*', { count: 'exact' });
  if (f.courseId) q = q.eq('course_id', f.courseId);
  if (f.studentId) q = q.eq('student_id', f.studentId);
  const t = searchTerm(f.studentSearch ?? '');
  if (t) q = q.ilike('student_name', `%${t}%`);
  if (f.from) q = q.gte('class_date', f.from);
  if (f.to) q = q.lte('class_date', f.to);
  if (f.status && f.status !== 'all') q = q.eq('status', f.status);
  const [from, to] = pageRange(page);
  const res = await q.order('class_date', { ascending: false }).order('student_name').range(from, to);
  return { rows: unwrap(res) as AttendanceDetail[], total: res.count ?? 0 };
}
