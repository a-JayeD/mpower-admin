import { supabase, BUCKETS } from '@/lib/supabase';
import type { Paged, PageParams, SortState } from '@/types/common';
import type { Student, StudentStatus } from '@/types/database';
import type { StudentFormValues } from '@/lib/validation/schemas';
import { sanitizeRecord, searchTerm } from '@/utils/sanitize';
import { IMAGE_PRESETS } from '@/lib/constants';
import { pageRange, unwrap } from './base';
import { removeFiles, replaceImage } from './storage';

export interface StudentListRow extends Student {
  student_courses: Array<{ id: string; status: string; course_id: string; courses: { course_name_en: string } | null }>;
}

export interface StudentFilters {
  search?: string;
  status?: StudentStatus | 'all' | 'current';
  courseId?: string;
}

export type StudentSortColumn = 'full_name' | 'joined_on' | 'created_at';

export async function listStudents(
  filters: StudentFilters, page: PageParams, sort: SortState<StudentSortColumn>,
): Promise<Paged<StudentListRow>> {
  const embed = filters.courseId
    ? 'student_courses!inner(id,status,course_id,courses(course_name_en))'
    : 'student_courses(id,status,course_id,courses(course_name_en))';
  let q = supabase.from('students').select(`*, ${embed}`, { count: 'exact' });

  if (filters.courseId) q = q.eq('student_courses.course_id', filters.courseId);
  if (filters.status === 'current' || !filters.status) q = q.neq('status', 'archived');
  else if (filters.status !== 'all') q = q.eq('status', filters.status);

  const term = searchTerm(filters.search ?? '');
  if (term) q = q.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);

  const [from, to] = pageRange(page);
  const res = await q.order(sort.column, { ascending: sort.dir === 'asc' }).order('id').range(from, to);
  return { rows: unwrap(res) as StudentListRow[], total: res.count ?? 0 };
}

export async function getStudent(id: string): Promise<Student> {
  return unwrap(await supabase.from('students').select('*').eq('id', id).single()) as Student;
}

export async function createStudent(values: StudentFormValues, photo: File | null, adminId: string): Promise<Student> {
  let photo_path: string | null = null;
  if (photo) photo_path = await replaceImage(BUCKETS.studentPhotos, 'students', photo, IMAGE_PRESETS.portrait, null);
  try {
    return unwrap(
      await supabase.from('students').insert({ ...sanitizeRecord(values), photo_path, created_by: adminId }).select().single(),
    ) as Student;
  } catch (e) {
    await removeFiles(BUCKETS.studentPhotos, [photo_path]).catch(() => undefined);
    throw e;
  }
}

export async function updateStudent(
  student: Student, values: StudentFormValues, photo: File | null, removePhoto: boolean,
): Promise<Student> {
  let photo_path = student.photo_path;
  if (photo) photo_path = await replaceImage(BUCKETS.studentPhotos, 'students', photo, IMAGE_PRESETS.portrait, student.photo_path);
  else if (removePhoto && student.photo_path) {
    await removeFiles(BUCKETS.studentPhotos, [student.photo_path]);
    photo_path = null;
  }
  return unwrap(
    await supabase.from('students').update({ ...sanitizeRecord(values), photo_path }).eq('id', student.id).select().single(),
  ) as Student;
}

export async function setStudentStatus(id: string, status: StudentStatus) {
  unwrap(await supabase.from('students').update({ status }).eq('id', id).select('id'));
}

/** Permanent deletion: removes enrollments + attendance (cascade) and the photo file. */
export async function deleteStudent(student: Pick<Student, 'id' | 'photo_path'>) {
  unwrap(await supabase.from('students').delete().eq('id', student.id).select('id'));
  await removeFiles(BUCKETS.studentPhotos, [student.photo_path]).catch(() => undefined);
}

export async function quickSearchStudents(term: string) {
  const t = searchTerm(term);
  if (!t) return [];
  return unwrap(
    await supabase.from('students').select('id, full_name, phone, status')
      .or(`full_name.ilike.%${t}%,phone.ilike.%${t}%`).order('full_name').limit(6),
  ) as Pick<Student, 'id' | 'full_name' | 'phone' | 'status'>[];
}
