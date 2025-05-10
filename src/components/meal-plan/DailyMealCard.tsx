"use client";

import type { DailyMealPlanSchema as DailyMealPlan } from "@/ai/flows/generate-weekly-meal-plan"; // Assuming schema is exported or define it here
import MealItemCard from "./MealItemCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

interface DailyMealData { // Duplicating for safety / client-side extensions
    day: string;
    breakfast: { mealName: string; recipeName: string; ingredients: string[]; instructions: string; };
    lunch: { mealName: string; recipeName: string; ingredients: string[]; instructions: string; };
    dinner: { mealName: string; recipeName: string; ingredients: string[]; instructions: string; };
}
interface DailyMealCardProps {
  dailyPlan: DailyMealData;
}

export default function DailyMealCard({ dailyPlan }: DailyMealCardProps) {
  return (
    <Card className="w-full shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
          <CalendarDays className="h-7 w-7"/>
          {dailyPlan.day}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <MealItemCard mealType="Breakfast" meal={dailyPlan.breakfast} />
        <MealItemCard mealType="Lunch" meal={dailyPlan.lunch} />
        <MealItemCard mealType="Dinner" meal={dailyPlan.dinner} />
      </CardContent>
    </Card>
  );
}
