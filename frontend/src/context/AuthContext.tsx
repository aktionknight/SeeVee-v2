"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  auth_provider: string;
  avatar_url: string | null;
  gmail_connected: boolean;
  created_at: string;
  updated_at: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ['/', '/login', '/auth/callback'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check for existing session ONCE on mount (cookie-based — no localStorage token)
  useEffect(() => {
    // Skip auto-check on the callback page — it handles its own auth flow
    if (pathname === '/auth/callback') {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const checkSession = async (retriesLeft: number = 1) => {
      try {
        const userData = await api.getMe();
        if (!cancelled) setUser(userData);
      } catch {
        // Retry once after a short delay — backend might be busy processing
        if (retriesLeft > 0) {
          await new Promise((r) => setTimeout(r, 1500));
          if (!cancelled) return checkSession(retriesLeft - 1);
        }
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    checkSession();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount-only — don't re-check on every navigation

  // Redirect logic — protect private routes
  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (!user && !isPublicRoute) {
      router.push('/login');
    }
  }, [user, isLoading, pathname, router]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore errors — still clear local state
    }
    setUser(null);
    router.push('/login');
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
