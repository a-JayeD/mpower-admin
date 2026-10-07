import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { NewsUpdate } from '@/types/database';
import { deleteUpdate, listUpdates, patchUpdate } from '@/services/content';
import { publicUrl } from '@/services/storage';
import { useDebounce } from '@/hooks/useDebounce';
import { useConfirm } from '@/hooks/useConfirm';
import { UPDATE_TYPES } from '@/lib/constants';
import { formatDateTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import { PageHeader, Panel, Toolbar } from '@/components/ui/Panel';
import { Button, IconButton } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Field';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { UpdateFormModal } from '@/components/content/UpdateFormModal';

type State = 'all' | 'published' | 'draft' | 'featured';

export default function UpdatesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [state, setState] = useState<State>('all');
  const [editing, setEditing] = useState<NewsUpdate | null>(null);
  const [open, setOpen] = useState(false);
  const term = useDebounce(search, 300);

  const q = useQuery({ queryKey: ['updates', term, state], queryFn: () => listUpdates({ search: term, state }) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['updates'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); };

  const patch = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<Pick<NewsUpdate, 'is_published' | 'is_featured'>> }) => patchUpdate(id, p),
    onSuccess: (_d, v) => {
      if (v.p.is_published !== undefined) toast.success(v.p.is_published ? 'Published' : 'Moved to drafts');
      else toast.success(v.p.is_featured ? 'Featured' : 'No longer featured');
      refresh();
    },
  });
  const remove = useMutation({ mutationFn: deleteUpdate, onSuccess: () => { toast.success('Update deleted'); refresh(); } });

  const onDelete = async (u: NewsUpdate) => {
    if (await confirm({ title: 'Delete this update?', message: <>“{u.title_en}” and its cover image will be permanently deleted.</>, confirmLabel: 'Delete', tone: 'danger' })) remove.mutate(u);
  };
  const edit = (u: NewsUpdate | null) => { setEditing(u); setOpen(true); };
  const now = Date.now();

  return (
    <>
      <PageHeader title="News & updates" description="Announcements, news, notices and events for the public website."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => edit(null)}>New update</Button>} />
      <Panel>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search titles" className="sm:w-72" />
          <Select aria-label="Show" value={state} onChange={(e) => setState(e.target.value as State)} className="sm:w-40">
            <option value="all">All</option><option value="published">Published</option>
            <option value="draft">Drafts</option><option value="featured">Featured</option>
          </Select>
        </Toolbar>
        {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} />
          : q.isPending ? <TableSkeleton />
          : q.data.length === 0 ? (
            <EmptyState icon={<Megaphone className="h-5 w-5" />} title="No updates here"
              body="Write an announcement or notice. Save it as a draft until it's ready."
              action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => edit(null)}>New update</Button>} />
          ) : (
            <ul className="divide-y divide-line">
              {q.data.map((u) => {
                const scheduled = u.is_published && new Date(u.publish_date).getTime() > now;
                const cover = publicUrl(u.cover_image_path);
                return (
                  <li key={u.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                    <button type="button" onClick={() => edit(u)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100">
                        {cover && <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {u.is_featured && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-label="Featured" />}
                          <span className="truncate font-medium text-ink">{u.title_en}</span>
                        </div>
                        {u.title_bn && <div className="truncate font-bn text-sm text-slate-500" lang="bn">{u.title_bn}</div>}
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <Badge tone="neutral">{UPDATE_TYPES[u.type]}</Badge>
                          <span>{formatDateTime(u.publish_date)}</span>
                          {scheduled ? <Badge tone="violet">Scheduled</Badge> : <StatusBadge status={u.is_published ? 'published' : 'draft'} label={u.is_published ? 'Published' : 'Draft'} />}
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      <label className="mr-2 flex items-center gap-2 text-xs text-slate-500">
                        Published <Toggle checked={u.is_published} label="Published" onChange={(v) => patch.mutate({ id: u.id, p: { is_published: v } })} />
                      </label>
                      <IconButton label={u.is_featured ? 'Unfeature' : 'Feature'} onClick={() => patch.mutate({ id: u.id, p: { is_featured: !u.is_featured } })}>
                        <Star className={cn('h-4 w-4', u.is_featured && 'fill-amber-400 text-amber-500')} />
                      </IconButton>
                      <IconButton label="Edit" onClick={() => edit(u)}><Pencil className="h-4 w-4" /></IconButton>
                      <IconButton label="Delete" className="hover:text-red-600" onClick={() => onDelete(u)}><Trash2 className="h-4 w-4" /></IconButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
      </Panel>
      <UpdateFormModal open={open} onClose={() => setOpen(false)} item={editing} />
    </>
  );
}
