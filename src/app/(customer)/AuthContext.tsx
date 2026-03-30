'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  authModalOpen: boolean;
  openAuthModal: (redirectTo?: string) => void;
  closeAuthModal: () => void;
  authRedirectAfter: string | null;
  clearAuthRedirect: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me');
  if (res.ok) return res.json() as Promise<AuthUser>;
  return null;
}

async function tryRefreshThenFetchMe(): Promise<AuthUser | null> {
  const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
  if (!refreshRes.ok) return null;
  return fetchMe();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRedirectAfter, setAuthRedirectAfter] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      // Try /me first; if 401 try token refresh, then /me again
      const me = await fetchMe();
      if (me) {
        setUser(me);
        return;
      }
      const meAfterRefresh = await tryRefreshThenFetchMe();
      setUser(meAfterRefresh);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      refresh,
      authModalOpen,
      openAuthModal: (redirectTo?: string) => { setAuthRedirectAfter(redirectTo ?? null); setAuthModalOpen(true); },
      closeAuthModal: () => { setAuthModalOpen(false); setAuthRedirectAfter(null); },
      authRedirectAfter,
      clearAuthRedirect: () => setAuthRedirectAfter(null),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
