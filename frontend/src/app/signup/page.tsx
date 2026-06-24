"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Signup is no longer available — all authentication goes through Google OAuth.
 * This page redirects to the login page.
 */
export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}
