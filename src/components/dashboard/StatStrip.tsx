import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

export interface Stat { label: string; value: ReactNode; detail?: ReactNode; to?: string; highlight?: boolean }

/** One instrument-panel strip instead of a row of identical cards. */
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-white shadow-panel sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((s, i) => {
        const inner = (
          <>
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className={cn('mt-1 text-3xl font-semibold tabular-nums tracking-tight', s.highlight ? 'text-amber-600' : 'text-ink')}>{s.value}</div>
            {s.detail && <div className="mt-0.5 text-xs text-slate-500">{s.detail}</div>}
          </>
        );
        const cls = cn('block px-5 py-4 border-line', i > 0 && 'border-l', i >= 2 && 'max-sm:border-t', i === 2 && 'max-sm:border-l-0',
          i >= 3 && 'sm:max-lg:border-t', i === 3 && 'sm:max-lg:border-l-0', i === 4 && 'max-sm:border-l-0 max-sm:col-span-2');
        return s.to ? <Link key={s.label} to={s.to} className={cn(cls, 'hover:bg-trace-soft/40')}>{inner}</Link> : <div key={s.label} className={cls}>{inner}</div>;
      })}
    </div>
  );
}
