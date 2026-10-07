import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import type { AuditLog } from '@/types/database';
import { listAuditLogs } from '@/services/audit';
import { useDebounce } from '@/hooks/useDebounce';
import { usePageState } from '@/hooks/usePageState';
import { PAGE_SIZE } from '@/lib/constants';
import { formatDateTime, todayISO } from '@/utils/format';
import { PageHeader, Panel, Toolbar } from '@/components/ui/Panel';
import { Input, Select } from '@/components/ui/Field';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { Badge, type Tone } from '@/components/ui/Badge';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';

const ENTITIES: Record<string, string> = {
  students: 'Student', student_courses: 'Enrollment', attendance: 'Attendance', courses: 'Course',
  gallery_albums: 'Gallery album', gallery_images: 'Gallery image', updates: 'News / update', instructors: 'Instructor',
  success_stories: 'Success story', faqs: 'FAQ', contact_messages: 'Message', site_settings: 'Settings', admins: 'Administrator',
};
const ACTIONS: Record<AuditLog['action'], { label: string; tone: Tone }> = {
  create: { label: 'Added', tone: 'signal' }, update: { label: 'Edited', tone: 'trace' }, delete: { label: 'Deleted', tone: 'red' },
};

export default function AuditLogPage() {
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const term = useDebounce(search, 300);
  const [page, setPage] = usePageState([entity, action, term, from, to]);

  const filters = { entity: entity || undefined, action: action || undefined, search: term, from: from || undefined, to: to || undefined };
  const q = useQuery({
    queryKey: ['audit', filters, page],
    queryFn: () => listAuditLogs(filters, { page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const columns: Column<AuditLog>[] = [
    { key: 'when', header: 'When', className: 'whitespace-nowrap', cell: (r) => <span className="tabular-nums text-slate-600">{formatDateTime(r.created_at)}</span> },
    { key: 'who', header: 'Administrator', hideBelow: 'md', cell: (r) => <span className="text-slate-700">{r.admin_email ?? 'System'}</span> },
    {
      key: 'what', header: 'Action',
      cell: (r) => (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={ACTIONS[r.action].tone}>{ACTIONS[r.action].label}</Badge>
          <span className="text-slate-500">{ENTITIES[r.entity] ?? r.entity}</span>
        </div>
      ),
    },
    {
      key: 'detail', header: 'Details',
      cell: (r) => (
        <div className="max-w-md">
          <div className="truncate text-ink">{r.summary || '—'}</div>
          {r.action === 'update' && r.changed_fields.length > 0 && (
            <div className="truncate text-xs text-slate-500">Changed: {r.changed_fields.join(', ').replace(/_/g, ' ')}</div>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Activity log" description="Every change made by an administrator is recorded automatically by the database and cannot be edited." />
      <Panel>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search details or admin email" className="sm:w-72" />
          <Select aria-label="Record type" value={entity} onChange={(e) => setEntity(e.target.value)} className="sm:w-44">
            <option value="">All records</option>
            {Object.entries(ENTITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select aria-label="Action" value={action} onChange={(e) => setAction(e.target.value)} className="sm:w-36">
            <option value="">All actions</option>
            {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="From date" value={from} max={to || todayISO()} onChange={(e) => setFrom(e.target.value)} className="sm:w-40" />
            <span className="text-sm text-slate-400">to</span>
            <Input type="date" aria-label="To date" value={to} min={from} max={todayISO()} onChange={(e) => setTo(e.target.value)} className="sm:w-40" />
          </div>
        </Toolbar>
        {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} />
          : q.isPending ? <TableSkeleton cols={3} />
          : q.data.rows.length === 0 ? <EmptyState icon={<ScrollText className="h-5 w-5" />} title="No activity found" body="Try removing a filter." />
          : (
            <div className={q.isPlaceholderData ? 'opacity-60' : undefined}>
              <DataTable columns={columns} rows={q.data.rows} rowKey={(r) => r.id} />
              <Pagination page={page} pageSize={PAGE_SIZE} total={q.data.total} onPage={setPage} />
            </div>
          )}
      </Panel>
    </>
  );
}
