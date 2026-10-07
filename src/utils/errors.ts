/** Turn Supabase / Postgres errors into sentences an admin can act on. */
export function friendlyError(err: unknown): string {
  const e = err as { code?: string; message?: string } | null;
  const msg = e?.message ?? (typeof err === 'string' ? err : '');
  switch (e?.code) {
    case '23505':
      if (msg.includes('attendance')) return 'Attendance for this student on this date already exists.';
      if (msg.includes('student_courses')) return 'This student is already enrolled in that course.';
      return 'This record already exists.';
    case '23503':
      if (msg.includes('student_courses')) return 'This course still has enrolled students. Archive it instead of deleting.';
      return 'This item is still used elsewhere, so it cannot be deleted.';
    case '23514':
      return 'Some values are outside the allowed range. Check the form and try again.';
    case '42501':
      return msg && !msg.includes('row-level security') ? msg : 'You do not have permission to do this.';
    case 'PGRST301':
      return 'Your session has expired. Sign in again.';
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Cannot reach the server. Check the internet connection and try again.';
  }
  if (msg.includes('Invalid login credentials')) return 'Email or password is incorrect.';
  if (msg.includes('Email not confirmed')) return 'This email has not been confirmed yet.';
  return msg || 'Something went wrong. Try again.';
}
