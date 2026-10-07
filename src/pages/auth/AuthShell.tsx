import type { ReactNode } from 'react';
import { Brand } from '@/components/layout/Brand';

/** Sign-in surface: technical grid with one trace leading to the card. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="tech-grid relative flex min-h-screen items-center justify-center px-4 py-12">
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="none">
        <defs>
          <linearGradient id="trace-fade" x1="0" x2="1">
            <stop offset="0" stopColor="#12B5D8" stopOpacity="0" />
            <stop offset="1" stopColor="#12B5D8" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <path d="M0 72% H 18% L 24% 62% H 40%" fill="none" stroke="url(#trace-fade)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Brand /></div>
        <div className="rounded-xl bg-white p-6 shadow-lift sm:p-8">
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Authorised staff only. Activity is recorded.</p>
      </div>
    </div>
  );
}
