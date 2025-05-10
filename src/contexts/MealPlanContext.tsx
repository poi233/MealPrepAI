"use client";

import type React from 'react';
import { createContext, useContext, useState } from 'react';
import type { GenerateWeeklyMealPlanOutput } from '@/ai/flows/generate-weekly-meal-plan';

interface MealPlanContextType {
  mealPlan: GenerateWeeklyMealPlanOutput | null;
  setMealPlan: (plan: GenerateWeeklyMealPlanOutput | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);

export function MealPlanProvider({ children }: { children: React.ReactNode }) {
  const [mealPlan, setMealPlan] = useState<GenerateWeeklyMealPlanOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <MealPlanContext.Provider value={{ mealPlan, setMealPlan, isLoading, setIsLoading, error, setError }}>
      {children}
    </MealPlanContext.Provider>
  );
}

export function useMealPlan() {
  const context = useContext(MealPlanContext);
  if (context === undefined) {
    throw new Error('useMealPlan must be used within a MealPlanProvider');
  }
  return context;
}
