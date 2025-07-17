'use client';

import { ReactNode } from 'react';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { SessionTimeoutWarning } from './SessionTimeoutWarning';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  showSessionWarning?: boolean;
  sessionTimeoutMinutes?: number;
}

export function ProtectedRoute({ 
  children, 
  fallback,
  redirectTo = '/login',
  showSessionWarning = true,
  sessionTimeoutMinutes = 30
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthGuard(redirectTo);

  if (isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You need to be logged in to access this page.</p>
          <a 
            href={redirectTo} 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {showSessionWarning && (
        <SessionTimeoutWarning timeoutMinutes={sessionTimeoutMinutes} />
      )}
    </>
  );
}