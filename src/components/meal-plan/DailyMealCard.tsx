
"use client";

import type { DailyMealPlan, Meal } from "@/ai/flows/generate-weekly-meal-plan";
import MealItemCard from "./MealItemCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, PlusCircle } from "lucide-react";

interface DailyMealCardProps {
  dailyPlan: DailyMealPlan;
  onDeleteMeal: (day: string, mealType: keyof Pick<DailyMealPlan, 'breakfast' | 'lunch' | 'dinner'>) => void;
  onAddMeal: (day: string, mealType: keyof Pick<DailyMealPlan, 'breakfast' | 'lunch' | 'dinner'>) => void;
}

type MealType = keyof Pick<DailyMealPlan, 'breakfast' | 'lunch' | 'dinner'>;

export default function DailyMealCard({ dailyPlan, onDeleteMeal, onAddMeal }: DailyMealCardProps) {
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner'];

  const renderMealSlot = (mealType: MealType, meal: Meal | null) => {
    const mealTitle = mealType.charAt(0).toUpperCase() + mealType.slice(1);
    if (meal) {
      return (
        <MealItemCard
          mealType={mealTitle}
          meal={meal}
          onDelete={() => onDeleteMeal(dailyPlan.day, mealType)}
        />
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 border border-dashed rounded-md bg-muted/50">
        <p className="text-sm text-muted-foreground mb-2">{mealTitle} slot empty</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddMeal(dailyPlan.day, mealType)}
          className="text-primary border-primary hover:bg-primary/10"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add {mealTitle}
        </Button>
      </div>
    );
  };

  return (
    <Card className="w-full shadow-md bg-card/90 backdrop-blur-sm">
      <CardHeader className="border-b py-3 px-4">
        <CardTitle className="text-xl font-semibold text-primary flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          {dailyPlan.day}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {renderMealSlot('breakfast', dailyPlan.breakfast)}
        {renderMealSlot('lunch', dailyPlan.lunch)}
        {renderMealSlot('dinner', dailyPlan.dinner)}
      </CardContent>
    </Card>
  );
}
