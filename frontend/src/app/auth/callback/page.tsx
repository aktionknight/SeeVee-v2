"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      // Redirect to login with error message
      router.push(`/login?error=${encodeURIComponent(errorParam)}`);
      return;
    }

    if (!token) {
      router.push('/login?error=No authentication token received');
      return;
    }

    // Store the token and fetch user data
    localStorage.setItem('access_token', token);

    api.getMe()
      .then((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        // Force a full page navigation so AuthContext picks up the new token
        window.location.href = '/dashboard';
      })
      .catch(() => {
        localStorage.removeItem('access_token');
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
