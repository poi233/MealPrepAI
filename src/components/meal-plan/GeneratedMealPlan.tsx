
"use client";

import { useState, useEffect, useCallback } from "react";
import { useNormalizedMealPlan } from "@/contexts/NormalizedMealPlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import DailyMealCard from "./cards/DailyMealCard";

import AddRecipeDialog from "./dialogs/AddRecipeDialog";
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
import { useToast } from "@/hooks/use-toast";
import type { DailyMealPlan, Meal, GenerateWeeklyMealPlanOutput } from "@/ai/flows/generate-weekly-meal-plan";
import { usePlanList } from '@/contexts/PlanListContext';
 

type MealTypeKey = keyof Pick<DailyMealPlan, 'breakfast' | 'lunch' | 'dinner'>;

const DAYS_OF_WEEK_CHINESE = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const DAYS_OF_WEEK_SELECTOR = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];


export default function GeneratedMealPlan() {
  const { activeMealPlan, isLoading: isMealPlanContextLoading, error: mealPlanError, setError, loadActiveMealPlan, deleteCurrentMealPlan } = useNormalizedMealPlan();
  const { user } = useAuth();
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


  const loadPlan = useCallback(async () => {
    if (isMealPlanContextLoading || !user?.id) return; // Prevent multiple loads

    setError(null);

    try {
      await loadActiveMealPlan(user.id);
    } catch (e) {
      console.error("加载计划时发生意外错误:", e);
      setError(e instanceof Error ? e.message : "加载计划时发生意外错误");
    }
  }, [loadActiveMealPlan, user?.id, isMealPlanContextLoading, setError]);


  useEffect(() => {
    if (!isProfileLoading && user?.id) { 
        loadPlan();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isProfileLoading]);

  // This function is no longer needed as the normalized system handles updates automatically

  const confirmRemovePlan = async () => {
    if (!activeMealPlan) {
        toast({ title: "无活动计划", description: "没有活动的计划可以移除。", variant: "default"});
        setIsConfirmRemoveDialogOpen(false);
        return;
    }
    
    setIsDeletingPlan(true);
    const planNameToDelete = activeMealPlan.name; 

    try {
      await deleteCurrentMealPlan();
      toast({
        title: "计划已移除",
        description: `膳食计划 "${planNameToDelete}" 已被移除。`,
      });
      setActivePlanName(null); 
      await refreshPlanListSelector(); 
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "移除计划时发生意外错误。";
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

  // This function needs to be updated to work with the normalized meal plan system
  // For now, we'll disable meal deletion until the DailyMealCard is updated
  const handleDeleteMeal = (day: string, mealTypeKey: MealTypeKey, recipeIndex: number) => {
    toast({
      title: "功能暂不可用",
      description: "删除食谱功能正在更新中，请稍后再试。",
      variant: "default",
    });
  };

  const handleAddMealClick = (day: string, mealTypeKey: MealTypeKey, mealTypeTitle: string) => {
    if (!activeMealPlan || !activeMealPlan.description) {
      toast({
        title: "无法添加食谱",
        description: "缺少计划描述。AI推荐功能可能无法正常工作。",
        variant: "destructive",
      });
    }
    setAddRecipeTarget({ day, mealTypeKey, mealTypeTitle });
    setIsAddRecipeDialogOpen(true);
  };

  // This function needs to be updated to work with the normalized meal plan system
  // For now, we'll disable recipe addition until the system is fully updated
  const handleAddNewRecipeSubmit = (newRecipe: Meal) => {
    toast({
      title: "功能暂不可用",
      description: "添加食谱功能正在更新中，请稍后再试。",
      variant: "default",
    });
    setIsAddRecipeDialogOpen(false);
    setAddRecipeTarget(null);
  };

  const getFilteredWeeklyPlan = useCallback(() => {
    if (!activeMealPlan?.items) return [];
    
    // Convert normalized meal plan items to legacy format for display
    const weeklyMealPlan = DAYS_OF_WEEK_CHINESE.map(day => {
      const dayIndex = DAYS_OF_WEEK_CHINESE.indexOf(day);
      const dayItems = activeMealPlan.items.filter(item => item.dayOfWeek === dayIndex);
      
      return {
        day,
        breakfast: dayItems.filter(item => item.mealType === 'breakfast').map(item => ({
          recipeName: item.recipe.name,
          ingredients: item.recipe.ingredients.map(ing => `${ing.amount} ${ing.unit} ${ing.name}`),
          instructions: item.recipe.instructions
        })),
        lunch: dayItems.filter(item => item.mealType === 'lunch').map(item => ({
          recipeName: item.recipe.name,
          ingredients: item.recipe.ingredients.map(ing => `${ing.amount} ${ing.unit} ${ing.name}`),
          instructions: item.recipe.instructions
        })),
        dinner: dayItems.filter(item => item.mealType === 'dinner').map(item => ({
          recipeName: item.recipe.name,
          ingredients: item.recipe.ingredients.map(ing => `${ing.amount} ${ing.unit} ${ing.name}`),
          instructions: item.recipe.instructions
        }))
      };
    });
    
    switch (displayMode) {
      case 'today':
        return currentDayName ? weeklyMealPlan.filter(dp => dp.day === currentDayName) : [];
      case 'all':
        return weeklyMealPlan;
      default: // Specific day selected
        return weeklyMealPlan.filter(dp => dp.day === displayMode);
    }
  }, [activeMealPlan, displayMode, currentDayName]);

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
  
  if (mealPlanError && (!activeMealPlan || !activeMealPlan.items || activeMealPlan.items.length === 0)) {
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

  if (!activeMealPlan || !activeMealPlan.items || activeMealPlan.items.length === 0) {
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
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main meal plan content */}
              <div className="lg:col-span-3 space-y-3">
                {displayedDailyPlans.map((dailyPlanItem) => (
                  <DailyMealCard 
                    key={`${activePlanName}-${dailyPlanItem.day}`} 
                    dailyPlan={dailyPlanItem} 
                    onDeleteMeal={handleDeleteMeal}
                    onAddMeal={(day, mealTypeKey, mealTypeTitle) => handleAddMealClick(day, mealTypeKey, mealTypeTitle)} 
                  />
                ))}
              </div>
              
              {/* Future: Enhanced recipe suggestions sidebar */}
              <div className="lg:col-span-1">
                {/* Placeholder for future favorites/recipe suggestions */}
              </div>
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
          <MealPlanAnalysis currentMealPlan={activeMealPlan} />
        </TabsContent>

        <TabsContent value="shopping-list" className="mt-4">
          <ShoppingListGenerator currentMealPlan={activeMealPlan} />
        </TabsContent>
      </Tabs>

      {addRecipeTarget && activeMealPlan && ( 
        <AddRecipeDialog
          isOpen={isAddRecipeDialogOpen}
          onClose={() => {
            setIsAddRecipeDialogOpen(false);
            setAddRecipeTarget(null);
          }}
          onSubmit={handleAddNewRecipeSubmit}
          mealTypeTitle={addRecipeTarget.mealTypeTitle} 
          day={addRecipeTarget.day}
          planDescription={activeMealPlan.description || ""} 
        />
      )}
      
      <AlertDialog open={isConfirmRemoveDialogOpen} onOpenChange={setIsConfirmRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除计划</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要移除当前的膳食计划 &quot;{activePlanName}&quot; 吗？
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

