"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { normalizeStringInput } from '@/lib/utils'; // Renamed for clarity
import { setActivePlanAction } from '@/app/actions'; // Import server action

interface UserProfileContextType {
  activePlanName: string | null;
  setActivePlanName: (planName: string | null) => void;
  isLoading: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME = 'mealPrepAI_activePlanName';

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [activePlanName, setActivePlanNameState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true until loaded from localStorage

  useEffect(() => {
    const storedPlanName = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
    if (storedPlanName) {
      setActivePlanNameState(normalizeStringInput(storedPlanName));
    }
    setIsLoading(false);
  }, []);

  const setActivePlanName = useCallback(async (planName: string | null) => {
    const normalizedPlanName = planName ? normalizeStringInput(planName) : null;
    
    // Optimistically update local state and localStorage
    setActivePlanNameState(normalizedPlanName);
    if (normalizedPlanName) {
      localStorage.setItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME, normalizedPlanName);
      // Persist to DB
      try {
        setIsLoading(true);
        const result = await setActivePlanAction(normalizedPlanName);
        if (result.error) {
            console.error("Failed to set active plan in DB:", result.error);
            // Potentially revert optimistic update or show error to user
            // For now, console log is sufficient based on current error handling
        }
      } catch (error) {
        console.error("Error calling setActivePlanAction:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
      // Optionally, could have a DB action to "clear" active plan if needed,
      // but usually setting another active implicitly deactivates others.
      // If no plan is active, then nothing needs to be sent to DB for "clearing".
    }
  }, []);

  return (
    <UserProfileContext.Provider value={{ activePlanName, setActivePlanName, isLoading }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}
