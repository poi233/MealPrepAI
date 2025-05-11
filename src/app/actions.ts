
"use server";

import { generateWeeklyMealPlan, type GenerateWeeklyMealPlanInput, type GenerateWeeklyMealPlanOutput } from "@/ai/flows/generate-weekly-meal-plan";
import { generateRecipeDetails, type GenerateRecipeDetailsInput, type GenerateRecipeDetailsOutput } from "@/ai/flows/generate-recipe-details";
import { saveMealPlanToDb as saveMealPlanToDbInternal, getMealPlanByPreferencesFromDb, deleteMealPlanFromDb, getAllMealPlanPreferencesFromDb } from "@/lib/db";

export async function generateMealPlanAction(
  input: GenerateWeeklyMealPlanInput
): Promise<GenerateWeeklyMealPlanOutput | { error: string }> {
  try {
    if (!input.dietaryPreferences || input.dietaryPreferences.trim() === "") {
      return { error: "Dietary preferences cannot be empty." };
    }
    
    const result = await generateWeeklyMealPlan(input);
    if (!result || !result.weeklyMealPlan) {
        if (result && (result as any).error) {
             return { error: `AI Error: ${(result as any).error}` };
        }
        return { error: "Failed to generate meal plan. The AI returned an unexpected result or no plan." };
    }
     if (result.weeklyMealPlan.length === 0) {
        return { error: "The AI generated an empty meal plan. Try refining your preferences." };
    }

    try {
      await saveMealPlanToDbInternal(input.dietaryPreferences, result);
    } catch (dbError) {
      console.error("Failed to save meal plan to DB after generation:", dbError);
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
    throw new Error(errorMessage); 
  }
}

export async function generateRecipeDetailsAction(
  input: GenerateRecipeDetailsInput
): Promise<GenerateRecipeDetailsOutput | { error: string }> {
  try {
    if (!input.recipeName || input.recipeName.trim() === "") {
      return { error: "Recipe name cannot be empty." };
    }
    const result = await generateRecipeDetails(input);
    if (!result || !result.ingredients || !result.instructions) {
      if (result && (result as any).error) {
        return { error: `AI Error: ${(result as any).error}` };
      }
      return { error: "Failed to generate recipe details. The AI returned an unexpected result." };
    }
    return result;
  } catch (e) {
    console.error("Error generating recipe details:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while generating recipe details.";
    return { error: errorMessage };
  }
}

export async function getAllSavedMealPlanPreferencesAction(): Promise<string[] | { error: string }> {
  try {
    const preferences = await getAllMealPlanPreferencesFromDb();
    return preferences;
  } catch (e) {
    console.error("Error fetching all saved meal plan preferences:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while fetching preferences.";
    return { error: errorMessage };
  }
}
