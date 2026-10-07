import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, CheckCheck, Inbox, Mail, MailOpen, MessageCircle, Phone, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ContactMessage, MessageStatus } from '@/types/database';
import { deleteMessage, listMessages, setMessageStatus } from '@/services/messages';
import { useDebounce } from '@/hooks/useDebounce';
import { usePageState } from '@/hooks/usePageState';
import { useConfirm } from '@/hooks/useConfirm';
import { MESSAGE_STATUSES, PAGE_SIZE } from '@/lib/constants';
import { formatDateTime, relativeTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import { PageHeader, Panel, Toolbar } from '@/components/ui/Panel';
import { Button, buttonStyles } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';

type Filter = MessageStatus | 'all' | 'inbox';
const FILTERS: Array<[Filter, string]> = [['inbox', 'Inbox'], ['new', 'New'], ['replied', 'Replied'], ['archived', 'Archived'], ['all', 'All']];

/** Bangladeshi numbers like 017… → 88017… for wa.me links. */
function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('0') ? `88${digits}` : digits;
}

export default function MessagesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Filter>('inbox');
  const [search, setSearch] = useState('');
  const [openMsg, setOpenMsg] = useState<ContactMessage | null>(null);
  const term = useDebounce(search, 300);
  const [page, setPage] = usePageState([filter, term]);

  const q = useQuery({
    queryKey: ['messages', filter, term, page],
    queryFn: () => listMessages({ status: filter, search: term }, { page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['messages'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); };

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MessageStatus; quiet?: boolean }) => setMessageStatus(id, status),
    onSuccess: (_d, v) => {
      if (!v.quiet) toast.success(`Marked as ${MESSAGE_STATUSES[v.status].toLowerCase()}`);
      setOpenMsg((m) => (m && m.id === v.id ? { ...m, status: v.status } : m));
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: deleteMessage,
    onSuccess: () => { toast.success('Message deleted'); setOpenMsg(null); refresh(); },
  });

  const open = (m: ContactMessage) => {
    setOpenMsg(m);
    if (m.status === 'new') setStatus.mutate({ id: m.id, status: 'read', quiet: true });
  };
  const onDelete = async (m: ContactMessage) => {
    if (await confirm({ title: 'Delete this message?', message: <>The message from {m.name} will be permanently deleted. Archive it to keep a record.</>, confirmLabel: 'Delete', tone: 'danger' })) remove.mutate(m.id);
  };

  return (
    <>
      <PageHeader title="Messages" description="Sent from the contact form on the public website." />
      <Panel>
        <div className="flex gap-1 overflow-x-auto border-b border-line px-3 pt-2" role="tablist">
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
              className={cn('-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium',
                filter === k ? 'border-trace text-ink' : 'border-transparent text-slate-500 hover:text-ink')}>
              {label}
            </button>
          ))}
        </div>
        <Toolbar><SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, email or subject" className="sm:w-96" /></Toolbar>
        {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} />
          : q.isPending ? <TableSkeleton />
          : q.data.rows.length === 0 ? (
            <EmptyState icon={<Inbox className="h-5 w-5" />} title={filter === 'new' ? 'No new messages' : 'Nothing here'}
              body={term ? 'No messages match your search.' : 'Messages from the website contact form will appear here.'} />
          ) : (
            <div className={q.isPlaceholderData ? 'opacity-60' : undefined}>
              <ul className="divide-y divide-line">
                {q.data.rows.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => open(m)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-trace-soft/40">
                      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', m.status === 'new' ? 'bg-trace' : 'bg-transparent')} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className={cn('truncate text-ink', m.status === 'new' ? 'font-semibold' : 'font-medium')}>{m.name}</span>
                          <span className="shrink-0 text-xs text-slate-400">{relativeTime(m.created_at)}</span>
                        </div>
                        <div className="truncate text-sm text-slate-700">{m.subject || 'No subject'}</div>
                        <div className="truncate text-sm text-slate-500">{m.message}</div>
                      </div>
                      <span className="hidden sm:block"><StatusBadge status={m.status} label={MESSAGE_STATUSES[m.status]} /></span>
                    </button>
                  </li>
                ))}
              </ul>
              <Pagination page={page} pageSize={PAGE_SIZE} total={q.data.total} onPage={setPage} />
            </div>
          )}
      </Panel>

      <Modal open={!!openMsg} onClose={() => setOpenMsg(null)} size="lg" title={openMsg?.subject || 'Message'}
        description={openMsg ? `From ${openMsg.name} · ${formatDateTime(openMsg.created_at)}` : undefined}
        footer={openMsg && <>
          <Button variant="ghost" className="mr-auto text-red-600 hover:bg-red-50" icon={<Trash2 className="h-4 w-4" />} onClick={() => onDelete(openMsg)}>Delete</Button>
          {openMsg.status !== 'archived' && (
            <Button variant="secondary" icon={<Archive className="h-4 w-4" />} onClick={() => setStatus.mutate({ id: openMsg.id, status: 'archived' })}>Archive</Button>
          )}
          {openMsg.status !== 'new' && openMsg.status !== 'replied' && (
            <Button variant="secondary" icon={<MailOpen className="h-4 w-4" />} onClick={() => setStatus.mutate({ id: openMsg.id, status: 'new' })}>Mark unread</Button>
          )}
          {openMsg.status !== 'replied' && (
            <Button variant="success" icon={<CheckCheck className="h-4 w-4" />} onClick={() => setStatus.mutate({ id: openMsg.id, status: 'replied' })}>Mark as replied</Button>
          )}
        </>}>
        {openMsg && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={openMsg.status} label={MESSAGE_STATUSES[openMsg.status]} />
              {openMsg.replied_at && <span className="text-xs text-slate-500">Replied {formatDateTime(openMsg.replied_at)}</span>}
            </div>
            <p className="whitespace-pre-line rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-ink">{openMsg.message}</p>
            <div className="flex flex-wrap gap-2">
              {openMsg.phone && <>
                <a href={`tel:${openMsg.phone}`} className={buttonStyles('secondary', 'sm')}><Phone className="h-4 w-4" />Call {openMsg.phone}</a>
                <a href={`https://wa.me/${whatsappNumber(openMsg.phone)}`} target="_blank" rel="noopener noreferrer" className={buttonStyles('secondary', 'sm')}>
                  <MessageCircle className="h-4 w-4" />WhatsApp
                </a>
              </>}
              {openMsg.email && (
                <a href={`mailto:${openMsg.email}?subject=${encodeURIComponent(`Re: ${openMsg.subject || 'Your message to M.Power Engineering'}`)}`}
                  className={buttonStyles('secondary', 'sm')}>
                  <Mail className="h-4 w-4" />Email {openMsg.email}
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
