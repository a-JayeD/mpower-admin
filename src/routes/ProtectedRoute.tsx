import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { AuthShell } from '@/pages/auth/AuthShell';
import { paths } from './paths';

/**
 * UX guard only. The real protection is Row Level Security: even if this
 * component were bypassed, the database returns nothing to non-admins.
 */
export function ProtectedRoute() {
  const { state, signOut } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') return <div className="min-h-screen bg-canvas"><Spinner label="Checking your session" /></div>;
  if (state.status === 'signed-out') return <Navigate to={paths.login} replace state={{ from: location.pathname }} />;
  if (state.status === 'not-admin') {
    return (
      <AuthShell title="No admin access" subtitle={`${state.session.user.email} is signed in but is not an active administrator.`}>
        <div className="flex items-start gap-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Ask the owner to grant access from Settings → Administrators, then sign in again.
        </div>
        <Button className="mt-5 w-full" onClick={signOut}>Sign out</Button>
      </AuthShell>
    );
  }
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { state } = useAuth();
  const location = useLocation();
  if (state.status === 'loading') return <div className="min-h-screen bg-ink" />;
  if (state.status === 'not-admin') return <Navigate to={paths.dashboard} replace />;
  if (state.status === 'admin') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== paths.login ? from : paths.dashboard} replace />;
  }
  return <Outlet />;
}
