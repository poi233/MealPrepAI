"use server";

import { generateWeeklyMealPlan, type GenerateWeeklyMealPlanInput, type GenerateWeeklyMealPlanOutput } from "@/ai/flows/generate-weekly-meal-plan";
import { saveMealPlanToDb, getMealPlanByPreferencesFromDb } from "@/lib/db";

export async function generateMealPlanAction(
  input: GenerateWeeklyMealPlanInput
): Promise<GenerateWeeklyMealPlanOutput | { error: string }> {
  try {
    if (!input.dietaryPreferences || input.dietaryPreferences.trim() === "") {
      return { error: "Dietary preferences cannot be empty." };
    }
    
    const result = await generateWeeklyMealPlan(input);
    if (!result || !result.weeklyMealPlan) {
        return { error: "Failed to generate meal plan. The AI returned an unexpected result." };
    }

    // Save to DB after successful generation
    try {
      await saveMealPlanToDb(input.dietaryPreferences, result);
    } catch (dbError) {
      console.error("Failed to save meal plan to DB after generation:", dbError);
      // Log the DB error. The function will still return the generated plan to the user.
      // For a production app, you might want to add more robust error handling or user notification here.
      // For instance, return a partial success message: "Plan generated but couldn't be saved."
    }

    return result;
  } catch (e) {
    console.error("Error generating meal plan:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while generating the meal plan.";
    return { error: errorMessage };
  }
}

// New action to get saved meal plan from the database
export async function getSavedMealPlanAction(
  dietaryPreferences: string
): Promise<GenerateWeeklyMealPlanOutput | null | { error: string }> {
  if (!dietaryPreferences || dietaryPreferences.trim() === "") {
    // Return null if preferences are empty, as no specific plan can be fetched.
    return null; 
  }
  try {
    const mealPlan = await getMealPlanByPreferencesFromDb(dietaryPreferences);
    return mealPlan; // Returns the meal plan object if found, or null if not.
  } catch (e) {
    console.error("Error fetching saved meal plan from database:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while fetching the saved meal plan.";
    // Return an error object to be handled by the client.
    return { error: errorMessage };
  }
}
