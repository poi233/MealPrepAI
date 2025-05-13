
"use client";

import { useState, useEffect, useCallback } from "react";
import { useMealPlan, type MealPlanData } from "@/contexts/MealPlanContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import DailyMealCard from "./DailyMealCard";
import AddRecipeDialog from "./AddRecipeDialog";
import MealPlanAnalysis from "./MealPlanAnalysis"; // Import the new component
import { Button } from "@/components/ui/button";
import { AlertCircle, Trash2, Utensils } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  deleteMealPlanByNameAction, 
  saveMealPlanToDb, 
  getSavedMealPlanByNameAction
} from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import type { DailyMealPlan, Meal, GenerateWeeklyMealPlanOutput } from "@/ai/flows/generate-weekly-meal-plan";
import { usePlanList } from '@/contexts/PlanListContext'; 

type MealTypeKey = keyof Pick<DailyMealPlan, 'breakfast' | 'lunch' | 'dinner'>;

export default function GeneratedMealPlan() {
  const { mealPlan, isLoading: isMealPlanContextLoading, error: mealPlanError, setMealPlan, setError, setIsLoading: setMealPlanLoading } = useMealPlan();
  const { activePlanName, setActivePlanName, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();
  const { fetchPlanNames: refreshPlanListSelector } = usePlanList(); 

  const [isAddRecipeDialogOpen, setIsAddRecipeDialogOpen] = useState(false);
  const [addRecipeTarget, setAddRecipeTarget] = useState<{ day: string; mealTypeKey: MealTypeKey; mealTypeTitle: string } | null>(null);
  
  const isLoading = isMealPlanContextLoading || isProfileLoading;

  const loadPlan = useCallback(async (planNameToLoad: string | null) => {
    setMealPlanLoading(true);
    setError(null); 
    let planDataToSet: MealPlanData | null = null;

    if (planNameToLoad) { 
      const result = await getSavedMealPlanByNameAction(planNameToLoad);
      if (result && !("error" in result)) { 
        if (result && result.mealPlanData) { 
            planDataToSet = { weeklyMealPlan: result.mealPlanData.weeklyMealPlan, planDescription: result.planDescription };
        } else { 
            console.warn(`计划 "${planNameToLoad}" 已找到但数据丢失或格式错误。`);
            planDataToSet = null; 
        }
      } else { 
        if (result && "error" in result) {
          console.warn(`无法检索计划 "${planNameToLoad}" 进行显示: ${result.error}。`);
        }
        // Ensure UI shows "no plan" state rather than an error for "not found"
        // setError(null); // Keep error null if plan just not found
        planDataToSet = null; 
      }
    } else { 
      planDataToSet = null; 
    }
    
    setMealPlan(planDataToSet);
    setMealPlanLoading(false);
  }, [setMealPlan, setError, setMealPlanLoading]);


  useEffect(() => {
    if (!isProfileLoading) { 
        loadPlan(activePlanName);
    }
  }, [activePlanName, isProfileLoading, loadPlan]);

  const saveCurrentPlanToDb = async (updatedMealPlanData: GenerateWeeklyMealPlanOutput) => {
    if (!mealPlan || !activePlanName || mealPlan.planDescription === undefined) {
        toast({
            title: "无法保存计划",
            description: "当前计划名称或描述缺失。无法保存更改。",
            variant: "destructive",
        });
        return;
    }

    try {
      await saveMealPlanToDb(activePlanName, mealPlan.planDescription, updatedMealPlanData);
      toast({
        title: "计划已更新",
        description: "您的膳食计划更改已保存到数据库。",
      });
    } catch (dbError: any) {
      console.error("保存膳食计划到数据库失败:", dbError); 
      toast({
        title: "数据库错误",
        description: dbError.message || "无法将更改保存到数据库。",
        variant: "destructive",
      });
    }
  };

  const handleClearPlan = async () => {
    if (!activePlanName) {
        toast({ title: "无活动计划", description: "没有活动的计划可以移除。", variant: "default"});
        return;
    }
    setMealPlanLoading(true);
    setError(null);
    
    const planNameToDelete = activePlanName; 

    try {
      const result = await deleteMealPlanByNameAction(planNameToDelete);
      if (result.success) {
        toast({
          title: "计划已移除",
          description: `膳食计划 "${planNameToDelete}" 已被移除。`,
        });
        setMealPlan(null); 
        setActivePlanName(null); // This will trigger useEffect in UserProfileContext to update DB and localStorage
        await refreshPlanListSelector(); 
      } else {
        setError(result.error || "从数据库移除计划失败。");
        toast({
          title: "移除计划错误",
          description: result.error || "无法从数据库中移除该计划。",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || "移除计划时发生意外错误。";
      setError(errorMessage);
      toast({
        title: "移除时出错",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
        setMealPlanLoading(false);
    }
  };

  const handleDeleteMeal = (day: string, mealTypeKey: MealTypeKey, recipeIndex: number) => {
    if (!mealPlan || !mealPlan.weeklyMealPlan) return;

    const updatedWeeklyMealPlan = mealPlan.weeklyMealPlan.map(daily => {
      if (daily.day === day) {
        const updatedMeals = [...(daily[mealTypeKey] || [])]; 
        if (recipeIndex >= 0 && recipeIndex < updatedMeals.length) {
          updatedMeals.splice(recipeIndex, 1); 
        }
        return { ...daily, [mealTypeKey]: updatedMeals };
      }
      return daily;
    });
    
    const newMealPlanState: MealPlanData = { ...mealPlan, weeklyMealPlan: updatedWeeklyMealPlan };
    setMealPlan(newMealPlanState);
    
    const mealTypeTranslations: {[key: string]: string} = {
        'breakfast': '早餐',
        'lunch': '午餐',
        'dinner': '晚餐'
    };
    const translatedMealType = mealTypeTranslations[mealTypeKey] || mealTypeKey;

    toast({
      title: "食谱已删除",
      description: `${day} ${translatedMealType} 的一个食谱已在本地移除。正在保存...`,
    });
    saveCurrentPlanToDb({ weeklyMealPlan: updatedWeeklyMealPlan });
  };

  const handleAddMealClick = (day: string, mealTypeKey: MealTypeKey, mealTypeTitle: string) => {
    if (!mealPlan || mealPlan.planDescription === undefined) {
      toast({
        title: "无法添加食谱",
        description: "缺少计划描述。AI推荐功能可能无法正常工作。",
        variant: "warning",
      });
    }
    setAddRecipeTarget({ day, mealTypeKey, mealTypeTitle });
    setIsAddRecipeDialogOpen(true);
  };

  const handleAddNewRecipeSubmit = (newRecipe: Meal) => {
    if (!mealPlan || !mealPlan.weeklyMealPlan || !addRecipeTarget) return;

    const { day, mealTypeKey } = addRecipeTarget;

    const updatedWeeklyMealPlan = mealPlan.weeklyMealPlan.map(daily => {
      if (daily.day === day) {
        const currentMeals = daily[mealTypeKey] || []; 
        const updatedMeals = [...currentMeals, newRecipe];
        return { ...daily, [mealTypeKey]: updatedMeals };
      }
      return daily;
    });

    const newMealPlanState: MealPlanData = { ...mealPlan, weeklyMealPlan: updatedWeeklyMealPlan };
    setMealPlan(newMealPlanState);

    const mealTypeTranslations: {[key: string]: string} = {
        'breakfast': '早餐',
        'lunch': '午餐',
        'dinner': '晚餐'
    };
    const translatedMealType = mealTypeTranslations[mealTypeKey] || mealTypeKey;

    toast({
      title: "食谱已添加",
      description: `${newRecipe.recipeName} 已为 ${day} ${translatedMealType} 在本地添加。正在保存...`,
    });
    saveCurrentPlanToDb({ weeklyMealPlan: updatedWeeklyMealPlan });
    setIsAddRecipeDialogOpen(false);
    setAddRecipeTarget(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 mt-6">
        <h2 className="text-xl font-semibold text-center text-primary mb-3">
          正在加载您的膳食计划...
        </h2>
        {[...Array(2)].map((_, i) => ( 
          <div key={i} className="bg-card p-3 rounded-lg shadow-md space-y-2.5">
            <Skeleton className="h-5 w-1/3 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="space-y-1.5 p-1.5 border rounded min-h-[80px]">
                  <Skeleton className="h-4 w-2/3 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-3/4 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // This error condition is now less likely to be hit if loadPlan sets error to null for "not found"
  if (mealPlanError && (!mealPlan || !mealPlan.weeklyMealPlan || mealPlan.weeklyMealPlan.length === 0)) {
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>加载计划出错</AlertTitle>
        <AlertDescription>{mealPlanError}</AlertDescription>
        <Button onClick={() => {
          setError(null); 
          loadPlan(activePlanName); 
        }} variant="outline" className="mt-3 text-xs py-1 px-2 h-auto">
          重试加载
        </Button>
      </Alert>
    );
  }

  if (!activePlanName || !mealPlan || !mealPlan.weeklyMealPlan || mealPlan.weeklyMealPlan.length === 0) {
    return (
      <div className="mt-12 text-center py-10">
        <Utensils size={64} className="mx-auto text-muted-foreground/50 mb-6" />
        <h2 className="text-3xl font-semibold text-primary mb-3">当前无活动膳食计划！</h2>
        <p className="text-lg text-muted-foreground mb-6">
          请在头部菜单中生成新的膳食计划或选择一个已有的计划。
        </p>
      </div>
    );
  }
  
  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold text-primary">
          {activePlanName ? `当前计划: ${activePlanName}` : "您的每周膳食计划"}
        </h2>
        {activePlanName && ( 
          <Button
              variant="outline"
              size="sm"
              onClick={handleClearPlan}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              disabled={isLoading} 
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> 
              {isLoading ? "处理中..." : "全部移除"}
          </Button>
        )}
      </div>
      <div className="space-y-3">
        {mealPlan.weeklyMealPlan.map((dailyPlanItem) => (
          <DailyMealCard 
            key={`${activePlanName}-${dailyPlanItem.day}`} 
            dailyPlan={dailyPlanItem} 
            onDeleteMeal={handleDeleteMeal}
            onAddMeal={(day, mealTypeKey, mealTypeTitle) => handleAddMealClick(day, mealTypeKey, mealTypeTitle)} 
          />
        ))}
      </div>
      {addRecipeTarget && mealPlan && ( 
        <AddRecipeDialog
          isOpen={isAddRecipeDialogOpen}
          onClose={() => {
            setIsAddRecipeDialogOpen(false);
            setAddRecipeTarget(null);
          }}
          onSubmit={handleAddNewRecipeSubmit}
          mealTypeTitle={addRecipeTarget.mealTypeTitle} // This is already Chinese from DailyMealCard
          day={addRecipeTarget.day}
          planDescription={mealPlan.planDescription || ""} 
        />
      )}
      <MealPlanAnalysis currentMealPlan={mealPlan} />
    </div>
  );
}


