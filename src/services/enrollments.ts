import { supabase } from '@/lib/supabase';
import type { Enrollment, EnrollmentProgress, EnrollmentStatus } from '@/types/database';
import type { EnrollmentEditValues, EnrollmentFormValues } from '@/lib/validation/schemas';
import { sanitizeRecord } from '@/utils/sanitize';
import { unwrap } from './base';

export async function listStudentEnrollments(studentId: string) {
  return unwrap(
    await supabase.from('enrollment_progress').select('*').eq('student_id', studentId).order('join_date', { ascending: false }),
  ) as EnrollmentProgress[];
}

/** Students to show on the attendance sheet for a course + date. */
export async function listCourseRoster(courseId: string) {
  return unwrap(
    await supabase.from('enrollment_progress').select('*').eq('course_id', courseId)
      .in('status', ['active', 'completed', 'paused']).order('student_name'),
  ) as EnrollmentProgress[];
}

export async function enrollStudent(studentId: string, values: EnrollmentFormValues) {
  return unwrap(
    await supabase.from('student_courses').insert({ student_id: studentId, ...sanitizeRecord(values) }).select().single(),
  ) as Enrollment;
}

export async function updateEnrollment(id: string, values: EnrollmentEditValues) {
  // completion_date is filled/cleared by the database trigger.
  const payload = sanitizeRecord(values);
  return unwrap(await supabase.from('student_courses').update(payload).eq('id', id).select().single()) as Enrollment;
}

export async function setEnrollmentStatus(id: string, status: EnrollmentStatus, totalClasses?: number) {
  const payload: Record<string, unknown> = { status };
  if (totalClasses) payload.total_classes = totalClasses;
  unwrap(await supabase.from('student_courses').update(payload).eq('id', id).select('id'));
}

export async function deleteEnrollment(id: string) {
  unwrap(await supabase.from('student_courses').delete().eq('id', id).select('id'));
}
