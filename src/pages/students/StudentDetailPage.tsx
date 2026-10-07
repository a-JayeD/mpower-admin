import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, ArrowLeft, BookOpen, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteStudent, getStudent, setStudentStatus } from '@/services/students';
import { listStudentEnrollments } from '@/services/enrollments';
import { listAttendanceHistory } from '@/services/attendance';
import { getSettings } from '@/services/settings';
import { useSignedPhotos } from '@/hooks/useSignedPhotos';
import { useConfirm } from '@/hooks/useConfirm';
import { STUDENT_STATUSES } from '@/lib/constants';
import { formatDate, plural } from '@/utils/format';
import { paths } from '@/routes/paths';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Field';
import { StudentFormModal } from '@/components/students/StudentFormModal';
import { EnrollModal } from '@/components/students/EnrollModal';
import { EnrollmentCard } from '@/components/students/EnrollmentCard';

const HISTORY_PAGE = 15;

export default function StudentDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [historyCourse, setHistoryCourse] = useState('');
  const [historyPage, setHistoryPage] = useState(1);

  const student = useQuery({ queryKey: ['student', id], queryFn: () => getStudent(id) });
  const enrollments = useQuery({ queryKey: ['enrollments', id], queryFn: () => listStudentEnrollments(id) });
  const settings = useQuery({ queryKey: ['settings'], queryFn: getSettings, staleTime: 5 * 60_000 });
  const history = useQuery({
    queryKey: ['attendance-history', 'student', id, historyCourse, historyPage],
    queryFn: () => listAttendanceHistory({ studentId: id, courseId: historyCourse || undefined }, { page: historyPage, pageSize: HISTORY_PAGE }),
    placeholderData: keepPreviousData,
  });
  const s = student.data;
  const photos = useSignedPhotos(s?.photo_path ? [s.photo_path] : []);
  const threshold = settings.data?.completion_warning_threshold ?? 3;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['student', id] });
    qc.invalidateQueries({ queryKey: ['students'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const archive = useMutation({
    mutationFn: (archived: boolean) => setStudentStatus(id, archived ? 'archived' : 'active'),
    onSuccess: (_d, archived) => { toast.success(archived ? 'Student archived' : 'Student restored'); refresh(); },
  });
  const remove = useMutation({
    mutationFn: () => deleteStudent(s!),
    onSuccess: () => {
      toast.success('Student deleted');
      qc.removeQueries({ queryKey: ['student', id] });
      refresh();
      navigate(paths.students, { replace: true });
    },
  });

  if (student.isError) return <Panel><ErrorState error={student.error} onRetry={() => student.refetch()} /></Panel>;
  if (!s) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  const archived = s.status === 'archived';
  const rows = enrollments.data ?? [];
  const totalAttended = rows.reduce((n, e) => n + e.classes_attended, 0);

  const onArchive = async () => {
    if (archived) return archive.mutate(false);
    if (await confirm({
      title: `Archive ${s.full_name}?`,
      message: 'The student is hidden from lists and attendance sheets. Enrollments and attendance history are kept.',
      confirmLabel: 'Archive',
    })) archive.mutate(true);
  };
  const onDelete = async () => {
    if (await confirm({
      title: 'Are you sure you want to delete this student?',
      message: <>This permanently deletes <strong>{s.full_name}</strong>, {plural(rows.length, 'enrollment')} and all attendance records. This cannot be undone.</>,
      confirmLabel: 'Delete permanently', tone: 'danger', typeToConfirm: 'DELETE',
    })) remove.mutate();
  };

  return (
    <>
      <Link to={paths.students} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Students
      </Link>

      <Panel className="mb-6 overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <Avatar name={s.full_name} src={s.photo_path ? photos[s.photo_path] : null} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{s.full_name}</h1>
              <StatusBadge status={s.status} label={STUDENT_STATUSES[s.status]} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
              <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1.5 tabular-nums hover:text-trace-dark"><Phone className="h-4 w-4 text-slate-400" />{s.phone}</a>
              {s.address && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" />{s.address}</span>}
              <span>Joined the center {formatDate(s.joined_on)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>Edit</Button>
            <Button variant="secondary" loading={archive.isPending} onClick={onArchive}
              icon={archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}>
              {archived ? 'Restore' : 'Archive'}
            </Button>
            <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" icon={<Trash2 className="h-4 w-4" />} onClick={onDelete}>Delete</Button>
          </div>
        </div>
        {s.notes && (
          <div className="border-t border-line bg-slate-50/60 px-5 py-3 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Notes: </span>
            <span className="whitespace-pre-line">{s.notes}</span>
          </div>
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="xl:col-span-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Courses</h2>
              <p className="text-sm text-slate-500">{plural(totalAttended, 'class', 'classes')} attended across all courses</p>
            </div>
            {!archived && <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEnrolling(true)}>Enroll in course</Button>}
          </div>
          {enrollments.isError ? <Panel><ErrorState error={enrollments.error} onRetry={() => enrollments.refetch()} /></Panel>
            : enrollments.isPending ? <Skeleton className="h-48 w-full rounded-lg" />
            : rows.length === 0 ? (
              <Panel>
                <EmptyState icon={<BookOpen className="h-5 w-5" />} title="Not enrolled in any course"
                  body="Enroll this student so they appear on the attendance sheet."
                  action={!archived && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEnrolling(true)}>Enroll in course</Button>} />
              </Panel>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {rows.map((e) => <EnrollmentCard key={e.enrollment_id} e={e} threshold={threshold} />)}
              </div>
            )}
        </section>

        <Panel className="xl:col-span-2 self-start">
          <PanelHeader title="Attendance history" actions={rows.length > 1 && (
            <Select aria-label="Filter by course" value={historyCourse} className="h-8 w-48 text-xs"
              onChange={(e) => { setHistoryCourse(e.target.value); setHistoryPage(1); }}>
              <option value="">All courses</option>
              {rows.map((e) => <option key={e.course_id} value={e.course_id}>{e.course_name_en}</option>)}
            </Select>
          )} />
          {history.isError ? <ErrorState error={history.error} onRetry={() => history.refetch()} />
            : history.isPending ? <TableSkeleton rows={5} cols={2} />
            : history.data.rows.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">No attendance recorded yet.</p>
            : (
              <>
                <ul className="divide-y divide-line">
                  {history.data.rows.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                      <span className="w-28 shrink-0 tabular-nums text-ink">{formatDate(r.class_date)}</span>
                      <span className="min-w-0 flex-1 truncate text-slate-500">{r.course_name_en}</span>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
                <Pagination page={historyPage} pageSize={HISTORY_PAGE} total={history.data.total} onPage={setHistoryPage} />
              </>
            )}
        </Panel>
      </div>

      <StudentFormModal open={editing} onClose={() => setEditing(false)} student={s} />
      <EnrollModal open={enrolling} onClose={() => setEnrolling(false)} studentId={s.id} studentName={s.full_name}
        excludeCourseIds={rows.map((e) => e.course_id)} />
    </>
  );
}
