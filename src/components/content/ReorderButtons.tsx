import { ArrowDown, ArrowUp } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';

/** Move-up / move-down controls; simpler and more reliable than drag-and-drop on phones. */
export function ReorderButtons({ index, count, onMove, disabled }: {
  index: number; count: number; onMove: (from: number, to: number) => void; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <IconButton label="Move up" className="h-7 w-7" disabled={disabled || index === 0} onClick={() => onMove(index, index - 1)}>
        <ArrowUp className="h-4 w-4" />
      </IconButton>
      <IconButton label="Move down" className="h-7 w-7" disabled={disabled || index === count - 1} onClick={() => onMove(index, index + 1)}>
        <ArrowDown className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
