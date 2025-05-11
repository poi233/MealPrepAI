"use client";

import { useState, useEffect, useCallback } from "react";
import { useMealPlan, type MealPlanData } from "@/contexts/MealPlanContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import DailyMealCard from "./DailyMealCard";
import AddRecipeDialog from "./AddRecipeDialog";
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

type MealTypeKey = keyof Pick<DailyMealPlan, 'breakfast' | 'lunch' | 'dinner'>;

export default function GeneratedMealPlan() {
  const { mealPlan, isLoading: isMealPlanContextLoading, error: mealPlanError, setMealPlan, setError, setIsLoading: setMealPlanLoading } = useMealPlan();
  const { activePlanName, setActivePlanName, isLoading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();

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
        if (result && result.mealPlanData) { // Ensure mealPlanData is not null
            planDataToSet = { weeklyMealPlan: result.mealPlanData.weeklyMealPlan, planDescription: result.planDescription };
        } else { 
            // Plan found by name, but data might be missing or malformed in DB record.
            console.warn(`Plan "${planNameToLoad}" found but data is missing/malformed.`);
            planDataToSet = null; 
        }
      } else { 
        // Error fetching or plan not found.
        if (result && "error" in result) {
          console.warn(`Error retrieving plan "${planNameToLoad}": ${result.error}.`);
        }
        planDataToSet = null; 
      }
    } else { 
      planDataToSet = null; // No planNameToLoad provided
    }
    
    setMealPlan(planDataToSet);
    setMealPlanLoading(false);
  }, [setMealPlan, setError, setMealPlanLoading]);


  useEffect(() => {
    // Only load if profile is not loading AND activePlanName is either defined or explicitly null (meaning no active plan).
    // This avoids loading with a potentially stale activePlanName if profile is still initializing.
    if (!isProfileLoading) { 
        loadPlan(activePlanName);
    }
  }, [activePlanName, isProfileLoading, loadPlan]);

  const saveCurrentPlanToDb = async (updatedMealPlanData: GenerateWeeklyMealPlanOutput) => {
    if (!mealPlan || !activePlanName || mealPlan.planDescription === undefined) {
        toast({
            title: "Cannot Save Plan",
            description: "Active plan name or description is missing. Cannot save changes.",
            variant: "destructive",
        });
        return;
    }

    try {
      await saveMealPlanToDb(activePlanName, mealPlan.planDescription, updatedMealPlanData);
      toast({
        title: "Plan Updated",
        description: "Your meal plan changes have been saved to the database.",
      });
    } catch (dbError: any) {
      console.error("Failed to save meal plan to DB:", dbError); 
      toast({
        title: "Database Error",
        description: dbError.message || "Could not save changes to the database.",
        variant: "destructive",
      });
    }
  };

  const handleClearPlan = async () => {
    if (!activePlanName) {
        toast({ title: "No Active Plan", description: "There is no active plan to remove.", variant: "default"});
        return;
    }
    setMealPlanLoading(true);
    setError(null);
    
    const planNameToDelete = activePlanName; // Capture before it's potentially cleared

    try {
      const result = await deleteMealPlanByNameAction(planNameToDelete);
      if (result.success) {
        toast({
          title: "Plan Removed",
          description: `The meal plan "${planNameToDelete}" has been removed.`,
        });
        setMealPlan(null); 
        setActivePlanName(null); // This is crucial: updates context, localStorage, and DB for active status
      } else {
        setError(result.error || "Failed to remove plan from database.");
        toast({
          title: "Error Removing Plan",
          description: result.error || "Could not remove the plan from the database.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred while removing the plan.";
      setError(errorMessage);
      toast({
        title: "Removing Error",
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
    toast({
      title: "Recipe Deleted",
      description: `A recipe for ${mealTypeKey} on ${day} has been removed locally. Saving...`,
    });
    saveCurrentPlanToDb({ weeklyMealPlan: updatedWeeklyMealPlan });
  };

  const handleAddMealClick = (day: string, mealTypeKey: MealTypeKey, mealTypeTitle: string) => {
    if (!mealPlan || mealPlan.planDescription === undefined) {
      toast({
        title: "Cannot Add Recipe",
        description: "Plan description is missing. AI suggestions may not work correctly.",
        variant: "warning",
      });
      // Allow adding manually even if description is missing for suggestions
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
    toast({
      title: "Recipe Added",
      description: `${newRecipe.recipeName} added locally for ${mealTypeKey} on ${day}. Saving...`,
    });
    saveCurrentPlanToDb({ weeklyMealPlan: updatedWeeklyMealPlan });
    setIsAddRecipeDialogOpen(false);
    setAddRecipeTarget(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 mt-6">
        <h2 className="text-xl font-semibold text-center text-primary mb-3">
          Loading your meal plan...
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

  if (mealPlanError && (!mealPlan || !mealPlan.weeklyMealPlan || mealPlan.weeklyMealPlan.length === 0)) {
    // This specific error case might be redundant if activePlanName=null handles the "No plan" display.
    // However, it can catch specific load errors if a plan was expected.
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Error Loading Plan</AlertTitle>
        <AlertDescription>{mealPlanError}</AlertDescription>
        <Button onClick={() => {
          setError(null); 
          loadPlan(activePlanName); 
        }} variant="outline" className="mt-3 text-xs py-1 px-2 h-auto">
          Retry Load
        </Button>
      </Alert>
    );
  }

  if (!activePlanName || !mealPlan || !mealPlan.weeklyMealPlan || mealPlan.weeklyMealPlan.length === 0) {
    // This condition handles:
    // 1. No activePlanName (from UserProfileContext).
    // 2. activePlanName exists, but mealPlan data is null or empty (e.g., failed to load or plan is genuinely empty).
    return (
      <div className="mt-12 text-center py-10">
        <Utensils size={64} className="mx-auto text-muted-foreground/50 mb-6" />
        <h2 className="text-3xl font-semibold text-primary mb-3">No Meal Plan Active!</h2>
        <p className="text-lg text-muted-foreground mb-6">
          Please generate a new meal plan or select an existing one using the options in the header.
        </p>
      </div>
    );
  }
  
  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold text-primary">
          {activePlanName ? `Active Plan: ${activePlanName}` : "Your Weekly Meal Plan"}
        </h2>
        {activePlanName && ( // Only show if there's an active plan
          <Button
              variant="outline"
              size="sm"
              onClick={handleClearPlan}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              disabled={isLoading} // isLoading from combined context loading states
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> 
              {isLoading ? "Processing..." : "Remove All"}
          </Button>
        )}
      </div>
      <div className="space-y-3">
        {mealPlan.weeklyMealPlan.map((dailyPlanItem) => (
          <DailyMealCard 
            key={`${activePlanName}-${dailyPlanItem.day}`} // Ensure key is unique with activePlanName
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
          mealTypeTitle={addRecipeTarget.mealTypeTitle}
          day={addRecipeTarget.day}
          planDescription={mealPlan.planDescription || ""} 
        />
      )}
    </div>
  );
}