"use client";

import type React from 'react';
import { createContext, useContext, useState } from 'react';
import type { GenerateWeeklyMealPlanOutput } from '@/ai/flows/generate-weekly-meal-plan';

// MealPlan now includes its description.
export type MealPlanData = GenerateWeeklyMealPlanOutput & { planDescription: string };
export type MealPlanState = MealPlanData | null;


interface MealPlanContextType {
  mealPlan: MealPlanState; // This is GenerateWeeklyMealPlanOutput & { planDescription: string } | null
  setMealPlan: (plan: MealPlanState) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);

export function MealPlanProvider({ children }: { children: React.ReactNode }) {
  const [mealPlan, setMealPlan] = useState<MealPlanState>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Typically starts false, or true if auto-loading
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
