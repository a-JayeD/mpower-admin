import { Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export function SearchInput({ value, onChange, placeholder = 'Search', className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-9 text-sm focus:border-trace focus:outline-none focus:ring-2 focus:ring-trace/25"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
