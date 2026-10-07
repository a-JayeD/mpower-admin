import { initials } from '@/utils/format';
import { cn } from '@/utils/cn';

export function Avatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const s = { sm: 'h-8 w-8 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base', xl: 'h-20 w-20 text-xl' }[size];
  return src ? (
    <img src={src} alt="" loading="lazy" className={cn('shrink-0 rounded-full object-cover ring-1 ring-line', s)} />
  ) : (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-ink-2 font-semibold text-white', s)} aria-hidden>
      {initials(name) || '?'}
    </span>
  );
}
