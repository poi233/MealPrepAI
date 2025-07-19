'use client';

import { ReactNode } from 'react';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Lock } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  showError?: boolean;
}

/**
 * Component that protects its children behind authentication
 * Shows loading state while checking auth, and error states for unauthenticated users
 */
export function AuthGuard({ 
  children, 
  fallback,
  requireAuth = true,
  redirectTo = '/auth/login',
  showError = true
}: AuthGuardProps) {
  const { clearSessionError } = useAuth();
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    sessionError, 
    canAccess 
  } = useProtectedRoute({ 
    requireAuth, 
    redirectTo 
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show session error if present
  if (sessionError && showError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="mt-2">
              {sessionError}
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex gap-2">
            <Button 
              onClick={() => window.location.href = '/auth/login'}
              className="flex-1"
            >
              Sign In Again
            </Button>
            <Button 
              variant="outline" 
              onClick={clearSessionError}
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show fallback or default unauthorized message
  if (!canAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <Lock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-6">
              You need to be logged in to access this page.
            </p>
            <Button 
              onClick={() => window.location.href = redirectTo}
              className="w-full"
            >
              Sign In
            </Button>
          </div>
        </div>
      );
    }

    return null;
  }

  // User is authenticated, render children
  return <>{children}</>;
}

/**
 * Higher-order component version of AuthGuard
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<AuthGuardProps, 'children'>
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}