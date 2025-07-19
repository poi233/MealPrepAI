
"use client";

import type React from 'react';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
    try {
      // For now, we'll return an empty array since we're transitioning to the normalized system
      // The normalized meal plan context will handle loading meal plans
      setSavedPlanNames([]);
      
      // TODO: Implement fetching meal plan names from the normalized system
      // This would involve calling getMealPlansForUser from the normalized meal plan context
    } catch (error) {
      console.error("Error fetching plan names:", error);
      toast({
        title: "加载已保存计划列表错误",
        description: "无法加载计划列表，请稍后再试。",
        variant: "destructive",
      });
      setSavedPlanNames([]);
    } finally {
      setIsLoadingPlans(false);
    }
  }, [toast]);

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
    throw new Error('usePlanList 必须在 PlanListProvider 中使用');
  }
  return context;
}

