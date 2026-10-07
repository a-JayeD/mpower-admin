import { cn } from '@/utils/cn';

/** Progress as a trace filling up, with a node at the current position. */
export function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  const done = pct >= 100;
  return (
    <div className={cn('relative h-1.5 w-full rounded-full bg-slate-200', className)} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className={cn('h-full rounded-full', done ? 'bg-trace' : 'bg-signal')} style={{ width: `${pct}%` }} />
      {pct > 0 && !done && (
        <span className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-signal shadow" style={{ left: `${pct}%` }} />
      )}
    </div>
  );
}
