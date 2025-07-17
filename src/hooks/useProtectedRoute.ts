'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface UseProtectedRouteOptions {
  redirectTo?: string;
  requireAuth?: boolean;
  onUnauthorized?: () => void;
}

/**
 * Hook for protecting routes that require authentication
 * Automatically redirects unauthenticated users to login page
 */
export function useProtectedRoute(options: UseProtectedRouteOptions = {}) {
  const { 
    redirectTo = '/login', 
    requireAuth = true,
    onUnauthorized 
  } = options;
  
  const { isAuthenticated, isLoading, user, sessionError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Wait for auth state to load

    if (requireAuth && !isAuthenticated) {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        // Save current path for redirect after login
        const currentPath = window.location.pathname + window.location.search;
        const loginUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`;
        router.push(loginUrl);
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, redirectTo, router, onUnauthorized]);

  return {
    isAuthenticated,
    isLoading,
    user,
    sessionError,
    isProtected: requireAuth,
    canAccess: !requireAuth || isAuthenticated
  };
}

/**
 * Hook for routes that should redirect authenticated users away (like login/register)
 */
export function useGuestRoute(redirectTo: string = '/') {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      // Check for redirect parameter
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      
      if (redirect && redirect.startsWith('/')) {
        router.push(redirect);
      } else {
        router.push(redirectTo);
      }
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  return {
    isAuthenticated,
    isLoading,
    shouldRedirect: isAuthenticated
  };
}