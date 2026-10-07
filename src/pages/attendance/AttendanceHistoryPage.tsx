import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarX, Download, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AttendanceDetail, AttendanceStatus } from '@/types/database';
import { deleteAttendance, listAttendanceHistory } from '@/services/attendance';
import { listCourseOptions } from '@/services/courses';
import { exportAttendanceCsv } from '@/services/export';
import { useDebounce } from '@/hooks/useDebounce';
import { usePageState } from '@/hooks/usePageState';
import { useConfirm } from '@/hooks/useConfirm';
import { PAGE_SIZE } from '@/lib/constants';
import { formatDate, shiftDate, todayISO } from '@/utils/format';
import { paths } from '@/routes/paths';
import { PageHeader, Panel, Toolbar } from '@/components/ui/Panel';
import { Button, IconButton } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';

export default function AttendanceHistoryPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const today = todayISO();
  const [courseId, setCourseId] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState(shiftDate(today, -30));
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState<AttendanceStatus | 'all'>('all');
  const [exporting, setExporting] = useState(false);
  const term = useDebounce(search, 300);
  const [page, setPage] = usePageState([courseId, term, from, to, status]);

  const courses = useQuery({ queryKey: ['course-options', 'all'], queryFn: () => listCourseOptions(true) });
  const filters = { courseId: courseId || undefined, studentSearch: term, from: from || undefined, to: to || undefined, status };
  const q = useQuery({
    queryKey: ['attendance-history', filters, page],
    queryFn: () => listAttendanceHistory(filters, { page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (r: AttendanceDetail) => deleteAttendance([r.id]),
    onSuccess: () => {
      toast.success('Attendance record deleted');
      qc.invalidateQueries({ queryKey: ['attendance-history'] });
      qc.invalidateQueries({ queryKey: ['attendance-day'] });
      qc.invalidateQueries({ queryKey: ['roster'] });
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const onDelete = async (r: AttendanceDetail) => {
    if (await confirm({
      title: 'Delete this attendance record?',
      message: <>{r.student_name} · {r.course_name_en} · {formatDate(r.class_date)} ({r.status}). Classes attended and remaining will be recalculated.</>,
      confirmLabel: 'Delete record', tone: 'danger',
    })) remove.mutate(r);
  };

  const onExport = async () => {
    setExporting(true);
    try { toast.success(`Exported ${await exportAttendanceCsv(from || undefined, to || undefined, courseId || undefined)} records`); }
    catch (e) { toast.error((e as Error).message); }
    finally { setExporting(false); }
  };

  const columns: Column<AttendanceDetail>[] = [
    { key: 'date', header: 'Date', cell: (r) => <span className="tabular-nums text-ink">{formatDate(r.class_date)}</span> },
    {
      key: 'student', header: 'Student',
      cell: (r) => <Link to={paths.student(r.student_id)} className="font-medium text-ink hover:text-trace-dark hover:underline">{r.student_name}</Link>,
    },
    { key: 'course', header: 'Course', hideBelow: 'md', cell: (r) => <span className="text-slate-600">{r.course_name_en}</span> },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', className: 'w-24 text-right',
      cell: (r) => (
        <div className="flex justify-end">
          <IconButton label="Edit on attendance sheet" onClick={() => navigate(`${paths.attendance}?course=${r.course_id}&date=${r.class_date}`)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete record" className="hover:text-red-600" onClick={() => onDelete(r)}><Trash2 className="h-4 w-4" /></IconButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <Link to={paths.attendance} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Take attendance
      </Link>
      <PageHeader title="Attendance history" description="Every saved mark. Edit a day from its attendance sheet."
        actions={<Button variant="secondary" icon={<Download className="h-4 w-4" />} loading={exporting} onClick={onExport}>Export CSV</Button>} />
      <Panel>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Student name" className="sm:w-56" />
          <Select aria-label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className="sm:w-52">
            <option value="">All courses</option>
            {courses.data?.map((c) => <option key={c.id} value={c.id}>{c.course_name_en}</option>)}
          </Select>
          <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus | 'all')} className="sm:w-36">
            <option value="all">Present & absent</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
          </Select>
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="From date" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} className="sm:w-40" />
            <span className="text-sm text-slate-400">to</span>
            <Input type="date" aria-label="To date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} className="sm:w-40" />
          </div>
        </Toolbar>
        {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} />
          : q.isPending ? <TableSkeleton cols={3} />
          : q.data.rows.length === 0 ? (
            <EmptyState icon={<CalendarX className="h-5 w-5" />} title="No attendance records" body="Nothing matches these filters. Widen the date range or clear the search." />
          ) : (
            <div className={q.isPlaceholderData ? 'opacity-60' : undefined}>
              <DataTable columns={columns} rows={q.data.rows} rowKey={(r) => r.id} />
              <Pagination page={page} pageSize={PAGE_SIZE} total={q.data.total} onPage={setPage} />
            </div>
          )}
      </Panel>
    </>
  );
}
