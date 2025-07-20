'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DjangoAuthService } from '@/lib/django-auth';

interface SessionInfo {
  isActive: boolean;
  timeRemaining?: number;
  lastActivity?: Date;
}

/**
 * Hook for managing user session information
 */
export function useSession() {
  const { user, isAuthenticated, logout } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    isActive: false
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      setSessionInfo({
        isActive: true,
        lastActivity: new Date()
      });

      // Update last activity on user interaction
      const updateActivity = () => {
        setSessionInfo(prev => ({
          ...prev,
          lastActivity: new Date()
        }));
      };

      // Listen for user activity
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      events.forEach(event => {
        document.addEventListener(event, updateActivity, true);
      });

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, updateActivity, true);
        });
      };
    } else {
      setSessionInfo({ isActive: false });
    }
  }, [isAuthenticated, user]);

  const extendSession = async () => {
    if (isAuthenticated) {
      // Refresh user data to extend session
      try {
        await DjangoAuthService.getCurrentUser();
        // If successful, session is still valid
        setSessionInfo(prev => ({
          ...prev,
          lastActivity: new Date()
        }));
      } catch (error) {
        console.error('Error extending session:', error);
        // If refresh fails, logout user
        await logout();
      }
    }
  };

  const endSession = async () => {
    await logout();
  };

  return {
    sessionInfo,
    extendSession,
    endSession,
    isSessionActive: sessionInfo.isActive
  };
}

/**
 * Hook for automatic session timeout handling
 */
export function useSessionTimeout(timeoutMinutes: number = 30) {
  const { sessionInfo, endSession } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!sessionInfo.isActive || !sessionInfo.lastActivity) return;

    const checkTimeout = () => {
      const now = new Date();
      const lastActivity = sessionInfo.lastActivity!;
      const timeSinceActivity = now.getTime() - lastActivity.getTime();
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const warningMs = 5 * 60 * 1000; // Show warning 5 minutes before timeout

      if (timeSinceActivity >= timeoutMs) {
        // Session expired
        endSession();
      } else if (timeSinceActivity >= timeoutMs - warningMs) {
        // Show warning
        const remaining = Math.ceil((timeoutMs - timeSinceActivity) / 1000);
        setTimeLeft(remaining);
        setShowWarning(true);
      } else {
        setShowWarning(false);
        setTimeLeft(0);
      }
    };

    const interval = setInterval(checkTimeout, 1000);
    return () => clearInterval(interval);
  }, [sessionInfo, timeoutMinutes, endSession]);

  const dismissWarning = () => {
    setShowWarning(false);
    setTimeLeft(0);
  };

  return {
    showTimeoutWarning: showWarning,
    timeLeft,
    dismissWarning
  };
}