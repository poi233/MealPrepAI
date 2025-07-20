'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { DjangoAuthService } from '@/lib/django-auth';
import type { User as DjangoUser } from '@/lib/django-auth';
import type { User } from '@/types/database.types';
import { createErrorResponse } from '@/lib/error-utils';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionError: string | null;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: ProfileUpdates) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  clearSessionError: () => void;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  dietaryPreferences?: {
    dietType?: 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'mediterranean';
    allergies?: string[];
    dislikes?: string[];
    calorieTarget?: number;
  };
}

interface ProfileUpdates {
  displayName?: string;
  dietaryPreferences?: {
    dietType?: 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'mediterranean';
    allergies?: string[];
    dislikes?: string[];
    calorieTarget?: number;
  };
  email?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to convert Django user to database user format
function convertDjangoUserToUser(djangoUser: DjangoUser): User {
  return {
    id: djangoUser.id,
    username: djangoUser.username || djangoUser.email,
    email: djangoUser.email,
    displayName: djangoUser.first_name,
    dietaryPreferences: {
      allergies: djangoUser.allergies || [],
      dietType: djangoUser.dietary_preferences?.[0] || undefined,
      dislikes: [],
      calorieTarget: undefined
    },
    createdAt: djangoUser.date_joined ? new Date(djangoUser.date_joined) : new Date(),
    updatedAt: djangoUser.last_login ? new Date(djangoUser.last_login) : new Date()
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Fetch current user on mount and check for session errors
  useEffect(() => {
    fetchCurrentUser();

    // Check for session error in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error === 'session-error') {
      setSessionError('Your session has expired. Please log in again.');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      if (!DjangoAuthService.isAuthenticated()) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const djangoUser = await DjangoAuthService.getCurrentUser();
      setUser(convertDjangoUserToUser(djangoUser));
    } catch (error) {
      console.error('Error fetching current user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (usernameOrEmail: string, password: string) => {
    try {
      const response = await DjangoAuthService.login({
        email: usernameOrEmail,
        password
      });

      setUser(convertDjangoUserToUser(response.user));
      return { success: true };
    } catch (error) {
      return createErrorResponse(error, 'Login failed');
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await DjangoAuthService.register({
        email: userData.email,
        password: userData.password,
        password_confirm: userData.password,
        username: userData.username,
        first_name: userData.displayName
      });

      setUser(convertDjangoUserToUser(response.user));
      return { success: true };
    } catch (error) {
      return createErrorResponse(error, 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await DjangoAuthService.logout();
      setUser(null);
      // Redirect to login page
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user state even if API call fails
      setUser(null);
      window.location.href = '/auth/login';
    }
  };

  const updateProfile = async (updates: ProfileUpdates) => {
    try {
      await DjangoAuthService.updateProfile({
        first_name: updates.displayName,
        dietary_preferences: updates.dietaryPreferences?.allergies || []
      });

      // Refresh user data after successful update
      await fetchCurrentUser();
      return { success: true };
    } catch (error) {
      return createErrorResponse(error, 'Profile update failed');
    }
  };

  const refreshUser = useCallback(async () => {
    await fetchCurrentUser();
  }, []);

  const clearSessionError = useCallback(() => {
    setSessionError(null);
  }, []);

  // Auto-refresh user data periodically to keep session fresh
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchCurrentUser();
    }, 15 * 60 * 1000); // Refresh every 15 minutes

    return () => clearInterval(interval);
  }, [user]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    sessionError,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
    clearSessionError,
  };

  return (
    <AuthContext.Provider value={value}>
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

// Higher-order component for protecting routes (deprecated - use AuthGuard instead)
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading, sessionError, clearSessionError } = useAuth();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (sessionError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Error</h1>
            <p className="text-gray-600 mb-4">{sessionError}</p>
            <div className="flex gap-2 justify-center">
              <a
                href="/auth/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
              >
                Sign In Again
              </a>
              <button
                onClick={clearSessionError}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">You need to be logged in to access this page.</p>
            <a
              href="/auth/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
            >
              Sign In
            </a>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}