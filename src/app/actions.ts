
"use server";

import { generateWeeklyMealPlan, type GenerateWeeklyMealPlanInput, type GenerateWeeklyMealPlanOutput } from "@/ai/flows/generate-weekly-meal-plan";
import { generateRecipeDetails, type GenerateRecipeDetailsInput, type GenerateRecipeDetailsOutput } from "@/ai/flows/generate-recipe-details";
import { suggestRecipe, type SuggestRecipeInput, type SuggestRecipeOutput } from "@/ai/flows/suggest-recipe";
import { 
  saveMealPlanToDb as saveMealPlanToDbInternal, 
  getMealPlanByNameFromDb,
  deleteMealPlanFromDbByName, 
  getAllMealPlanNamesFromDb,
  getActiveMealPlanFromDb,
  setActivePlanInDb
} from "@/lib/db";

export interface GenerateMealPlanActionInput {
  planName: string;
  planDescription: string;
}

export async function generateMealPlanAction(
  input: GenerateMealPlanActionInput
): Promise<GenerateWeeklyMealPlanOutput | { error: string }> {
  try {
    if (!input.planName || input.planName.trim() === "") {
      return { error: "Plan name cannot be empty." };
    }
    if (!input.planDescription || input.planDescription.trim() === "") {
      return { error: "Plan description cannot be empty." };
    }
    
    const aiInput: GenerateWeeklyMealPlanInput = { planDescription: input.planDescription };
    const result = await generateWeeklyMealPlan(aiInput);

    if (!result || !result.weeklyMealPlan) {
        if (result && (result as any).error) {
             return { error: `AI Error: ${(result as any).error}` };
        }
        return { error: "Failed to generate meal plan. The AI returned an unexpected result or no plan." };
    }
     if (result.weeklyMealPlan.length === 0) {
        return { error: "The AI generated an empty meal plan. Try refining your plan description." };
    }

    try {
      // Save with planName and planDescription
      await saveMealPlanToDbInternal(input.planName, input.planDescription, result);
      // After saving, set this plan as active
      await setActivePlanInDb(input.planName);
    } catch (dbError) {
      console.error("Failed to save meal plan to DB or set active after generation:", dbError);
      // Don't return dbError to client directly, it might contain sensitive info.
      return { error: "Failed to save the generated meal plan."};
    }

    return result;
  } catch (e) {
    console.error("Error generating meal plan:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while generating the meal plan.";
    return { error: errorMessage };
  }
}

export async function getSavedMealPlanByNameAction(
  planName: string
): Promise<{ mealPlanData: GenerateWeeklyMealPlanOutput; planDescription: string; isActive: boolean } | null | { error: string }> {
  if (!planName || planName.trim() === "") {
    return null; 
  }
  try {
    const mealPlanData = await getMealPlanByNameFromDb(planName);
    if (mealPlanData === null) {
      return null; 
    }
    return mealPlanData; 
  } catch (e) {
    console.error("Error fetching saved meal plan from database:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while fetching the saved meal plan.";
    return { error: errorMessage };
  }
}

export async function deleteMealPlanByNameAction(
  planName: string
): Promise<{ success: boolean; error?: string }> {
  if (!planName || planName.trim() === "") {
    return { success: false, error: "Plan name cannot be empty." };
  }
  try {
    await deleteMealPlanFromDbByName(planName);
    return { success: true };
  } catch (e) {
    console.error("Error deleting meal plan from database:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while deleting the meal plan.";
    return { success: false, error: errorMessage };
  }
}

// This function is for direct DB interaction, keeping planName and planDescription separate.
export async function saveMealPlanToDb(
  planName: string, 
  planDescription: string,
  mealPlanData: GenerateWeeklyMealPlanOutput
): Promise<void> {
  if (!planName || planName.trim() === "") {
    throw new Error("Plan name cannot be empty when saving a meal plan.");
  }
  if (!planDescription || planDescription.trim() === "") {
    // Allowing empty description for now, but might want to enforce it
    // throw new Error("Plan description cannot be empty when saving a meal plan.");
  }
  if (!mealPlanData || !mealPlanData.weeklyMealPlan) {
    throw new Error("Meal plan data is invalid or empty.");
  }
  try {
    await saveMealPlanToDbInternal(planName, planDescription, mealPlanData);
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

export async function suggestRecipeAction(
  input: SuggestRecipeInput
): Promise<SuggestRecipeOutput | { error: string }> {
  try {
    if (!input.day || input.day.trim() === "") {
      return { error: "Day cannot be empty for recipe suggestion." };
    }
    if (!input.mealType || input.mealType.trim() === "") {
      return { error: "Meal type cannot be empty for recipe suggestion." };
    }
    if (!input.planDescription || input.planDescription.trim() === "") {
      return { error: "Plan description cannot be empty for recipe suggestion." };
    }
    const result = await suggestRecipe(input);
     if (!result || !result.recipeName || !result.ingredients || !result.instructions) {
      if (result && (result as any).error) {
        return { error: `AI Error: ${(result as any).error}` };
      }
      return { error: "Failed to suggest a recipe. The AI returned an unexpected result." };
    }
    return result;
  } catch (e) {
    console.error("Error suggesting recipe:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while suggesting a recipe.";
    return { error: errorMessage };
  }
}


export async function getAllSavedMealPlanNamesAction(): Promise<string[] | { error: string }> {
  try {
    const names = await getAllMealPlanNamesFromDb();
    return names;
  } catch (e) {
    console.error("Error fetching all saved meal plan names:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while fetching plan names.";
    return { error: errorMessage };
  }
}

export async function getActiveMealPlanAction(): Promise<{ planName: string; planDescription: string; mealPlanData: GenerateWeeklyMealPlanOutput } | null | { error: string }> {
  try {
    const activePlan = await getActiveMealPlanFromDb();
    return activePlan;
  } catch (e) {
    console.error("Error fetching active meal plan:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while fetching the active plan.";
    return { error: errorMessage };
  }
}

export async function setActivePlanAction(planName: string): Promise<{ success: boolean; error?: string }> {
  // Allow planName to be an empty string to signify clearing the active plan.
  // The UserProfileContext ensures planName is either a normalized string or "".
  try {
    await setActivePlanInDb(planName);
    return { success: true };
  } catch (e) {
    console.error(`Error setting active plan status for "${planName}":`, e);
    const errorMessage = e instanceof Error ? e.message : `An unknown error occurred while setting active plan status for "${planName}".`;
    return { success: false, error: errorMessage };
  }
}
