import { supabase } from '@/lib/supabase';
import type { AttendanceDetail, Course, EnrollmentProgress, Student } from '@/types/database';
import { downloadFile, toCsv } from '@/utils/csv';
import { todayISO } from '@/utils/format';
import { fetchAll } from './base';

const stamp = () => todayISO();

export async function exportStudentsCsv() {
  const [students, enrollments] = await Promise.all([
    fetchAll<Student>((a, b) => supabase.from('students').select('*').order('full_name').range(a, b)),
    fetchAll<EnrollmentProgress>((a, b) => supabase.from('enrollment_progress').select('*').range(a, b)),
  ]);
  const byStudent = new Map<string, EnrollmentProgress[]>();
  for (const e of enrollments) byStudent.set(e.student_id, [...(byStudent.get(e.student_id) ?? []), e]);

  const csv = toCsv(students, [
    { header: 'Student ID', value: (s) => s.id },
    { header: 'Full name', value: (s) => s.full_name },
    { header: 'Phone', value: (s) => s.phone },
    { header: 'Address', value: (s) => s.address },
    { header: 'Joined on', value: (s) => s.joined_on },
    { header: 'Status', value: (s) => s.status },
    { header: 'Courses', value: (s) => (byStudent.get(s.id) ?? []).map((e) => e.course_name_en).join('; ') },
    { header: 'Progress', value: (s) => (byStudent.get(s.id) ?? [])
        .map((e) => `${e.course_name_en}: ${e.classes_attended}/${e.total_classes} (${e.status})`).join('; ') },
    { header: 'Notes', value: (s) => s.notes },
  ]);
  downloadFile(`students-${stamp()}.csv`, csv);
  return students.length;
}

export async function exportAttendanceCsv(from?: string, to?: string, courseId?: string) {
  const rows = await fetchAll<AttendanceDetail>((a, b) => {
    let q = supabase.from('attendance_details').select('*');
    if (from) q = q.gte('class_date', from);
    if (to) q = q.lte('class_date', to);
    if (courseId) q = q.eq('course_id', courseId);
    return q.order('class_date', { ascending: false }).order('student_name').range(a, b);
  });
  const csv = toCsv(rows, [
    { header: 'Date', value: (r) => r.class_date },
    { header: 'Course', value: (r) => r.course_name_en },
    { header: 'Student', value: (r) => r.student_name },
    { header: 'Status', value: (r) => r.status },
    { header: 'Student ID', value: (r) => r.student_id },
    { header: 'Enrollment ID', value: (r) => r.enrollment_id },
  ]);
  downloadFile(`attendance-${from ?? 'all'}-to-${to ?? stamp()}.csv`, csv);
  return rows.length;
}

export async function exportCoursesCsv() {
  const rows = await fetchAll<Course>((a, b) => supabase.from('courses').select('*').order('course_name_en').range(a, b));
  const csv = toCsv(rows, [
    { header: 'Course ID', value: (c) => c.id },
    { header: 'Name (English)', value: (c) => c.course_name_en },
    { header: 'Name (Bangla)', value: (c) => c.course_name_bn },
    { header: 'Joining fee (BDT)', value: (c) => c.joining_fee },
    { header: 'Classes', value: (c) => c.total_classes },
    { header: 'Duration', value: (c) => c.duration_en },
    { header: 'Status', value: (c) => c.status },
  ]);
  downloadFile(`courses-${stamp()}.csv`, csv);
  return rows.length;
}

export const BACKUP_TABLES = [
  'site_settings', 'courses', 'students', 'student_courses', 'attendance', 'gallery_albums',
  'gallery_images', 'updates', 'instructors', 'success_stories', 'faqs', 'contact_messages',
  'admins', 'audit_logs',
] as const;

/** Full JSON backup of every table, in restore order. Restore with scripts/restore-from-json.mjs */
export async function exportFullBackup(onProgress?: (table: string) => void) {
  const tables: Record<string, unknown[]> = {};
  for (const t of BACKUP_TABLES) {
    onProgress?.(t);
    tables[t] = await fetchAll<unknown>((a, b) => supabase.from(t).select('*').order('created_at').range(a, b));
  }
  const backup = { app: 'mpower-admin', version: 1, exported_at: new Date().toISOString(), tables };
  downloadFile(`mpower-backup-${stamp()}.json`, JSON.stringify(backup, null, 1), 'application/json');
  return Object.values(tables).reduce((n, r) => n + r.length, 0);
}
