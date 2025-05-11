
"use client";

import type React from 'react';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getAllSavedMealPlanNamesAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

interface PlanListContextType {
  savedPlanNames: string[];
  isLoadingPlans: boolean;
  fetchPlanNames: () => Promise<void>;
}

const PlanListContext = createContext<PlanListContextType | undefined>(undefined);

export function PlanListProvider({ children }: { children: React.ReactNode }) {
  const [savedPlanNames, setSavedPlanNames] = useState<string[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const { toast } = useToast();

  const fetchPlanNames = useCallback(async () => {
    setIsLoadingPlans(true);
    const result = await getAllSavedMealPlanNamesAction();
    if ("error" in result) {
      toast({
        title: "Error loading saved plan names",
        description: result.error,
        variant: "destructive",
      });
      setSavedPlanNames([]);
    } else {
      setSavedPlanNames(result);
    }
    setIsLoadingPlans(false);
  }, [toast]);

  // Initial fetch when the provider mounts
  useEffect(() => {
    fetchPlanNames();
  }, [fetchPlanNames]);


  return (
    <PlanListContext.Provider value={{ savedPlanNames, isLoadingPlans, fetchPlanNames }}>
      {children}
    </PlanListContext.Provider>
  );
}

export function usePlanList() {
  const context = useContext(PlanListContext);
  if (context === undefined) {
    throw new Error('usePlanList must be used within a PlanListProvider');
  }
  return context;
}
