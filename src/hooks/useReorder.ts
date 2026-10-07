import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import { saveOrder, type OrderedTable } from '@/services/content';
import { friendlyError } from '@/utils/errors';

/** Optimistic move-up/move-down for any table with a display_order column. */
export function useReorder<T extends { id: string; display_order: number }>(table: OrderedTable, queryKey: QueryKey) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (rows: T[]) => saveOrder(table, rows),
    onMutate: async (rows) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<T[]>(queryKey);
      qc.setQueryData<T[]>(queryKey, rows.map((r, i) => ({ ...r, display_order: i })));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error(friendlyError(e));
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  const move = (rows: T[], from: number, to: number) => {
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    m.mutate(next);
  };
  return { move, isPending: m.isPending };
}
