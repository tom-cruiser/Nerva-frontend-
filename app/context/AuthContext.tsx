"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Tier = 'starter' | 'premium' | 'business' | 'business_premium';
export type Role = 'superadmin' | 'admin' | 'cashier';

export interface AuthSession {
  organization_id: string | null;
  tier: Tier;
  role: Role;
  user_id?: string | null;
}

type AuthContextShape = {
  session: AuthSession | null;
  setSession: (s: AuthSession | null) => void;
};

const defaultShape: AuthContextShape = {
  session: null,
  setSession: () => {},
};

const AuthContext = createContext<AuthContextShape>(defaultShape);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);

  // Placeholder: hydrate from window.__NERVA_SESSION__ if present
  useEffect(() => {
    try {
      const raw = (globalThis as any).__NERVA_SESSION__;
      if (raw) setSession(raw as AuthSession);
    } catch (e) {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ session, setSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
