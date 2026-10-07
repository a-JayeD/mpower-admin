import type { ReactNode } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { friendlyError } from '@/utils/errors';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('relative overflow-hidden rounded-md bg-slate-200/70', className)} aria-hidden>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </div>;
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-8 w-8 rounded-full" />
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={cn('h-4', c === 0 ? 'w-40' : 'hidden w-24 sm:block')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-trace-soft text-trace-dark">{icon}</div>}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center" role="alert">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-ink">Could not load this data</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{friendlyError(error)}</p>
      {onRetry && <Button variant="secondary" className="mt-4" icon={<RotateCw className="h-4 w-4" />} onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500" role="status">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-trace opacity-60" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-trace" />
      </span>
      {label}…
    </div>
  );
}
