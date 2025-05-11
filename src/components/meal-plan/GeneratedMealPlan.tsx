
"use client";

import { useMealPlan } from "@/contexts/MealPlanContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import DailyMealCard from "./DailyMealCard";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { deleteMealPlanAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import type { DailyMealPlan, Meal, GenerateWeeklyMealPlanOutput } from "@/ai/flows/generate-weekly-meal-plan";

export default function GeneratedMealPlan() {
  const { mealPlan, isLoading, error, setMealPlan, setError, setIsLoading } = useMealPlan();
  const { dietaryPreferences } = useUserProfile();
  const { toast } = useToast();

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
    
    setMealPlan(null); // Always clear from UI
    setIsLoading(false);
  };

  const handleDeleteMeal = (day: string, mealType: keyof Pick<DailyMealPlan, 'breakfast' | 'lunch' | 'dinner'>) => {
    if (!mealPlan) return;

    const updatedWeeklyMealPlan = mealPlan.weeklyMealPlan.map(daily => {
      if (daily.day === day) {
        return { ...daily, [mealType]: null };
      }
      return daily;
    });
    setMealPlan({ ...mealPlan, weeklyMealPlan: updatedWeeklyMealPlan });
    toast({
      title: "Meal Deleted",
      description: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} for ${day} has been removed.`,
    });
  };

  const handleAddMeal = (day: string, mealType: keyof Pick<DailyMealPlan, 'breakfast' | 'lunch' | 'dinner'>) => {
    if (!mealPlan) return;

    const placeholderMeal: Meal = {
      mealName: mealType.charAt(0).toUpperCase() + mealType.slice(1),
      recipeName: `New ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`,
      ingredients: ["Edit ingredients"],
      instructions: "Add instructions here.",
    };

    const updatedWeeklyMealPlan = mealPlan.weeklyMealPlan.map(daily => {
      if (daily.day === day) {
        return { ...daily, [mealType]: placeholderMeal };
      }
      return daily;
    });
    setMealPlan({ ...mealPlan, weeklyMealPlan: updatedWeeklyMealPlan });
    toast({
      title: "Meal Slot Ready",
      description: `Placeholder added for ${mealType} on ${day}. You can edit details in a future update.`,
    });
  };


  if (isLoading) {
    return (
      <div className="space-y-6 mt-6">
        <h2 className="text-2xl font-semibold text-center text-primary mb-4">
          Loading your meal plan...
        </h2>
        {[...Array(2)].map((_, i) => ( 
          <div key={i} className="bg-card p-4 rounded-lg shadow-md space-y-3">
            <Skeleton className="h-6 w-1/4 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="space-y-2 p-2 border rounded">
                  <Skeleton className="h-5 w-1/2 rounded" />
                  <Skeleton className="h-3 w-3/4 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-2/3 rounded" />
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
    return null; 
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <h2 className="text-2xl font-semibold text-center sm:text-left text-primary">Your Weekly Meal Plan</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearPlan}
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          disabled={isLoading}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> 
          {isLoading ? "Clearing..." : "Clear Plan & Start Over"}
        </Button>
      </div>
      <div className="space-y-4">
        {mealPlan.weeklyMealPlan.map((dailyPlanItem) => (
          <DailyMealCard 
            key={dailyPlanItem.day} 
            dailyPlan={dailyPlanItem} 
            onDeleteMeal={handleDeleteMeal}
            onAddMeal={handleAddMeal}
          />
        ))}
      </div>
    </div>
  );
}
