
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { normalizeStringInput } from '@/lib/utils';
import { setActivePlanAction } from '@/app/actions'; // Import server action
import { useToast } from '@/hooks/use-toast';


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
  const { toast } = useToast();


  useEffect(() => {
    const storedPlanName = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
    if (storedPlanName) {
      setActivePlanNameState(normalizeStringInput(storedPlanName));
    }
    setIsLoading(false);
  }, []);

  const setActivePlanName = useCallback(async (planName: string | null) => {
    const normalizedPlanName = planName ? normalizeStringInput(planName) : null;
    
    // Optimistically update local state
    setActivePlanNameState(normalizedPlanName);
    
    setIsLoading(true);
    try {
      if (normalizedPlanName) {
        localStorage.setItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME, normalizedPlanName);
        // Persist to DB: set this plan as active
        const result = await setActivePlanAction(normalizedPlanName);
        if (result.error) {
            console.error("Failed to set active plan in DB:", result.error);
            toast({
                title: "Database Error",
                description: `Could not set '${normalizedPlanName}' as active: ${result.error}`,
                variant: "destructive",
            });
            // Potentially revert optimistic update or show error to user
        }
      } else {
        // planName is null, so clear the active plan
        localStorage.removeItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
        // Persist to DB: clear any active plan
        const result = await setActivePlanAction(""); // Pass empty string to clear active plan
        if (result.error) {
            console.error("Failed to clear active plan in DB:", result.error);
            toast({
                title: "Database Error",
                description: `Could not clear active plan: ${result.error}`,
                variant: "destructive",
            });
        }
      }
    } catch (error) {
      console.error("Error calling setActivePlanAction:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        title: "Operation Error",
        description: `Failed to update active plan status: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, toast]); // Added toast to dependencies

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

