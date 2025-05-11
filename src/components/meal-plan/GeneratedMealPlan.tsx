
"use client";

import { useState, useEffect } from "react";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import DailyMealCard from "./DailyMealCard";
import AddRecipeDialog from "./AddRecipeDialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Trash2, Utensils } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { deleteMealPlanAction, saveMealPlanToDb, getSavedMealPlanAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import type { DailyMealPlan, Meal, GenerateWeeklyMealPlanOutput } from "@/ai/flows/generate-weekly-meal-plan";
import { normalizePreferences } from "@/lib/utils";
import type { MealPlanState } from "@/contexts/MealPlanContext";

type MealTypeKey = keyof Pick<DailyMealPlan, 'breakfast' | 'lunch' | 'dinner'>;

export default function GeneratedMealPlan() {
  const { mealPlan, isLoading, error, setMealPlan, setError, setIsLoading } = useMealPlan();
  const { dietaryPreferences: profilePreferences } = useUserProfile();
  const { toast } = useToast();

  const [isAddRecipeDialogOpen, setIsAddRecipeDialogOpen] = useState(false);
  const [addRecipeTarget, setAddRecipeTarget] = useState<{ day: string; mealTypeKey: MealTypeKey; mealTypeTitle: string } | null>(null);

  useEffect(() => {
    const normalizedProfilePrefs = normalizePreferences(profilePreferences);

    if (normalizedProfilePrefs) {
      // Preferences are set
      if (mealPlan?.loadedForPrefs === normalizedProfilePrefs && !isLoading) {
        // Plan is already loaded for these exact preferences and not currently loading, so do nothing.
        // Or, an attempt was made and it was empty, still loadedForPrefs matches.
        return;
      }
      
      if (isLoading && mealPlan?.loadedForPrefs === normalizedProfilePrefs) { 
        // If already loading for the *current* preferences, let it finish to avoid duplicate loads.
          return;
      }

      const loadInitialPlan = async () => {
        setIsLoading(true);
        setError(null); 
        try {
          const existingPlanData = await getSavedMealPlanAction(normalizedProfilePrefs);

          if (existingPlanData && !("error" in existingPlanData)) {
            setMealPlan({ ...existingPlanData, loadedForPrefs: normalizedProfilePrefs });
          } else if (existingPlanData && "error" in existingPlanData) {
            setError(existingPlanData.error);
            setMealPlan({ weeklyMealPlan: [], loadedForPrefs: normalizedProfilePrefs }); 
            toast({
                title: "Error Loading Saved Plan",
                description: existingPlanData.error,
                variant: "destructive",
            });
          } else {
            // existingPlanData is null (plan not found in DB for these prefs)
            setMealPlan({ weeklyMealPlan: [], loadedForPrefs: normalizedProfilePrefs });
          }
        } catch (e: any) {
          const errorMessage = e.message || "Failed to load saved meal plan.";
          setError(errorMessage);
          setMealPlan({ weeklyMealPlan: [], loadedForPrefs: normalizedProfilePrefs });
          toast({
            title: "Loading Error",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
      loadInitialPlan();
    } else {
      // No profile preferences are set
      if (mealPlan) setMealPlan(null); 
      if (error) setError(null); 
      if (isLoading) setIsLoading(false); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilePreferences, setIsLoading, setMealPlan, setError]); // Removed mealPlan from dependencies to avoid re-triggering on mealPlan updates by other actions (add/delete)
                                                               // Only re-trigger if profilePreferences change.
                                                               // isLoading is also a dep to allow re-fetch if it was stuck.

  const saveCurrentPlanToDb = async (planToSave: MealPlanState) => {
    if (!planToSave || !profilePreferences) return;
    const normalizedPrefs = normalizePreferences(profilePreferences);
    if (!normalizedPrefs) {
        toast({
            title: "Cannot Save Plan",
            description: "Dietary preferences are not set. Please set them in your profile or when generating a plan.",
            variant: "destructive",
        });
        return;
    }
    // Ensure we are saving only GenerateWeeklyMealPlanOutput, not the context state with loadedForPrefs
    const { loadedForPrefs, ...planDataToSave } = planToSave;

    try {
      await saveMealPlanToDb(normalizedPrefs, planDataToSave as GenerateWeeklyMealPlanOutput); // Cast to ensure type
      toast({
        title: "Plan Updated",
        description: "Your meal plan changes have been saved.",
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
    setIsLoading(true);
    setError(null);
    
    const normalizedPrefs = normalizePreferences(profilePreferences);
    if (normalizedPrefs) {
      try {
        const result = await deleteMealPlanAction(normalizedPrefs);
        if (result.success) {
          toast({
            title: "Plan Cleared",
            description: "The meal plan has been removed from the database.",
          });
        } else {
          setError(result.error || "Failed to clear plan from database.");
          toast({
            title: "Error Clearing Plan",
            description: result.error || "Could not remove the plan from the database.",
            variant: "destructive",
          });
        }
      } catch (e: any) {
        const errorMessage = e.message || "An unexpected error occurred while clearing the plan.";
        setError(errorMessage);
        toast({
          title: "Clearing Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
    
    // Set to an empty plan structure marked for current prefs to stop reload attempts
    setMealPlan({ weeklyMealPlan: [], loadedForPrefs: normalizedPrefs || undefined }); 
    setIsLoading(false);
  };

  const handleDeleteMeal = (day: string, mealTypeKey: MealTypeKey, recipeIndex: number) => {
    if (!mealPlan) return;

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
    const updatedMealPlan: MealPlanState = { ...mealPlan, weeklyMealPlan: updatedWeeklyMealPlan };
    setMealPlan(updatedMealPlan);
    toast({
      title: "Recipe Deleted",
      description: `A recipe for ${mealTypeKey} on ${day} has been removed locally.`,
    });
    saveCurrentPlanToDb(updatedMealPlan);
  };

  const handleAddMealClick = (day: string, mealTypeKey: MealTypeKey, mealTypeTitle: string) => {
    setAddRecipeTarget({ day, mealTypeKey, mealTypeTitle });
    setIsAddRecipeDialogOpen(true);
  };

  const handleAddNewRecipeSubmit = (newRecipe: Meal) => {
    if (!mealPlan || !addRecipeTarget) return;

    const { day, mealTypeKey } = addRecipeTarget;

    const updatedWeeklyMealPlan = mealPlan.weeklyMealPlan.map(daily => {
      if (daily.day === day) {
        const currentMeals = daily[mealTypeKey] || [];
        const updatedMeals = [...currentMeals, newRecipe];
        return { ...daily, [mealTypeKey]: updatedMeals };
      }
      return daily;
    });
    const updatedMealPlan: MealPlanState = { ...mealPlan, weeklyMealPlan: updatedWeeklyMealPlan };
    setMealPlan(updatedMealPlan);
    toast({
      title: "Recipe Added",
      description: `${newRecipe.recipeName} added locally for ${mealTypeKey} on ${day}.`,
    });
    saveCurrentPlanToDb(updatedMealPlan);
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

  if (error) {
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button onClick={() => {
          setError(null); 
          if (mealPlan) setMealPlan({...mealPlan, loadedForPrefs: undefined }); else setMealPlan(null);
        }} variant="outline" className="mt-3 text-xs py-1 px-2 h-auto">
          Dismiss & Retry Load
        </Button>
      </Alert>
    );
  }

  if (!mealPlan || !mealPlan.weeklyMealPlan || mealPlan.weeklyMealPlan.length === 0) {
     return (
        <div className="mt-12 text-center py-10">
            <Utensils size={64} className="mx-auto text-muted-foreground/50 mb-6" />
            <h2 className="text-3xl font-semibold text-primary mb-3">No Meal Plan Yet!</h2>
            <p className="text-lg text-muted-foreground mb-1">
            It looks like you don&apos;t have a meal plan loaded for the current preferences,
            </p>
            <p className="text-lg text-muted-foreground mb-1">
            or the plan is empty.
            </p>
            <p className="text-lg text-muted-foreground mb-6">
            Ready to start? Click the &quot;Generate Meal Plan&quot; button in the header.
            </p>
        </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold text-primary">Your Weekly Meal Plan</h2>
        <Button
            variant="outline"
            size="sm"
            onClick={handleClearPlan}
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            disabled={isLoading}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> 
            {isLoading ? "Clearing..." : "Remove All"}
        </Button>
      </div>
      <div className="space-y-3">
        {mealPlan.weeklyMealPlan.map((dailyPlanItem) => (
          <DailyMealCard 
            key={dailyPlanItem.day} 
            dailyPlan={dailyPlanItem} 
            onDeleteMeal={handleDeleteMeal}
            onAddMeal={(day, mealTypeKey, mealTypeTitle) => handleAddMealClick(day, mealTypeKey, mealTypeTitle)} 
          />
        ))}
      </div>
      {addRecipeTarget && (
        <AddRecipeDialog
          isOpen={isAddRecipeDialogOpen}
          onClose={() => {
            setIsAddRecipeDialogOpen(false);
            setAddRecipeTarget(null);
          }}
          onSubmit={handleAddNewRecipeSubmit}
          mealTypeTitle={addRecipeTarget.mealTypeTitle}
          day={addRecipeTarget.day}
        />
      )}
    </div>
  );
}

