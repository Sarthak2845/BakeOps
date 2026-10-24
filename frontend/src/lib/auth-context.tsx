import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useToast } from '@/components/ui/toast';

import { authApi, setAuthToken, setUnauthorizedHandler } from './api';
import { queryClient } from './query-client';
import { clearStoredSession, getStoredSession, setStoredSession } from './storage';
import type { AuthUser, Business } from './types';

interface AuthContextValue {
  isLoading: boolean;
  token: string | null;
  user: AuthUser | null;
  business: Business | null;
  needsSetup: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    businessName: string;
    category?: string;
    ownerName: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setBusiness: (business: Business) => void;
  completeSetup: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [business, setBusinessState] = useState<Business | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getStoredSession();
      if (session) {
        setAuthToken(session.token);
        setToken(session.token);
        setUser(session.user);
        setBusinessState(session.business);
      }
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setAuthToken(res.token);
    await setStoredSession(res);
    setToken(res.token);
    setUser(res.user);
    setBusinessState(res.business);
  }, []);

  const register = useCallback(
    async (input: {
      businessName: string;
      category?: string;
      ownerName: string;
      email: string;
      password: string;
      phone?: string;
    }) => {
      const res = await authApi.register(input);
      setAuthToken(res.token);
      await setStoredSession(res);
      setToken(res.token);
      setUser(res.user);
      setBusinessState(res.business);
      setNeedsSetup(true);
    },
    []
  );

  const logout = useCallback(async () => {
    setAuthToken(null);
    await clearStoredSession();
    setToken(null);
    setUser(null);
    setBusinessState(null);
    setNeedsSetup(false);
    queryClient.clear();
  }, []);

  // A 401 on an authenticated request means the token expired or was revoked;
  // sign out so the user lands on the login screen instead of a broken app.
  const toast = useToast();
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout();
      toast.error('Please log in again to continue.', 'Session expired');
    });
    return () => setUnauthorizedHandler(null);
  }, [logout, toast]);

  const completeSetup = useCallback(() => setNeedsSetup(false), []);

  const setBusiness = useCallback(
    (next: Business) => {
      setBusinessState(next);
      if (token && user) {
        void setStoredSession({ token, user, business: next });
      }
    },
    [token, user]
  );

  const value = useMemo(
    () => ({ isLoading, token, user, business, needsSetup, login, register, logout, setBusiness, completeSetup }),
    [isLoading, token, user, business, needsSetup, login, register, logout, setBusiness, completeSetup]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
