import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Instructor } from '@/types/database';
import { deleteInstructor, listInstructors, patchInstructor } from '@/services/content';
import { publicUrl } from '@/services/storage';
import { useConfirm } from '@/hooks/useConfirm';
import { useReorder } from '@/hooks/useReorder';
import { PageHeader, Panel } from '@/components/ui/Panel';
import { Button, IconButton } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Toggle } from '@/components/ui/Toggle';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { ReorderButtons } from '@/components/content/ReorderButtons';
import { InstructorFormModal } from '@/components/content/InstructorFormModal';

const KEY = ['instructors'];

export default function InstructorsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Instructor | null>(null);
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: KEY, queryFn: listInstructors });
  const reorder = useReorder<Instructor>('instructors', KEY);

  const toggle = useMutation({
    mutationFn: ({ id, v }: { id: string; v: boolean }) => patchInstructor(id, { is_active: v }),
    onSuccess: (_d, { v }) => { toast.success(v ? 'Shown on website' : 'Hidden from website'); qc.invalidateQueries({ queryKey: KEY }); },
  });
  const remove = useMutation({ mutationFn: deleteInstructor, onSuccess: () => { toast.success('Instructor deleted'); qc.invalidateQueries({ queryKey: KEY }); } });

  const rows = q.data ?? [];
  const edit = (i: Instructor | null) => { setEditing(i); setOpen(true); };
  const onDelete = async (i: Instructor) => {
    if (await confirm({ title: `Delete ${i.name_en}?`, message: 'The profile and photo will be permanently removed. Set as inactive to hide it instead.', confirmLabel: 'Delete', tone: 'danger' })) remove.mutate(i);
  };

  return (
    <>
      <PageHeader title="Instructors" description="Shown on the public website in this order. Inactive profiles are hidden."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => edit(null)}>Add instructor</Button>} />
      <Panel>
        {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} />
          : q.isPending ? <TableSkeleton rows={4} />
          : rows.length === 0 ? (
            <EmptyState icon={<GraduationCap className="h-5 w-5" />} title="No instructors yet"
              action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => edit(null)}>Add instructor</Button>} />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((i, idx) => (
                <li key={i.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                  <ReorderButtons index={idx} count={rows.length} disabled={reorder.isPending} onMove={(a, b) => reorder.move(rows, a, b)} />
                  <button type="button" onClick={() => edit(i)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Avatar name={i.name_en} src={publicUrl(i.photo_path)} size="lg" />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink">{i.name_en}</div>
                      <div className="truncate text-sm text-slate-500">{[i.position_en, i.specialization].filter(Boolean).join(' · ') || '—'}</div>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <span className="hidden text-xs text-slate-500 sm:inline">{i.is_active ? 'Active' : 'Inactive'}</span>
                    <Toggle checked={i.is_active} label="Active" onChange={(v) => toggle.mutate({ id: i.id, v })} />
                    <IconButton label="Edit" onClick={() => edit(i)}><Pencil className="h-4 w-4" /></IconButton>
                    <IconButton label="Delete" className="hover:text-red-600" onClick={() => onDelete(i)}><Trash2 className="h-4 w-4" /></IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Panel>
      <InstructorFormModal open={open} onClose={() => setOpen(false)} item={editing} nextOrder={rows.length} />
    </>
  );
}
