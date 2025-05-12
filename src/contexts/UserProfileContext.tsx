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
          const storedPlanName = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
          if (storedPlanName) {
            setActivePlanNameState(normalizeStringInput(storedPlanName));
            if (!activePlanResult || ("error" in activePlanResult) || !activePlanResult.planName) {
                setActivePlanNameState(null);
                localStorage.removeItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
            }
          } else {
            setActivePlanNameState(null); 
          }
           if (activePlanResult && "error" in activePlanResult) {
            console.warn("从数据库加载初始活动计划时出错:", activePlanResult.error);
          }
        }
      } catch (e) {
        console.error("初始活动计划加载期间发生异常:", e);
        const storedPlanName = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
        setActivePlanNameState(storedPlanName ? normalizeStringInput(storedPlanName) : null);
         toast({
            title: "加载错误",
            description: "无法从数据库验证当前计划。正在显示本地状态。",
            variant: "destructive",
          });
      } finally {
        setIsLoading(false);
      }
    };

    loadActivePlanFromDbOrLocalStorage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const setActivePlanNameCallback = useCallback(async (planName: string | null) => {
    const normalizedPlanName = planName ? normalizeStringInput(planName) : null;
    
    setActivePlanNameState(normalizedPlanName); 
    
    setIsLoading(true);
    try {
      const actionPlanName = normalizedPlanName || ""; 
      const result = await setActivePlanAction(actionPlanName);

      if (result.success) {
        if (normalizedPlanName) {
          localStorage.setItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME, normalizedPlanName);
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
        }
      } else {
        console.error("在数据库中设置活动计划失败:", result.error);
        toast({
            title: "数据库同步错误",
            description: `无法更新当前计划状态: ${result.error || "未知错误"}`,
            variant: "destructive",
        });
        const previousPlanName = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_PLAN_NAME);
        setActivePlanNameState(previousPlanName ? normalizeStringInput(previousPlanName) : null);
      }
    } catch (error) {
      console.error("调用 setActivePlanAction 时出错:", error);
      const errorMessage = error instanceof Error ? error.message : "发生未知错误。";
      toast({
        title: "操作错误",
        description: `更新当前计划状态失败: ${errorMessage}`,
        variant: "destructive",
      });
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
    throw new Error('useUserProfile 必须在 UserProfileProvider 中使用');
  }
  return context;
}
