
"use client";

import { useState } from "react";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import DailyMealCard from "./DailyMealCard";
import AddRecipeDialog from "./AddRecipeDialog"; // Import the new dialog
import { Button } from "@/components/ui/button";
import { AlertCircle, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { deleteMealPlanAction, saveMealPlanToDb } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import type { DailyMealPlan, Meal, GenerateWeeklyMealPlanOutput } from "@/ai/flows/generate-weekly-meal-plan";

type MealTypeKey = keyof Pick<DailyMealPlan, 'breakfast' | 'lunch' | 'dinner'>;

export default function GeneratedMealPlan() {
  const { mealPlan, isLoading, error, setMealPlan, setError, setIsLoading } = useMealPlan();
  const { dietaryPreferences } = useUserProfile();
  const { toast } = useToast();

  const [isAddRecipeDialogOpen, setIsAddRecipeDialogOpen] = useState(false);
  const [addRecipeTarget, setAddRecipeTarget] = useState<{ day: string; mealTypeKey: MealTypeKey; mealTypeTitle: string } | null>(null);

  const saveCurrentPlanToDb = async (planToSave: GenerateWeeklyMealPlanOutput | null) => {
    if (!planToSave || !dietaryPreferences) return;
    try {
      await saveMealPlanToDb(dietaryPreferences, planToSave);
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
    setIsLoading(true);
    setError(null);
    
    if (dietaryPreferences) {
      try {
        const result = await deleteMealPlanAction(dietaryPreferences);
        if (result.success) {
          toast({
            title: "Plan Cleared",
            description: "The meal plan has been removed from your records.",
          });
        } else {
          setError(result.error || "Failed to clear plan from database.");
          toast({
            title: "Error",
            description: result.error || "Could not remove the plan from records.",
            variant: "destructive",
          });
        }
      } catch (e: any) {
        const errorMessage = e.message || "An unexpected error occurred while clearing the plan.";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
    
    setMealPlan(null); 
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
    const updatedMealPlan = { ...mealPlan, weeklyMealPlan: updatedWeeklyMealPlan };
    setMealPlan(updatedMealPlan);
    toast({
      title: "Recipe Deleted",
      description: `A recipe for ${mealTypeKey} on ${day} has been removed.`,
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
    const updatedMealPlan = { ...mealPlan, weeklyMealPlan: updatedWeeklyMealPlan };
    setMealPlan(updatedMealPlan);
    toast({
      title: "Recipe Added",
      description: `${newRecipe.recipeName} added for ${mealTypeKey} on ${day}.`,
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
        }} variant="outline" className="mt-3 text-xs py-1 px-2 h-auto">
          Dismiss
        </Button>
      </Alert>
    );
  }

  if (!mealPlan || mealPlan.weeklyMealPlan.length === 0) {
    if (dietaryPreferences && !isLoading) {
      return (
        <div className="mt-8 text-center text-muted-foreground">
          <p>No meal plan generated yet or found for your current preferences.</p>
          <p>Use the form above to generate a new plan.</p>
        </div>
      );
    }
    return null; 
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <h2 className="text-xl font-semibold text-center sm:text-left text-primary">Your Weekly Meal Plan</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearPlan}
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            disabled={isLoading}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> 
            {isLoading ? "Clearing..." : "Clear Plan"}
          </Button>
        </div>
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

