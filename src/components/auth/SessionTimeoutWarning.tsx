'use client';

import { useEffect, useState } from 'react';
import { useSessionTimeout } from '@/hooks/useSession';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SessionTimeoutWarningProps {
  timeoutMinutes?: number;
}

export function SessionTimeoutWarning({ timeoutMinutes = 30 }: SessionTimeoutWarningProps) {
  const { showTimeoutWarning, timeLeft, dismissWarning } = useSessionTimeout(timeoutMinutes);
  const { refreshUser, logout } = useAuth();
  const [isExtending, setIsExtending] = useState(false);

  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      await refreshUser();
      dismissWarning();
    } catch (error) {
      console.error('Failed to extend session:', error);
      await logout();
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <AlertDialog open={showTimeoutWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in {formatTime(timeLeft)}. 
            Would you like to extend your session or log out?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLogout}>
            Log Out
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleExtendSession}
            disabled={isExtending}
          >
            {isExtending ? 'Extending...' : 'Stay Logged In'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}