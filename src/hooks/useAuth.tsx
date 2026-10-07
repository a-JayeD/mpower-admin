import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { fetchAdminProfile, signOut as svcSignOut } from '@/services/auth';
import type { Admin } from '@/types/database';

type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'not-admin'; session: Session }
  | { status: 'admin'; session: Session; admin: Admin };

interface AuthContextValue {
  state: AuthState;
  admin: Admin | null;
  isRecovery: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [isRecovery, setIsRecovery] = useState(false);

  const resolve = useCallback(async (session: Session | null) => {
    if (!session) return setState({ status: 'signed-out' });
    try {
      const admin = await fetchAdminProfile(session.user.id);
      setState(admin ? { status: 'admin', session, admin } : { status: 'not-admin', session });
    } catch {
      setState({ status: 'not-admin', session });
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) void resolve(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
      if (event === 'SIGNED_OUT') setIsRecovery(false);
      if (event === 'TOKEN_REFRESHED') return; // admin row unchanged; avoid a query
      // Defer to avoid calling Supabase inside the auth callback (prevents deadlocks).
      setTimeout(() => active && resolve(session), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [resolve]);

  const signOut = useCallback(async () => {
    await svcSignOut();
    setState({ status: 'signed-out' });
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await resolve(data.session);
  }, [resolve]);

  const value = useMemo<AuthContextValue>(
    () => ({ state, admin: state.status === 'admin' ? state.admin : null, isRecovery, signOut, refresh }),
    [state, isRecovery, signOut, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For pages behind ProtectedRoute: the admin is guaranteed to exist. */
export function useAdmin(): Admin {
  const { admin } = useAuth();
  if (!admin) throw new Error('useAdmin used outside a protected route');
  return admin;
}
