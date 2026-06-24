"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { AlertCircle, Shield, Mail, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState('');

  // Pick up error from Google OAuth redirect
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(errorParam);
    }
  }, [searchParams]);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Welcome to SeeVee</CardTitle>
          <CardDescription>
            Sign in with your Google account to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <GoogleSignInButton label="Continue with Google" />

          <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              By signing in, you&apos;ll be granting access to:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-blue-400" />
                <span>Read your emails</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-green-400" />
                <span>Send emails on your behalf</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4 text-amber-400" />
                <span>Manage email drafts</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground/70 pt-1">
              Your credentials are encrypted and never shared with third parties.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
