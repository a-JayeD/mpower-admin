import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useConfirm } from '@/hooks/useConfirm';
import { Sidebar } from './Sidebar';
import { GlobalSearch } from './GlobalSearch';
import { Spinner } from '@/components/ui/Feedback';
import { initials } from '@/utils/format';

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { admin, signOut } = useAuth();
  const confirm = useConfirm();

  const onSignOut = async () => {
    if (await confirm({ title: 'Sign out?', message: 'You will need your email and password to sign in again.', confirmLabel: 'Sign out' })) {
      await signOut();
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-sm font-medium text-ink">{admin?.full_name || admin?.email}</div>
              <div className="text-xs text-slate-500">{admin?.role === 'super_admin' ? 'Super admin' : 'Admin'}</div>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white" aria-hidden>
              {initials(admin?.full_name || admin?.email || '?')}
            </span>
            <button onClick={onSignOut} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-ink" aria-label="Sign out" title="Sign out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
