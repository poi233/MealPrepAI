"use server";

import { generateWeeklyMealPlan, type GenerateWeeklyMealPlanInput, type GenerateWeeklyMealPlanOutput } from "@/ai/flows/generate-weekly-meal-plan";

export async function generateMealPlanAction(
  input: GenerateWeeklyMealPlanInput
): Promise<GenerateWeeklyMealPlanOutput | { error: string }> {
  try {
    // Basic validation, can be expanded with Zod if needed here too
    if (!input.dietaryPreferences || input.dietaryPreferences.trim() === "") {
      return { error: "Dietary preferences cannot be empty." };
    }
    
    const result = await generateWeeklyMealPlan(input);
    if (!result || !result.weeklyMealPlan) {
        return { error: "Failed to generate meal plan. The AI returned an unexpected result." };
    }
    return result;
  } catch (e) {
    console.error("Error generating meal plan:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while generating the meal plan.";
    return { error: errorMessage };
  }
}
