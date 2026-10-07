import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Star, Trash2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import type { SuccessStory } from '@/types/database';
import { deleteStory, listStories, patchStory, type StoryRow } from '@/services/content';
import { publicUrl } from '@/services/storage';
import { useConfirm } from '@/hooks/useConfirm';
import { useReorder } from '@/hooks/useReorder';
import { cn } from '@/utils/cn';
import { PageHeader, Panel } from '@/components/ui/Panel';
import { Button, IconButton } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { ReorderButtons } from '@/components/content/ReorderButtons';
import { StoryFormModal } from '@/components/content/StoryFormModal';

const KEY = ['stories'];

export default function SuccessStoriesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<SuccessStory | null>(null);
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: KEY, queryFn: listStories });
  const reorder = useReorder<StoryRow>('success_stories', KEY);
  const rows = q.data ?? [];

  const patch = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<Pick<SuccessStory, 'is_published' | 'is_featured'>> }) => patchStory(id, p),
    onSuccess: (_d, v) => {
      toast.success(v.p.is_published !== undefined ? (v.p.is_published ? 'Published' : 'Unpublished') : (v.p.is_featured ? 'Featured' : 'No longer featured'));
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
  const remove = useMutation({ mutationFn: deleteStory, onSuccess: () => { toast.success('Story deleted'); qc.invalidateQueries({ queryKey: KEY }); } });

  const edit = (s: SuccessStory | null) => { setEditing(s); setOpen(true); };
  const onDelete = async (s: SuccessStory) => {
    if (await confirm({ title: 'Delete this success story?', message: <>{s.student_name}'s story and photo will be permanently deleted.</>, confirmLabel: 'Delete', tone: 'danger' })) remove.mutate(s);
  };

  return (
    <>
      <PageHeader title="Success stories" description="Separate from student records. Only published stories appear on the website."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => edit(null)}>New story</Button>} />
      <Panel>
        {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} />
          : q.isPending ? <TableSkeleton rows={4} />
          : rows.length === 0 ? (
            <EmptyState icon={<Trophy className="h-5 w-5" />} title="No success stories yet"
              body="Share where former students are working now. It builds trust with new visitors."
              action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => edit(null)}>New story</Button>} />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((s, idx) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                  <ReorderButtons index={idx} count={rows.length} disabled={reorder.isPending} onMove={(a, b) => reorder.move(rows, a, b)} />
                  <button type="button" onClick={() => edit(s)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Avatar name={s.student_name} src={publicUrl(s.photo_path)} size="lg" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {s.is_featured && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-label="Featured" />}
                        <span className="truncate font-medium text-ink">{s.student_name}</span>
                        <StatusBadge status={s.is_published ? 'published' : 'draft'} label={s.is_published ? 'Published' : 'Draft'} />
                      </div>
                      <div className="truncate text-sm text-slate-500">{s.courses?.course_name_en ?? 'No course'}{s.story_en ? ` · ${s.story_en}` : ''}</div>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <Toggle checked={s.is_published} label="Published" onChange={(v) => patch.mutate({ id: s.id, p: { is_published: v } })} />
                    <IconButton label={s.is_featured ? 'Unfeature' : 'Feature'} onClick={() => patch.mutate({ id: s.id, p: { is_featured: !s.is_featured } })}>
                      <Star className={cn('h-4 w-4', s.is_featured && 'fill-amber-400 text-amber-500')} />
                    </IconButton>
                    <IconButton label="Edit" onClick={() => edit(s)}><Pencil className="h-4 w-4" /></IconButton>
                    <IconButton label="Delete" className="hover:text-red-600" onClick={() => onDelete(s)}><Trash2 className="h-4 w-4" /></IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Panel>
      <StoryFormModal open={open} onClose={() => setOpen(false)} item={editing} nextOrder={rows.length} />
    </>
  );
}
