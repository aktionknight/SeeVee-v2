"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';

/**
 * OAuth callback page.
 * 
 * The backend sets an HttpOnly cookie with the JWT before redirecting here.
 * This page simply verifies the cookie works by calling /auth/me,
 * then redirects to the dashboard.
 */
import { Suspense } from 'react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const errorParam = searchParams.get('error');

    if (errorParam) {
      router.push(`/login?error=${encodeURIComponent(errorParam)}`);
      return;
    }

    // Cookie was set by the backend redirect — verify it works
    api.getMe()
      .then(() => {
        // Force full page navigation so AuthContext picks up the session
        window.location.href = '/dashboard';
      })
      .catch(() => {
        setError('Failed to verify authentication. Please try again.');
        setTimeout(() => router.push('/login'), 2000);
      });
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="flex flex-col items-center gap-4">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Completing sign in...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">Loading...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
