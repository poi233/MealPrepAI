"use client";

import { useMealPlan } from "@/contexts/MealPlanContext";
import DailyMealCard from "./DailyMealCard";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function GeneratedMealPlan() {
  const { mealPlan, isLoading, error, setMealPlan, setError } = useMealPlan();

  if (isLoading) {
    return (
      <div className="space-y-8 mt-8">
        <h2 className="text-3xl font-semibold text-center text-primary mb-6">
          Generating your personalized meal plan...
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
        <AlertTitle>Error Generating Meal Plan</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button onClick={() => setError(null)} variant="outline" className="mt-4">
          Try Again
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
          onClick={() => {
            setMealPlan(null);
            setError(null);
          }}
          className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCcw className="mr-2 h-4 w-4" /> Clear Plan & Start Over
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
