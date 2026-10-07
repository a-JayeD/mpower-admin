import { cn } from '@/utils/cn';

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden>
      <rect width="32" height="32" rx="7" fill="#13284A" />
      <path d="M7 22V10l5 7 5-7v12" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 16h5" stroke="#12B5D8" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24.5" cy="16" r="2.5" fill="#12B5D8" />
    </svg>
  );
}

export function Brand({ light = true }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <div className="leading-tight">
        <div className={cn('text-[15px] font-semibold', light ? 'text-white' : 'text-ink')}>M.Power Engineering</div>
        <div className={cn('text-xs', light ? 'text-slate-400' : 'text-slate-500')}>Admin console</div>
      </div>
    </div>
  );
}
