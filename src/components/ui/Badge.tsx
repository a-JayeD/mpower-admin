import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type Tone = 'neutral' | 'trace' | 'signal' | 'amber' | 'red' | 'ink' | 'violet';

const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  trace: 'bg-trace-soft text-trace-dark ring-trace/30',
  signal: 'bg-signal-soft text-signal-dark ring-signal/30',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  ink: 'bg-ink text-white ring-ink',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
};

export function Badge({ tone = 'neutral', children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  active: 'signal', completed: 'trace', paused: 'amber', dropped: 'red', archived: 'neutral',
  upcoming: 'violet', inactive: 'neutral', present: 'signal', absent: 'red',
  new: 'trace', read: 'neutral', replied: 'signal', published: 'signal', draft: 'neutral',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge tone={statusTone[status] ?? 'neutral'} dot>{label ?? status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}
