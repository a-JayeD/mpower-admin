import { Link } from 'react-router-dom';
import { buttonStyles } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { paths } from '@/routes/paths';

export default function NotFoundPage() {
  return (
    <Panel>
      <div className="flex flex-col items-center px-6 py-20 text-center">
        <svg viewBox="0 0 120 40" className="mb-6 h-10 w-32 text-slate-300" aria-hidden>
          <path d="M2 20h40l8-12 8 24 8-12h20" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="86" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M100 20h18" stroke="currentColor" strokeWidth="2" strokeDasharray="3 4" />
        </svg>
        <h1 className="text-xl font-semibold text-ink">Page not found</h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500">This link leads nowhere. It may have been mistyped, or the item was deleted.</p>
        <Link to={paths.dashboard} className={buttonStyles('primary', 'md', 'mt-6')}>Back to dashboard</Link>
      </div>
    </Panel>
  );
}
