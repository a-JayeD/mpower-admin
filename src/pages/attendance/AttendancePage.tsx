import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, History, Save, UserCheck, UserX, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import type { AttendanceStatus, EnrollmentProgress } from '@/types/database';
import { listCourseOptions } from '@/services/courses';
import { listCourseRoster } from '@/services/enrollments';
import { getAttendanceForDate, saveAttendance } from '@/services/attendance';
import { getSettings } from '@/services/settings';
import { useSignedPhotos } from '@/hooks/useSignedPhotos';
import { useConfirm } from '@/hooks/useConfirm';
import { formatLongDate, shiftDate, todayISO } from '@/utils/format';
import { remainingStatus } from '@/utils/completion';
import { cn } from '@/utils/cn';
import { paths } from '@/routes/paths';
import { PageHeader, Panel } from '@/components/ui/Panel';
import { Button, IconButton, buttonStyles } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';

type Marks = Record<string, AttendanceStatus>;

export default function AttendancePage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const today = todayISO();
  const date = params.get('date') && params.get('date')! <= today ? params.get('date')! : today;
  const courseId = params.get('course') ?? '';

  const [marks, setMarks] = useState<Marks>({});
  const [showInactive, setShowInactive] = useState(false);

  const courses = useQuery({ queryKey: ['course-options', 'all'], queryFn: () => listCourseOptions(true) });
  const settings = useQuery({ queryKey: ['settings'], queryFn: getSettings, staleTime: 5 * 60_000 });
  const roster = useQuery({ queryKey: ['roster', courseId], queryFn: () => listCourseRoster(courseId), enabled: !!courseId });
  const ids = useMemo(() => roster.data?.map((r) => r.enrollment_id) ?? [], [roster.data]);
  const saved = useQuery({
    queryKey: ['attendance-day', courseId, date, ids],
    queryFn: () => getAttendanceForDate(ids, date),
    enabled: ids.length > 0,
  });
  const photos = useSignedPhotos(roster.data?.map((r) => r.student_photo_path) ?? []);
  const threshold = settings.data?.completion_warning_threshold ?? 3;

  // Saved state for this course + date
  const savedMarks = useMemo<Marks>(() => {
    const m: Marks = {};
    for (const r of saved.data ?? []) m[r.enrollment_id] = r.status;
    return m;
  }, [saved.data]);

  // Reset local edits whenever the saved sheet changes (course/date switch or after save).
  useEffect(() => setMarks(savedMarks), [savedMarks]);

  // Active students who had joined by this date, plus anyone already marked on this date.
  const { rows, hidden } = useMemo(() => {
    const all = roster.data ?? [];
    const visible: EnrollmentProgress[] = [];
    const other: EnrollmentProgress[] = [];
    for (const r of all) {
      const relevant = savedMarks[r.enrollment_id] || (r.status === 'active' && r.join_date <= date);
      (relevant ? visible : other).push(r);
    }
    return { rows: showInactive ? [...visible, ...other.filter((r) => r.join_date <= date)] : visible, hidden: other.filter((r) => r.join_date <= date).length };
  }, [roster.data, savedMarks, date, showInactive]);

  const changed = rows.filter((r) => marks[r.enrollment_id] && marks[r.enrollment_id] !== savedMarks[r.enrollment_id]);
  const unmarked = rows.filter((r) => !marks[r.enrollment_id]).length;
  const presentCount = rows.filter((r) => marks[r.enrollment_id] === 'present').length;
  const absentCount = rows.filter((r) => marks[r.enrollment_id] === 'absent').length;
  const dirty = changed.length > 0;
  const hasSaved = Object.keys(savedMarks).length > 0;

  // Warn before leaving the page with unsaved marks.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const go = useCallback(async (next: { date?: string; course?: string }) => {
    if (dirty && !(await confirm({
      title: 'Discard unsaved attendance?',
      message: `${changed.length} change(s) on this sheet have not been saved.`,
      confirmLabel: 'Discard changes', tone: 'danger',
    }))) return;
    const p = new URLSearchParams(params);
    if (next.date !== undefined) p.set('date', next.date);
    if (next.course !== undefined) { if (next.course) p.set('course', next.course); else p.delete('course'); }
    setShowInactive(false);
    setParams(p, { replace: true });
  }, [dirty, changed.length, confirm, params, setParams]);

  const save = useMutation({
    mutationFn: () => saveAttendance(date, changed.map((r) => ({ enrollment_id: r.enrollment_id, status: marks[r.enrollment_id] }))),
    onSuccess: () => {
      toast.success(`Attendance saved for ${formatLongDate(date)}`);
      qc.invalidateQueries({ queryKey: ['attendance-day', courseId, date] });
      qc.invalidateQueries({ queryKey: ['roster', courseId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      qc.invalidateQueries({ queryKey: ['attendance-history'] });
    },
  });

  const setAll = (status: AttendanceStatus) => setMarks((m) => {
    const next = { ...m };
    for (const r of rows) next[r.enrollment_id] = status;
    return next;
  });

  const course = courses.data?.find((c) => c.id === courseId);

  return (
    <div className={cn(dirty && 'pb-24')}>
      <PageHeader title="Attendance" description="Pick a date and a course, mark each student, then save."
        actions={<Link to={paths.attendanceHistory} className={buttonStyles('secondary')}><History className="h-4 w-4" />History</Link>} />

      <Panel className="mb-4">
        <div className="grid gap-3 p-4 md:grid-cols-[auto_1fr]">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Date</span>
            <div className="flex items-center gap-1">
              <IconButton label="Previous day" className="h-10 w-10 border border-line" onClick={() => go({ date: shiftDate(date, -1) })}>
                <ChevronLeft className="h-5 w-5" />
              </IconButton>
              <Input type="date" aria-label="Attendance date" value={date} max={today} className="w-44"
                onChange={(e) => e.target.value && go({ date: e.target.value > today ? today : e.target.value })} />
              <IconButton label="Next day" className="h-10 w-10 border border-line" disabled={date >= today} onClick={() => go({ date: shiftDate(date, 1) })}>
                <ChevronRight className="h-5 w-5" />
              </IconButton>
              {date !== today && <Button variant="ghost" size="sm" onClick={() => go({ date: today })}>Today</Button>}
            </div>
          </div>
          <div>
            <label htmlFor="att-course" className="mb-1.5 block text-sm font-medium text-slate-700">Course</label>
            <Select id="att-course" value={courseId} onChange={(e) => go({ course: e.target.value })} className="md:max-w-md">
              <option value="">Choose a course…</option>
              {courses.data?.map((c) => <option key={c.id} value={c.id}>{c.course_name_en}{c.status !== 'active' ? ` (${c.status})` : ''}</option>)}
            </Select>
          </div>
        </div>
      </Panel>

      {!courseId ? (
        <Panel>
          <EmptyState icon={<Users className="h-5 w-5" />} title="Choose a course"
            body="The students enrolled in that course will appear here, ready to mark." />
        </Panel>
      ) : (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-semibold text-ink">{course?.course_name_en ?? 'Course'}</h2>
              <p className="text-sm text-slate-500">
                {formatLongDate(date)}
                {hasSaved ? <span className="ml-2 text-signal-dark">· Recorded, edits allowed</span> : rows.length > 0 && <span className="ml-2 text-amber-700">· Not recorded yet</span>}
              </p>
            </div>
            {rows.length > 0 && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={<UserCheck className="h-4 w-4 text-signal-dark" />} onClick={() => setAll('present')}>All present</Button>
                <Button variant="secondary" size="sm" icon={<UserX className="h-4 w-4 text-red-600" />} onClick={() => setAll('absent')}>All absent</Button>
              </div>
            )}
          </div>

          {roster.isError || saved.isError ? <ErrorState error={roster.error ?? saved.error} onRetry={() => { roster.refetch(); saved.refetch(); }} />
            : roster.isPending || (ids.length > 0 && saved.isPending) ? <TableSkeleton rows={5} cols={2} />
            : rows.length === 0 ? (
              <EmptyState icon={<Users className="h-5 w-5" />} title="No students to mark"
                body={roster.data.length === 0 ? 'Nobody is enrolled in this course yet. Enroll students from their profile page.'
                  : 'No active students had joined this course by this date.'}
                action={hidden > 0 && <Button variant="secondary" onClick={() => setShowInactive(true)}>Show {hidden} paused or completed</Button>} />
            ) : (
              <>
                <ul className="divide-y divide-line">
                  {rows.map((r) => (
                    <AttendanceRow key={r.enrollment_id} r={r} photo={r.student_photo_path ? photos[r.student_photo_path] : null}
                      mark={marks[r.enrollment_id]} savedMark={savedMarks[r.enrollment_id]} threshold={threshold}
                      onMark={(s) => setMarks((m) => ({ ...m, [r.enrollment_id]: s }))} />
                  ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-sm text-slate-500">
                  <span className="tabular-nums">
                    {presentCount} present · {absentCount} absent{unmarked ? ` · ${unmarked} not marked` : ''}
                  </span>
                  {hidden > 0 && !showInactive && (
                    <button type="button" className="text-trace-dark hover:underline" onClick={() => setShowInactive(true)}>
                      Show {hidden} paused or completed
                    </button>
                  )}
                </div>
              </>
            )}
        </Panel>
      )}

      {/* Sticky save bar: always reachable on phones */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 shadow-lift backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <span className="text-sm text-slate-600">
              <strong className="text-ink">{changed.length}</strong> unsaved {changed.length === 1 ? 'change' : 'changes'}
              {unmarked > 0 && <span className="hidden sm:inline"> · {unmarked} not marked (won't be saved)</span>}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setMarks(savedMarks)} disabled={save.isPending}>Undo</Button>
              <Button size="lg" variant="success" icon={<Save className="h-5 w-5" />} loading={save.isPending} onClick={() => save.mutate()}>
                Save attendance
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendanceRow({ r, photo, mark, savedMark, threshold, onMark }: {
  r: EnrollmentProgress; photo: string | null; mark?: AttendanceStatus; savedMark?: AttendanceStatus;
  threshold: number; onMark: (s: AttendanceStatus) => void;
}) {
  const st = remainingStatus(r.classes_remaining, threshold);
  const edited = mark && mark !== savedMark;
  return (
    <li className={cn('flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center', edited && 'bg-trace-soft/30')}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={r.student_name} src={photo} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-ink">{r.student_name}</span>
            {edited && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-trace" title="Unsaved" />}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="tabular-nums">{r.classes_attended}/{r.total_classes} attended</span>
            {r.status !== 'active' ? <Badge tone="neutral">{r.status === 'completed' ? 'Completed' : 'Paused'}</Badge>
              : st.level !== 'normal' && <Badge tone={st.tone}>{st.label}</Badge>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:w-64" role="radiogroup" aria-label={`Attendance for ${r.student_name}`}>
        <button type="button" role="radio" aria-checked={mark === 'present'} onClick={() => onMark('present')}
          className={cn('flex h-12 items-center justify-center gap-2 rounded-lg border-2 text-sm font-semibold transition-colors',
            mark === 'present' ? 'border-signal bg-signal text-white' : 'border-line bg-white text-slate-600 hover:border-signal/60')}>
          <Check className="h-5 w-5" /> Present
        </button>
        <button type="button" role="radio" aria-checked={mark === 'absent'} onClick={() => onMark('absent')}
          className={cn('flex h-12 items-center justify-center gap-2 rounded-lg border-2 text-sm font-semibold transition-colors',
            mark === 'absent' ? 'border-red-500 bg-red-500 text-white' : 'border-line bg-white text-slate-600 hover:border-red-300')}>
          <X className="h-5 w-5" /> Absent
        </button>
      </div>
    </li>
  );
}
