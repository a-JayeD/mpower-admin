import { useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** English / বাংলা tabs for bilingual forms. Both panels stay mounted so values persist. */
export function LanguageTabs({ en, bn, bnHasError, enHasError }: { en: ReactNode; bn: ReactNode; enHasError?: boolean; bnHasError?: boolean }) {
  const [tab, setTab] = useState<'en' | 'bn'>('en');
  const tabBtn = (key: 'en' | 'bn', label: string, err?: boolean) => (
    <button type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
      className={cn('relative -mb-px border-b-2 px-4 py-2 text-sm font-medium',
        tab === key ? 'border-trace text-ink' : 'border-transparent text-slate-500 hover:text-ink', key === 'bn' && 'font-bn')}>
      {label}
      {err && <span className="absolute right-1 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" aria-label="has errors" />}
    </button>
  );
  return (
    <div>
      <div role="tablist" className="mb-4 flex border-b border-line">
        {tabBtn('en', 'English', enHasError)}
        {tabBtn('bn', 'বাংলা', bnHasError)}
      </div>
      <div className={cn('space-y-4', tab !== 'en' && 'hidden')}>{en}</div>
      <div className={cn('space-y-4 font-bn', tab !== 'bn' && 'hidden')} lang="bn">{bn}</div>
    </div>
  );
}
