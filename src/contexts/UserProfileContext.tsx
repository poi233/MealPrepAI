"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { normalizeStringInput } from '@/lib/utils';
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
    const loadActivePlanFromLocalStorage = async () => {
      setIsLoading(true);
      try {
        // For now, just load from localStorage since we're transitioning to the normalized system
        // The normalized meal plan context will handle loading the actual active meal plan
        const storedPlanName = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
        if (storedPlanName) {
          setActivePlanNameState(normalizeStringInput(storedPlanName));
        } else {
          setActivePlanNameState(null); 
        }
      } catch (e) {
        console.error("初始活动计划加载期间发生异常:", e);
        setActivePlanNameState(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadActivePlanFromLocalStorage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const setActivePlanNameCallback = useCallback(async (planName: string | null) => {
    const normalizedPlanName = planName ? normalizeStringInput(planName) : null;
    
    setActivePlanNameState(normalizedPlanName); 
    
    try {
      // Update localStorage
      if (normalizedPlanName) {
        localStorage.setItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME, normalizedPlanName);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
      }
      
      // The normalized meal plan context will handle the database operations
    } catch (error) {
      console.error("更新活动计划名称时出错:", error);
      const errorMessage = error instanceof Error ? error.message : "发生未知错误。";
      toast({
        title: "操作错误",
        description: `更新当前计划状态失败: ${errorMessage}`,
        variant: "destructive",
      });
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
    throw new Error('useUserProfile 必须在 UserProfileProvider 中使用');
  }
  return context;
}
