import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { api, tokenStore } from '@/lib/api';
import type { AuthSession, Role, User } from '@/types';

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

  // Restore the session on refresh. The cached user only paints the first frame —
  // the server's answer is authoritative and overwrites it.
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setStatus('anonymous');
      return;
    }

    let cancelled = false;

    api
      .get<{ data: User }>('/api/auth/me')
      .then(({ data }) => {
        if (cancelled) return;
        localStorage.setItem(USER_KEY, JSON.stringify(data));
        setUser(data);
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
    // skipAuthRedirect: a 401 here means "wrong password", not "session expired" —
    // without it the login page would redirect to itself.
    const { data } = await api.post<{ data: AuthSession }>(
      '/api/auth/login',
      { loginId, password, role },
      { skipAuthRedirect: true },
    );

    tokenStore.set(data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    setStatus('authenticated');

    return data.user;
  }, []);

  const logout = useCallback(() => {
    // Tokens are stateless — dropping it client-side is the whole logout.
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
