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


  if (isLoading) {
    return (
      <div className="space-y-8 mt-8">
        <h2 className="text-3xl font-semibold text-center text-primary mb-6">
          Loading your meal plan...
        </h2>
        {[...Array(3)].map((_, i) => ( // Show 3 skeleton daily cards
          <div key={i} className="bg-card p-6 rounded-lg shadow-md space-y-4">
            <Skeleton className="h-8 w-1/3 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="space-y-3">
                  <Skeleton className="h-6 w-1/2 rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-2/3 rounded" />
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
      <Alert variant="destructive" className="mt-8">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button onClick={() => {
          setError(null);
          // Optionally, try to re-fetch or guide user to re-generate
        }} variant="outline" className="mt-4">
          Dismiss
        </Button>
      </Alert>
    );
  }

  if (!mealPlan || mealPlan.weeklyMealPlan.length === 0) {
    return null; // Don't show anything if no plan and no loading/error
  }

  return (
    <div className="mt-10 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-3xl font-bold text-center sm:text-left text-primary">Your Weekly Meal Plan</h2>
        <Button
          variant="outline"
          onClick={handleClearPlan}
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          disabled={isLoading}
        >
          <Trash2 className="mr-2 h-4 w-4" /> 
          {isLoading ? "Clearing..." : "Clear Plan & Start Over"}
        </Button>
      </div>
      <div className="space-y-6">
        {mealPlan.weeklyMealPlan.map((dailyPlan) => (
          <DailyMealCard key={dailyPlan.day} dailyPlan={dailyPlan} />
        ))}
      </div>
    </div>
  );
}
