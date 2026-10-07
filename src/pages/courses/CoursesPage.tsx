import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive, ArchiveRestore, BookOpen, CalendarCheck, Download, MoreHorizontal, Pencil, Plus, Power, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Course, CourseStatus } from '@/types/database';
import { deleteCourse, listCourses, setCourseStatus, type CourseWithCounts } from '@/services/courses';
import { publicUrl } from '@/services/storage';
import { exportCoursesCsv } from '@/services/export';
import { useDebounce } from '@/hooks/useDebounce';
import { useConfirm } from '@/hooks/useConfirm';
import { COURSE_STATUSES, WEEKDAYS } from '@/lib/constants';
import { formatMoney } from '@/utils/format';
import { paths } from '@/routes/paths';
import { PageHeader, Panel, Toolbar } from '@/components/ui/Panel';
import { Button, IconButton } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Field';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { CourseFormModal } from '@/components/courses/CourseFormModal';

type StatusFilter = CourseStatus | 'all' | 'current';

export default function CoursesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [status, setStatus] = useState<StatusFilter>('current');
  const [editing, setEditing] = useState<Course | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const term = useDebounce(search, 300);

  const q = useQuery({ queryKey: ['courses', term, status], queryFn: () => listCourses({ search: term, status }) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['courses'] });
    qc.invalidateQueries({ queryKey: ['course-options'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const setStatusM = useMutation({
    mutationFn: ({ id, to }: { id: string; to: CourseStatus }) => setCourseStatus(id, to),
    onSuccess: (_d, v) => { toast.success(`Course set to ${COURSE_STATUSES[v.to].toLowerCase()}`); refresh(); },
  });
  const remove = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => { toast.success('Course deleted'); refresh(); },
  });

  const open = (c: Course | null) => { setEditing(c); setFormOpen(true); };

  const onArchive = async (c: Course) => {
    if (c.status === 'archived') return setStatusM.mutate({ id: c.id, to: 'inactive' });
    if (await confirm({
      title: `Archive ${c.course_name_en}?`,
      message: 'The course disappears from the website and course pickers. Enrollment and attendance history are kept.',
      confirmLabel: 'Archive',
    })) setStatusM.mutate({ id: c.id, to: 'archived' });
  };

  const onDelete = async (c: CourseWithCounts) => {
    const enrolled = c.student_courses[0]?.count ?? 0;
    if (enrolled > 0) {
      toast.error(`${enrolled} enrollment(s) belong to this course, so deleting it would erase attendance history. Archive it instead.`);
      return;
    }
    if (await confirm({
      title: `Delete ${c.course_name_en}?`,
      message: 'The course and its image will be permanently deleted.',
      confirmLabel: 'Delete course', tone: 'danger',
    })) remove.mutate(c);
  };

  const onExport = async () => {
    setExporting(true);
    try { toast.success(`Exported ${await exportCoursesCsv()} courses`); }
    catch (e) { toast.error((e as Error).message); }
    finally { setExporting(false); }
  };

  return (
    <>
      <PageHeader title="Courses" description="Active and upcoming courses appear on the public website."
        actions={<>
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} loading={exporting} onClick={onExport}>Export CSV</Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => open(null)}>Add course</Button>
        </>} />

      <Panel>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search courses" className="sm:w-72" />
          <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="sm:w-48">
            <option value="current">All except archived</option>
            {Object.entries(COURSE_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            <option value="all">Everything</option>
          </Select>
        </Toolbar>

        {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} />
          : q.isPending ? (
            <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
            </div>
          ) : q.data.length === 0 ? (
            <EmptyState icon={<BookOpen className="h-5 w-5" />}
              title={term ? 'No courses match your search' : 'No courses yet'}
              body={term ? undefined : 'Add the courses you teach. Students can then be enrolled and attendance taken.'}
              action={!term && <Button icon={<Plus className="h-4 w-4" />} onClick={() => open(null)}>Add course</Button>} />
          ) : (
            <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {q.data.map((c) => (
                <CourseCard key={c.id} c={c} onEdit={() => open(c)} onArchive={() => onArchive(c)} onDelete={() => onDelete(c)}
                  onToggle={() => setStatusM.mutate({ id: c.id, to: c.status === 'active' ? 'inactive' : 'active' })} />
              ))}
            </div>
          )}
      </Panel>
      <CourseFormModal open={formOpen} onClose={() => setFormOpen(false)} course={editing} />
    </>
  );
}

function CourseCard({ c, onEdit, onToggle, onArchive, onDelete }: {
  c: CourseWithCounts; onEdit: () => void; onToggle: () => void; onArchive: () => void; onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const img = publicUrl(c.image_path);
  const enrolled = c.student_courses[0]?.count ?? 0;
  const act = (fn: () => void) => () => { setMenu(false); fn(); };

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-line bg-white">
      <div className="relative aspect-[16/7] bg-ink-2">
        {img ? <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
          : <div className="tech-grid flex h-full items-center justify-center"><BookOpen className="h-8 w-8 text-trace/60" /></div>}
        <div className="absolute left-3 top-3"><StatusBadge status={c.status} label={COURSE_STATUSES[c.status]} /></div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-ink">{c.course_name_en}</h3>
            {c.course_name_bn && <p className="font-bn text-sm text-slate-500" lang="bn">{c.course_name_bn}</p>}
          </div>
          <div className="relative">
            <IconButton label="Course actions" onClick={() => setMenu((m) => !m)}><MoreHorizontal className="h-4 w-4" /></IconButton>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-line bg-white py-1 text-sm shadow-lift">
                  <MenuItem icon={<Pencil className="h-4 w-4" />} onClick={act(onEdit)}>Edit</MenuItem>
                  {c.status !== 'archived' && (
                    <MenuItem icon={<Power className="h-4 w-4" />} onClick={act(onToggle)}>{c.status === 'active' ? 'Deactivate' : 'Activate'}</MenuItem>
                  )}
                  <MenuItem icon={c.status === 'archived' ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />} onClick={act(onArchive)}>
                    {c.status === 'archived' ? 'Unarchive' : 'Archive'}
                  </MenuItem>
                  <MenuItem danger icon={<Trash2 className="h-4 w-4" />} onClick={act(onDelete)}>Delete</MenuItem>
                </div>
              </>
            )}
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 border-y border-line py-3 text-center">
          <div><dt className="text-xs text-slate-500">Fee</dt><dd className="text-sm font-semibold tabular-nums text-ink">{formatMoney(Number(c.joining_fee))}</dd></div>
          <div><dt className="text-xs text-slate-500">Classes</dt><dd className="text-sm font-semibold tabular-nums text-ink">{c.total_classes}</dd></div>
          <div><dt className="text-xs text-slate-500">Enrolled</dt><dd className="text-sm font-semibold tabular-nums text-ink">{enrolled}</dd></div>
        </dl>
        <div className="mt-3 flex flex-1 flex-wrap items-end justify-between gap-2 text-xs text-slate-500">
          <span>
            {c.duration_en || 'Duration not set'}
            {c.class_days?.length ? ` · ${c.class_days.map((d) => WEEKDAYS[d]).join(', ')}` : ''}
          </span>
          {c.status === 'active' && (
            <Link to={`${paths.attendance}?course=${c.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-trace-dark hover:underline">
              <CalendarCheck className="h-4 w-4" /> Attendance
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function MenuItem({ icon, children, onClick, danger }: { icon: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left ${danger ? 'text-red-600 hover:bg-red-50' : 'hover:bg-slate-50'}`}>
      {icon}{children}
    </button>
  );
}
