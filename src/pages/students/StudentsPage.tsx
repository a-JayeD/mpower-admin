import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Download, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { StudentStatus } from '@/types/database';
import type { SortState } from '@/types/common';
import {
  deleteStudent, listStudents, setStudentStatus, type StudentFilters, type StudentListRow, type StudentSortColumn,
} from '@/services/students';
import { listCourseOptions } from '@/services/courses';
import { exportStudentsCsv } from '@/services/export';
import { useDebounce } from '@/hooks/useDebounce';
import { usePageState } from '@/hooks/usePageState';
import { useSignedPhotos } from '@/hooks/useSignedPhotos';
import { useConfirm } from '@/hooks/useConfirm';
import { PAGE_SIZE, STUDENT_STATUSES } from '@/lib/constants';
import { formatDate } from '@/utils/format';
import { paths } from '@/routes/paths';
import { PageHeader, Panel, Toolbar } from '@/components/ui/Panel';
import { Button, IconButton } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Field';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { StudentFormModal } from '@/components/students/StudentFormModal';

type StatusFilter = NonNullable<StudentFilters['status']>;

export default function StudentsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>((params.get('status') as StatusFilter) || 'current');
  const [courseId, setCourseId] = useState(params.get('course') ?? '');
  const [sort, setSort] = useState<SortState<StudentSortColumn>>({ column: 'created_at', dir: 'desc' });
  const [formOpen, setFormOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const term = useDebounce(search, 300);
  const [page, setPage] = usePageState([term, status, courseId, sort]);

  // Dashboard "Add student" opens the form directly.
  useEffect(() => {
    if (params.get('new') === '1') {
      setFormOpen(true);
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const courses = useQuery({ queryKey: ['course-options', 'all'], queryFn: () => listCourseOptions(true) });
  const filters: StudentFilters = { search: term, status, courseId: courseId || undefined };
  const q = useQuery({
    queryKey: ['students', filters, page, sort],
    queryFn: () => listStudents(filters, { page, pageSize: PAGE_SIZE }, sort),
    placeholderData: keepPreviousData,
  });
  const photos = useSignedPhotos(q.data?.rows.map((r) => r.photo_path) ?? []);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['students'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const archive = useMutation({
    mutationFn: ({ id, to }: { id: string; to: StudentStatus }) => setStudentStatus(id, to),
    onSuccess: (_d, v) => { toast.success(v.to === 'archived' ? 'Student archived' : 'Student restored'); refresh(); },
  });
  const remove = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => { toast.success('Student deleted'); refresh(); },
  });

  const onArchive = async (s: StudentListRow) => {
    if (s.status === 'archived') return archive.mutate({ id: s.id, to: 'active' });
    if (await confirm({
      title: `Archive ${s.full_name}?`,
      message: 'Archived students are hidden from lists and attendance but all records are kept. You can restore them at any time.',
      confirmLabel: 'Archive',
    })) archive.mutate({ id: s.id, to: 'archived' });
  };

  const onDelete = async (s: StudentListRow) => {
    if (await confirm({
      title: 'Are you sure you want to delete this student?',
      message: <>This permanently deletes <strong>{s.full_name}</strong>, every enrollment and every attendance record. Archiving keeps the history instead.</>,
      confirmLabel: 'Delete permanently',
      tone: 'danger',
      typeToConfirm: 'DELETE',
    })) remove.mutate(s);
  };

  const onExport = async () => {
    setExporting(true);
    try {
      const n = await exportStudentsCsv();
      toast.success(`Exported ${n} students`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<StudentListRow, StudentSortColumn>[] = [
    {
      key: 'name', header: 'Student', sortKey: 'full_name',
      cell: (s) => (
        <div className="flex items-center gap-3">
          <Avatar name={s.full_name} src={s.photo_path ? photos[s.photo_path] : null} />
          <div className="min-w-0">
            <div className="truncate font-medium text-ink">{s.full_name}</div>
            <div className="text-xs tabular-nums text-slate-500">{s.phone}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'courses', header: 'Courses', hideBelow: 'md',
      cell: (s) => s.student_courses.length === 0 ? <span className="text-slate-400">Not enrolled</span> : (
        <div className="flex max-w-xs flex-wrap gap-1">
          {s.student_courses.map((e) => (
            <span key={e.id} className="truncate rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700" title={e.status}>
              {e.courses?.course_name_en ?? 'Course'}
            </span>
          ))}
        </div>
      ),
    },
    { key: 'joined', header: 'Joined', sortKey: 'joined_on', hideBelow: 'sm', cell: (s) => <span className="tabular-nums">{formatDate(s.joined_on)}</span> },
    { key: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.status} label={STUDENT_STATUSES[s.status]} /> },
    {
      key: 'actions', header: '', className: 'w-24 text-right',
      cell: (s) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <IconButton label={s.status === 'archived' ? 'Restore' : 'Archive'} onClick={() => onArchive(s)}>
            {s.status === 'archived' ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </IconButton>
          <IconButton label="Delete" className="hover:text-red-600" onClick={() => onDelete(s)}><Trash2 className="h-4 w-4" /></IconButton>
        </div>
      ),
    },
  ];

  const filtered = Boolean(term || courseId || status !== 'current');

  return (
    <>
      <PageHeader
        title="Students"
        description="Internal records only. Nothing here is visible on the public website."
        actions={<>
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} loading={exporting} onClick={onExport}>Export CSV</Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>Add student</Button>
        </>}
      />
      <Panel>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search name or phone" className="sm:w-72" />
          <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="sm:w-44">
            <option value="current">All except archived</option>
            {Object.entries(STUDENT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            <option value="all">Everyone</option>
          </Select>
          <Select aria-label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className="sm:w-56">
            <option value="">All courses</option>
            {courses.data?.map((c) => <option key={c.id} value={c.id}>{c.course_name_en}</option>)}
          </Select>
          {filtered && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatus('current'); setCourseId(''); }}>Clear filters</Button>
          )}
        </Toolbar>
        {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} />
          : q.isPending ? <TableSkeleton />
          : q.data.rows.length === 0 ? (
            <EmptyState icon={<Users className="h-5 w-5" />}
              title={filtered ? 'No students match these filters' : 'No students yet'}
              body={filtered ? 'Try a different name, phone number or status.' : 'Add your first student, then enroll them in a course.'}
              action={!filtered && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>Add student</Button>} />
          ) : (
            <div className={q.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
              <DataTable columns={columns} rows={q.data.rows} rowKey={(r) => r.id} sort={sort} onSort={setSort}
                onRowClick={(r) => navigate(paths.student(r.id))} />
              <Pagination page={page} pageSize={PAGE_SIZE} total={q.data.total} onPage={setPage} />
            </div>
          )}
      </Panel>
      <StudentFormModal open={formOpen} onClose={() => setFormOpen(false)} student={null}
        onSaved={(s) => navigate(paths.student(s.id))} />
    </>
  );
}
