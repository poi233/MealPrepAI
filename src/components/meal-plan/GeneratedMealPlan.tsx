
"use client";

import { useState, useEffect, useCallback } from "react";
import { useMealPlan, type MealPlanData } from "@/contexts/MealPlanContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import DailyMealCard from "./DailyMealCard";
import AddRecipeDialog from "./AddRecipeDialog";
import MealPlanAnalysis from "./MealPlanAnalysis"; 
import ShoppingListGenerator from "./ShoppingListGenerator";
import { Button } from "@/components/ui/button";
import { AlertCircle, Trash2, Utensils, CalendarDays, Brain, ListChecks, Filter, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  deleteMealPlanByNameAction, 
  saveMealPlanToDb, 
  getSavedMealPlanByNameAction
} from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import type { DailyMealPlan, Meal, GenerateWeeklyMealPlanOutput } from "@/ai/flows/generate-weekly-meal-plan";
import { usePlanList } from '@/contexts/PlanListContext'; 

type MealTypeKey = keyof Pick<DailyMealPlan, 'breakfast' | 'lunch' | 'dinner'>;

const DAYS_OF_WEEK_CHINESE = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const DAYS_OF_WEEK_SELECTOR = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];


export default function GeneratedMealPlan() {
  const { mealPlan, isLoading: isMealPlanContextLoading, error: mealPlanError, setMealPlan, setError, setIsLoading: setMealPlanLoading } = useMealPlan();
  const { activePlanName, setActivePlanName, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();
  const { fetchPlanNames: refreshPlanListSelector, isLoadingPlans: isPlanListSelectorLoading } = usePlanList(); 

  const [isAddRecipeDialogOpen, setIsAddRecipeDialogOpen] = useState(false);
  const [addRecipeTarget, setAddRecipeTarget] = useState<{ day: string; mealTypeKey: MealTypeKey; mealTypeTitle: string } | null>(null);
  
  const [displayMode, setDisplayMode] = useState<'today' | 'all' | string>('today');
  const [currentDayName, setCurrentDayName] = useState<string>('');
  const [isConfirmRemoveDialogOpen, setIsConfirmRemoveDialogOpen] = useState(false);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  const isLoading = isMealPlanContextLoading || isProfileLoading;

  const getCurrentDayInChinese = useCallback((): string => {
    const todayIndex = new Date().getDay(); // Sunday is 0, Monday is 1, etc.
    return DAYS_OF_WEEK_CHINESE[todayIndex];
  }, []);

  useEffect(() => {
    setCurrentDayName(getCurrentDayInChinese());
  }, [getCurrentDayInChinese]);


  const loadPlan = useCallback(async (planNameToLoad: string | null) => {
    if (isMealPlanContextLoading) return; // Prevent multiple loads

    setMealPlanLoading(true);
    setError(null);
    let planDataToSet: MealPlanData | null = null;

    try {
      if (planNameToLoad) {
        const result = await getSavedMealPlanByNameAction(planNameToLoad);
        if (result && !("error" in result)) {
          if (result.mealPlanData && result.mealPlanData.weeklyMealPlan) {
            planDataToSet = { 
              weeklyMealPlan: result.mealPlanData.weeklyMealPlan, 
              planDescription: result.planDescription,
              analysisText: result.analysisText 
            };
          } else {
            console.warn(`Plan "${planNameToLoad}" data is malformed or empty. MealPlanData or weeklyMealPlan is missing.`);
            planDataToSet = null; 
          }
        } else {
          if (result && "error" in result) {
             console.warn(`无法加载计划 "${planNameToLoad}": ${result.error}.`);
          } else if (!result) {
             console.warn(`未找到计划 "${planNameToLoad}" 或 getSavedMealPlanByNameAction 返回 null.`);
          }
          planDataToSet = null;
        }
      } else {
        planDataToSet = null;
      }
      setMealPlan(planDataToSet);
    } catch (e) {
      console.error("加载计划时发生意外错误:", e);
      setMealPlan(null); 
    } finally {
      setMealPlanLoading(false);
    }
  }, [setMealPlan, setError, setMealPlanLoading, isMealPlanContextLoading]);


  useEffect(() => {
    if (!isProfileLoading && activePlanName !== undefined) { 
        loadPlan(activePlanName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlanName, isProfileLoading]);

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
      // No need to reload here as setMealPlan directly updates local state, and DB is source of truth on next full load.
      // await loadPlan(activePlanName); 

    } catch (dbError: any) {
      console.error("保存膳食计划到数据库失败:", dbError); 
      toast({
        title: "数据库错误",
        description: dbError.message || "无法将更改保存到数据库。",
        variant: "destructive",
      });
    }
  };

  const confirmRemovePlan = async () => {
    if (!activePlanName) {
        toast({ title: "无活动计划", description: "没有活动的计划可以移除。", variant: "default"});
        setIsConfirmRemoveDialogOpen(false);
        return;
    }
    
    setIsDeletingPlan(true);
    const planNameToDelete = activePlanName; 

    try {
      const result = await deleteMealPlanByNameAction(planNameToDelete);
      if (result.success) {
        toast({
          title: "计划已移除",
          description: `膳食计划 "${planNameToDelete}" 已被移除。`,
        });
        setMealPlan(null); 
        setActivePlanName(null); 
        await refreshPlanListSelector(); 
      } else {
        toast({
          title: "移除计划错误",
          description: result.error || "无法从数据库中移除该计划。",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || "移除计划时发生意外错误。";
      toast({
        title: "移除时出错",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
        setIsDeletingPlan(false);
        setIsConfirmRemoveDialogOpen(false);
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

  const getFilteredWeeklyPlan = useCallback(() => {
    if (!mealPlan?.weeklyMealPlan) return [];
    
    switch (displayMode) {
      case 'today':
        return currentDayName ? mealPlan.weeklyMealPlan.filter(dp => dp.day === currentDayName) : [];
      case 'all':
        return mealPlan.weeklyMealPlan;
      default: // Specific day selected
        return mealPlan.weeklyMealPlan.filter(dp => dp.day === displayMode);
    }
  }, [mealPlan, displayMode, currentDayName]);

  const displayedDailyPlans = getFilteredWeeklyPlan();


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
                <div key={`${i}-${j}`} className="space-y-1.5 p-1.5 border rounded min-h-[80px]">
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
  
  if (mealPlanError && (!mealPlan || !mealPlan.weeklyMealPlan || mealPlan.weeklyMealPlan.length === 0)) {
    return (
      <div className="mt-12 text-center py-10">
        <Utensils size={64} className="mx-auto text-muted-foreground/50 mb-6" />
        <h2 className="text-3xl font-semibold text-primary mb-3">膳食计划加载出错！</h2>
        <p className="text-lg text-muted-foreground mb-3">
          加载您的膳食计划时出现问题: {mealPlanError}
        </p>
        <p className="text-md text-muted-foreground">
          请尝试刷新页面，或在顶部菜单中生成新的膳食计划或选择一个已有的计划。
        </p>
      </div>
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
              onClick={() => setIsConfirmRemoveDialogOpen(true)}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              disabled={isLoading || isDeletingPlan} 
            >
              {isDeletingPlan ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" /> }
              {isDeletingPlan ? "处理中..." : "全部移除"}
          </Button>
        )}
      </div>
      
      <Tabs defaultValue="weekly-plan" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="weekly-plan" className="text-xs sm:text-sm data-[state=active]:text-primary data-[state=active]:font-semibold">
            <CalendarDays className="mr-1.5 h-4 w-4" />
            每周计划
          </TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs sm:text-sm data-[state=active]:text-primary data-[state=active]:font-semibold">
            <Brain className="mr-1.5 h-4 w-4" />
            AI分析
          </TabsTrigger>
          <TabsTrigger value="shopping-list" className="text-xs sm:text-sm data-[state=active]:text-primary data-[state=active]:font-semibold">
            <ListChecks className="mr-1.5 h-4 w-4" />
            购物清单
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly-plan" className="mt-4">
          <div className="mb-4 flex items-center gap-2">
            <Select 
                value={displayMode} 
                onValueChange={(value) => setDisplayMode(value as 'today' | 'all' | string)}
                disabled={isPlanListSelectorLoading || isLoading}
            >
              <SelectTrigger className="w-auto min-w-[200px]">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="选择显示方式" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today" className="text-sm">显示今天 ({currentDayName})</SelectItem>
                <SelectItem value="all" className="text-sm">显示整周</SelectItem>
                <SelectSeparator />
                {DAYS_OF_WEEK_SELECTOR.map(day => (
                    <SelectItem key={day} value={day} className="text-sm">{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {displayedDailyPlans.length > 0 ? (
            <div className="space-y-3">
              {displayedDailyPlans.map((dailyPlanItem) => (
                <DailyMealCard 
                  key={`${activePlanName}-${dailyPlanItem.day}`} 
                  dailyPlan={dailyPlanItem} 
                  onDeleteMeal={handleDeleteMeal}
                  onAddMeal={(day, mealTypeKey, mealTypeTitle) => handleAddMealClick(day, mealTypeKey, mealTypeTitle)} 
                />
              ))}
            </div>
            ) : (
            <Alert className="mt-4 bg-muted/50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>无膳食记录</AlertTitle>
                <AlertDescription>
                    {displayMode === 'today' ? `今天 (${currentDayName}) ` : (displayMode !== 'all' ? `${displayMode} ` : '')}
                    没有找到膳食记录。您可以尝试选择“显示整周”或生成新的计划。
                </AlertDescription>
            </Alert>
            )}
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <MealPlanAnalysis currentMealPlan={mealPlan} />
        </TabsContent>

        <TabsContent value="shopping-list" className="mt-4">
          <ShoppingListGenerator currentMealPlan={mealPlan} />
        </TabsContent>
      </Tabs>

      {addRecipeTarget && mealPlan && ( 
        <AddRecipeDialog
          isOpen={isAddRecipeDialogOpen}
          onClose={() => {
            setIsAddRecipeDialogOpen(false);
            setAddRecipeTarget(null);
          }}
          onSubmit={handleAddNewRecipeSubmit}
          mealTypeTitle={addRecipeTarget.mealTypeTitle} 
          day={addRecipeTarget.day}
          planDescription={mealPlan.planDescription || ""} 
        />
      )}
      
      <AlertDialog open={isConfirmRemoveDialogOpen} onOpenChange={setIsConfirmRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除计划</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要移除当前的膳食计划 "{activePlanName}" 吗？
              此操作也会从数据库中删除它，且无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmRemoveDialogOpen(false)} disabled={isDeletingPlan}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemovePlan} disabled={isDeletingPlan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isDeletingPlan ? "正在移除..." : "确认移除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

