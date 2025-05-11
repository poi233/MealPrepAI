"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { normalizeStringInput } from '@/lib/utils';
import { setActivePlanAction, getActiveMealPlanAction } from '@/app/actions'; 
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
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const { toast } = useToast();


  useEffect(() => {
    const loadActivePlanFromDbOrLocalStorage = async () => {
      setIsLoading(true);
      try {
        const activePlanResult = await getActiveMealPlanAction();

        if (activePlanResult && !("error" in activePlanResult) && activePlanResult.planName) {
          const normalizedDbPlanName = normalizeStringInput(activePlanResult.planName);
          setActivePlanNameState(normalizedDbPlanName);
          localStorage.setItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME, normalizedDbPlanName);
        } else {
          // No active plan in DB or error fetching it, try localStorage as a fallback
          // This case also handles if getActiveMealPlanAction returned an error object
          const storedPlanName = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
          if (storedPlanName) {
            setActivePlanNameState(normalizeStringInput(storedPlanName));
            // Optionally, attempt to re-validate this localStorage plan with the DB here or assume it's stale if DB had no active.
            // For now, if DB has no active plan, we clear localStorage too.
            if (!activePlanResult || ("error" in activePlanResult) || !activePlanResult.planName) {
                setActivePlanNameState(null);
                localStorage.removeItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
            }
          } else {
            setActivePlanNameState(null); // No active plan in DB and none in localStorage
          }
           if (activePlanResult && "error" in activePlanResult) {
            console.warn("Error fetching active plan from DB on initial load:", activePlanResult.error);
            // Don't toast here, UI will show "no plan"
          }
        }
      } catch (e) {
        console.error("Exception during initial active plan load:", e);
        // Fallback to localStorage or null if DB call itself fails
        const storedPlanName = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
        setActivePlanNameState(storedPlanName ? normalizeStringInput(storedPlanName) : null);
         toast({
            title: "Loading Error",
            description: "Could not verify active plan with the database. Displaying local status.",
            variant: "destructive",
          });
      } finally {
        setIsLoading(false);
      }
    };

    loadActivePlanFromDbOrLocalStorage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Toast not needed in deps array for this initial load effect

  const setActivePlanNameCallback = useCallback(async (planName: string | null) => {
    const normalizedPlanName = planName ? normalizeStringInput(planName) : null;
    
    setActivePlanNameState(normalizedPlanName); // Optimistic update of local state
    
    setIsLoading(true);
    try {
      const actionPlanName = normalizedPlanName || ""; // API expects "" to clear active plan
      const result = await setActivePlanAction(actionPlanName);

      if (result.success) {
        if (normalizedPlanName) {
          localStorage.setItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME, normalizedPlanName);
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
        }
      } else {
        console.error("Failed to set active plan in DB:", result.error);
        toast({
            title: "Database Sync Error",
            description: `Could not update active plan status: ${result.error || "Unknown error"}`,
            variant: "destructive",
        });
        // Revert optimistic update if DB operation failed
        // This requires knowing the *previous* active plan name, or re-fetching.
        // For simplicity now, we keep the optimistic update but show an error.
        // A more robust solution might involve re-fetching the true active plan from DB.
        const previousPlanName = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
        setActivePlanNameState(previousPlanName ? normalizeStringInput(previousPlanName) : null);
      }
    } catch (error) {
      console.error("Error calling setActivePlanAction:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        title: "Operation Error",
        description: `Failed to update active plan status: ${errorMessage}`,
        variant: "destructive",
      });
      // Revert optimistic update
      const previousPlanName = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
      setActivePlanNameState(previousPlanName ? normalizeStringInput(previousPlanName) : null);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return (
    <UserProfileContext.Provider value={{ activePlanName, setActivePlanName: setActivePlanNameCallback, isLoading }}>
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