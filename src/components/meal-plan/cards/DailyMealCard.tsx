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
  onAddMeal: (day: string, mealTypeKey: MealTypeKey, mealTypeTitle: string) => void;
}

export default function DailyMealCard({ dailyPlan, onDeleteMeal, onAddMeal }: DailyMealCardProps) {
  const mealTypes: Array<{ key: MealTypeKey; title: string }> = [
    { key: 'breakfast', title: '早餐' },
    { key: 'lunch', title: '午餐' },
    { key: 'dinner', title: '晚餐' },
  ];

  const renderMealSlot = (mealTypeKey: MealTypeKey, mealTypeTitle: string, meals: Meal[] = []) => {
    // mealTypeTitle is already Chinese here
    return (
      <div key={`${dailyPlan.day}-${mealTypeKey}`} className="flex flex-col space-y-2 p-2 border rounded-lg bg-card/70 shadow-inner min-h-[120px]">
        <h4 className="font-medium text-sm text-center text-primary capitalize">{mealTypeTitle}</h4>
        {meals.length > 0 ? (
          <div className="space-y-1.5">
            {meals.map((meal, index) => (
              <MealItemCard
                key={`${meal.recipeName}-${index}-${dailyPlan.day}-${mealTypeKey}`} 
                meal={meal}
                onDelete={() => onDeleteMeal(dailyPlan.day, mealTypeKey, index)}
              />
            ))}
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-xs text-muted-foreground italic">未计划{mealTypeTitle}。</p>
          </div>
        )}
        <Button
          variant="outline"
          size="sm" 
          onClick={() => onAddMeal(dailyPlan.day, mealTypeKey, mealTypeTitle)} // Pass Chinese title for context
          className="text-primary border-primary hover:bg-primary/10 w-full mt-auto py-1 text-xs h-7 rounded-md px-2" 
        >
          <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
          添加{mealTypeTitle}
        </Button>
      </div>
    );
  };

  return (
    <Card className="w-full shadow-md bg-card/90 backdrop-blur-sm">
      <CardHeader className="border-b py-2.5 px-3">
        <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          {dailyPlan.day} {/* This comes from AI, should be Chinese if AI outputs Chinese */}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 md:p-3 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
        {mealTypes.map(mealTypeInfo =>
          renderMealSlot(
            mealTypeInfo.key,
            mealTypeInfo.title, // Use Chinese title here
            dailyPlan[mealTypeInfo.key] || [] 
          )
        )}
      </CardContent>
    </Card>
  );
}