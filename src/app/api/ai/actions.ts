"use server";

import { generateRecipeDetails, type GenerateRecipeDetailsInput, type GenerateRecipeDetailsOutput } from "@/ai/flows/generate-recipe-details";
import { suggestRecipe, type SuggestRecipeInput, type SuggestRecipeOutput } from "@/ai/flows/suggest-recipe";

export async function generateRecipeDetailsAction(
  input: GenerateRecipeDetailsInput
): Promise<GenerateRecipeDetailsOutput | { error: string }> {
  try {
    if (!input.recipeName || input.recipeName.trim() === "") {
      return { error: "Recipe name is required." };
    }
    const result = await generateRecipeDetails(input);
    if (!result || !result.ingredients || !result.instructions) {
      if (result && 'error' in result) {
        return { error: 'AI Error: ' + String(result.error) };
      }
      return { error: "Failed to generate recipe details. AI returned unexpected result." };
    }
    return result;
  } catch (e) {
    console.error("Error generating recipe details:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error occurred while generating recipe details.";
    return { error: errorMessage };
  }
}

export async function suggestRecipeAction(
  input: SuggestRecipeInput
): Promise<SuggestRecipeOutput | { error: string }> {
  try {
    if (!input.day || input.day.trim() === "") {
      return { error: "Day is required for recipe suggestion." };
    }
    if (!input.mealType || input.mealType.trim() === "") {
      return { error: "Meal type is required for recipe suggestion." };
    }
    if (!input.planDescription || input.planDescription.trim() === "") {
      return { error: "Plan description is required for recipe suggestion." };
    }
    const result = await suggestRecipe(input);
     if (!result || !result.recipeName || !result.ingredients || !result.instructions) {
      if (result && 'error' in result) {
        return { error: 'AI Error: ' + String(result.error) };
      }
      return { error: "Failed to suggest recipe. AI returned unexpected result." };
    }
    return result;
  } catch (e) {
    console.error("Error suggesting recipe:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error occurred while suggesting recipe.";
    return { error: errorMessage };
  }
}