import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { tokenStore } from '@/lib/api';
import { mockLogin, mockMe } from '@/lib/mockAuth';
import type { Role, User } from '@/types';

const USER_KEY = 'oaa.user';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (loginId: string, password: string, role: Role) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Where a role lands after logging in, and what its ProtectedRoute falls back to. */
export const HOME_BY_ROLE: Record<Role, string> = {
  student: '/student',
  teacher: '/teacher',
  admin: '/admin',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Restore the session on refresh.
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setStatus('anonymous');
      return;
    }

    let cancelled = false;

    // SWAP FOR THE REAL API (Step 2): api.get<{ data: User }>('/api/auth/me')
    mockMe(token)
      .then((restored) => {
        if (cancelled) return;
        setUser(restored);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        tokenStore.clear();
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setStatus('anonymous');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (loginId: string, password: string, role: Role) => {
    // SWAP FOR THE REAL API (Step 2):
    // api.post<{ data: AuthSession }>('/api/auth/login', { userId, password, role },
    //   { skipAuthRedirect: true })
    const session = await mockLogin(loginId, password, role);

    tokenStore.set(session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    setUser(session.user);
    setStatus('authenticated');

    return session.user;
  }, []);

  const logout = useCallback(() => {
    // Step 2 adds: api.post('/api/auth/logout', {}) — fire and forget.
    tokenStore.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
