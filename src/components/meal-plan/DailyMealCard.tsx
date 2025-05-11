
"use client";

import type { DailyMealPlan, Meal } from "@/ai/flows/generate-weekly-meal-plan";
import MealItemCard from "./MealItemCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, PlusCircle } from "lucide-react";

type MealTypeKey = keyof Pick<DailyMealPlan, 'breakfast' | 'lunch' | 'dinner'>;

interface DailyMealCardProps {
  dailyPlan: DailyMealPlan;
  onDeleteMeal: (day: string, mealTypeKey: MealTypeKey, recipeIndex: number) => void;
  onAddMeal: (day: string, mealTypeKey: MealTypeKey) => void;
}

export default function DailyMealCard({ dailyPlan, onDeleteMeal, onAddMeal }: DailyMealCardProps) {
  const mealTypes: Array<{ key: MealTypeKey; title: string }> = [
    { key: 'breakfast', title: 'Breakfast' },
    { key: 'lunch', title: 'Lunch' },
    { key: 'dinner', title: 'Dinner' },
  ];

  const renderMealSlot = (mealTypeKey: MealTypeKey, mealTypeTitle: string, meals: Meal[] = []) => {
    return (
      <div key={mealTypeKey} className="flex flex-col space-y-2 p-2 border rounded-lg bg-card/70 shadow-inner min-h-[120px]">
        <h4 className="font-medium text-sm text-center text-primary capitalize">{mealTypeTitle}</h4>
        {meals.length > 0 ? (
          <div className="space-y-1.5">
            {meals.map((meal, index) => (
              <MealItemCard
                key={`${meal.recipeName}-${index}-${dailyPlan.day}-${mealTypeKey}`} 
                mealType={mealTypeTitle}
                meal={meal}
                onDelete={() => onDeleteMeal(dailyPlan.day, mealTypeKey, index)}
                // onEdit prop can be added here if edit functionality is implemented
              />
            ))}
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-xs text-muted-foreground italic">No {mealTypeTitle.toLowerCase()} planned.</p>
          </div>
        )}
        <Button
          variant="outline"
          size="xs" 
          onClick={() => onAddMeal(dailyPlan.day, mealTypeKey)}
          className="text-primary border-primary hover:bg-primary/10 w-full mt-auto py-1 text-xs h-7 rounded-md px-2" 
        >
          <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
          Add {mealTypeTitle}
        </Button>
      </div>
    );
  };

  return (
    <Card className="w-full shadow-md bg-card/90 backdrop-blur-sm">
      <CardHeader className="border-b py-2.5 px-3">
        <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          {dailyPlan.day}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 md:p-3 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
        {mealTypes.map(mealTypeInfo =>
          renderMealSlot(
            mealTypeInfo.key,
            mealTypeInfo.title,
            dailyPlan[mealTypeInfo.key] || [] 
          )
        )}
      </CardContent>
    </Card>
  );
}
