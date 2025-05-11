
"use server";

import { generateWeeklyMealPlan, type GenerateWeeklyMealPlanInput, type GenerateWeeklyMealPlanOutput } from "@/ai/flows/generate-weekly-meal-plan";
import { saveMealPlanToDb as saveMealPlanToDbInternal, getMealPlanByPreferencesFromDb, deleteMealPlanFromDb } from "@/lib/db";

export async function generateMealPlanAction(
  input: GenerateWeeklyMealPlanInput
): Promise<GenerateWeeklyMealPlanOutput | { error: string }> {
  try {
    if (!input.dietaryPreferences || input.dietaryPreferences.trim() === "") {
      return { error: "Dietary preferences cannot be empty." };
    }
    
    const result = await generateWeeklyMealPlan(input);
    if (!result || !result.weeklyMealPlan) {
        // Check for AI specific error messages if possible (e.g. if result contains an error field from AI)
        if (result && (result as any).error) {
             return { error: `AI Error: ${(result as any).error}` };
        }
        return { error: "Failed to generate meal plan. The AI returned an unexpected result or no plan." };
    }
     if (result.weeklyMealPlan.length === 0) {
        return { error: "The AI generated an empty meal plan. Try refining your preferences." };
    }


    // Save to DB after successful generation
    try {
      await saveMealPlanToDbInternal(input.dietaryPreferences, result);
    } catch (dbError) {
      console.error("Failed to save meal plan to DB after generation:", dbError);
      // Log the DB error. The function will still return the generated plan to the user.
    }

    return result;
  } catch (e) {
    console.error("Error generating meal plan:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while generating the meal plan.";
    return { error: errorMessage };
  }
}

export async function getSavedMealPlanAction(
  dietaryPreferences: string
): Promise<GenerateWeeklyMealPlanOutput | null | { error: string }> {
  if (!dietaryPreferences || dietaryPreferences.trim() === "") {
    return null; 
  }
  try {
    const mealPlan = await getMealPlanByPreferencesFromDb(dietaryPreferences);
    if (mealPlan === null) {
      // Explicitly handle case where no plan is found, not as an error for the client unless it's a true db error.
      return null; 
    }
    return mealPlan; 
  } catch (e) {
    console.error("Error fetching saved meal plan from database:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while fetching the saved meal plan.";
    return { error: errorMessage };
  }
}

export async function deleteMealPlanAction(
  dietaryPreferences: string
): Promise<{ success: boolean; error?: string }> {
  if (!dietaryPreferences || dietaryPreferences.trim() === "") {
    return { success: false, error: "Dietary preferences cannot be empty." };
  }
  try {
    await deleteMealPlanFromDb(dietaryPreferences);
    return { success: true };
  } catch (e) {
    console.error("Error deleting meal plan from database:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while deleting the meal plan.";
    return { success: false, error: errorMessage };
  }
}

// Expose the internal save function for direct use by components if needed after modifications
export async function saveMealPlanToDb(
  dietaryPreferences: string, 
  mealPlanData: GenerateWeeklyMealPlanOutput
): Promise<void> {
  if (!dietaryPreferences || dietaryPreferences.trim() === "") {
    throw new Error("Dietary preferences cannot be empty when saving a meal plan.");
  }
  if (!mealPlanData || !mealPlanData.weeklyMealPlan) {
    throw new Error("Meal plan data is invalid or empty.");
  }
  try {
    await saveMealPlanToDbInternal(dietaryPreferences, mealPlanData);
  } catch (e) {
    console.error("Error in saveMealPlanToDb action:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while saving the meal plan.";
    throw new Error(errorMessage); // Re-throw to be caught by the caller
  }
}
