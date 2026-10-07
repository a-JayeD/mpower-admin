import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HelpCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Faq } from '@/types/database';
import { deleteFaq, listFaqs, patchFaq } from '@/services/content';
import { useConfirm } from '@/hooks/useConfirm';
import { useReorder } from '@/hooks/useReorder';
import { PageHeader, Panel } from '@/components/ui/Panel';
import { Button, IconButton } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { ReorderButtons } from '@/components/content/ReorderButtons';
import { FaqFormModal } from '@/components/content/FaqFormModal';

const KEY = ['faqs'];

export default function FaqsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Faq | null>(null);
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: KEY, queryFn: listFaqs });
  const reorder = useReorder<Faq>('faqs', KEY);
  const rows = q.data ?? [];

  const toggle = useMutation({
    mutationFn: ({ id, v }: { id: string; v: boolean }) => patchFaq(id, { is_published: v }),
    onSuccess: (_d, { v }) => { toast.success(v ? 'Published' : 'Unpublished'); qc.invalidateQueries({ queryKey: KEY }); },
  });
  const remove = useMutation({ mutationFn: deleteFaq, onSuccess: () => { toast.success('Question deleted'); qc.invalidateQueries({ queryKey: KEY }); } });

  const edit = (f: Faq | null) => { setEditing(f); setOpen(true); };
  const onDelete = async (f: Faq) => {
    if (await confirm({ title: 'Delete this question?', message: <>“{f.question_en}” will be permanently deleted.</>, confirmLabel: 'Delete', tone: 'danger' })) remove.mutate(f.id);
  };
  const nextOrder = rows.reduce((m, r) => Math.max(m, r.display_order + 1), 0);

  return (
    <>
      <PageHeader title="FAQ" description="Questions appear on the website in this order."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => edit(null)}>New question</Button>} />
      <Panel>
        {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} />
          : q.isPending ? <TableSkeleton rows={5} cols={1} />
          : rows.length === 0 ? (
            <EmptyState icon={<HelpCircle className="h-5 w-5" />} title="No questions yet"
              body="Add the questions visitors ask most often: fees, class times, certificates."
              action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => edit(null)}>New question</Button>} />
          ) : (
            <ol className="divide-y divide-line">
              {rows.map((f, idx) => (
                <li key={f.id} className="flex items-start gap-3 px-3 py-3 sm:px-4">
                  <ReorderButtons index={idx} count={rows.length} disabled={reorder.isPending} onMove={(a, b) => reorder.move(rows, a, b)} />
                  <button type="button" onClick={() => edit(f)} className="min-w-0 flex-1 pt-1 text-left">
                    <div className="font-medium text-ink">{f.question_en}</div>
                    {f.question_bn && <div className="font-bn text-sm text-slate-500" lang="bn">{f.question_bn}</div>}
                    {f.answer_en && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{f.answer_en}</p>}
                  </button>
                  <div className="flex items-center gap-1 pt-1">
                    <Toggle checked={f.is_published} label="Published" onChange={(v) => toggle.mutate({ id: f.id, v })} />
                    <IconButton label="Edit" onClick={() => edit(f)}><Pencil className="h-4 w-4" /></IconButton>
                    <IconButton label="Delete" className="hover:text-red-600" onClick={() => onDelete(f)}><Trash2 className="h-4 w-4" /></IconButton>
                  </div>
                </li>
              ))}
            </ol>
          )}
      </Panel>
      <FaqFormModal open={open} onClose={() => setOpen(false)} item={editing} nextOrder={nextOrder} />
    </>
  );
}
