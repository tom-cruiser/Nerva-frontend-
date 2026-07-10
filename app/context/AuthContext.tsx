'use client';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth as authApi } from '../../lib/endpoints';
import { tokenStore } from '../../lib/token-store';
import type { AuthUser, Permission, UserRole } from '../../lib/types';

interface AuthContextShape {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  tenantId: string | null;
  login: (tenantId: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (perm: Permission) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextShape>({
  user: null,
  status: 'loading',
  tenantId: null,
  login: async () => {},
  logout: async () => {},
  hasPermission: () => false,
  hasRole: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextShape['status']>('loading');
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Rehydrate the session from localStorage on mount.
  useEffect(() => {
    const stored = tokenStore.getUser();
    setTenantId(tokenStore.tenantId);
    if (stored && tokenStore.accessToken) {
      setUser(stored);
      setStatus('authenticated');
    } else {
      setStatus('anonymous');
    }
  }, []);

  const login = useCallback(async (tid: string, email: string, password: string) => {
    const res = await authApi.login(tid, email, password);
    tokenStore.save({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      user: res.user,
    });
    setUser(res.user);
    setTenantId(res.user.tenantId);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // best-effort; clear locally regardless
    }
    tokenStore.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const hasPermission = useCallback(
    (perm: Permission) => !!user?.permissions.includes(perm),
    [user],
  );

  const hasRole = useCallback(
    (...roles: UserRole[]) => !!user && roles.includes(user.role),
    [user],
  );

  return (
    <AuthContext.Provider
      value={{ user, status, tenantId, login, logout, hasPermission, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
