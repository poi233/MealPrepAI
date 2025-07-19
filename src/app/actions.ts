'use server';

import { generateWeeklyMealPlan } from '@/ai/flows/generate-weekly-meal-plan';
import { createRecipe } from '@/lib/recipes';
import type { Recipe } from '@/types/database.types';

/**
 * Server action to generate recipe details using AI
 */
export async function generateRecipeDetailsAction(recipeName: string, mealType: string) {
  try {
    // Generate a meal plan with just one recipe to get detailed recipe info
    const planDescription = `请为${mealType}生成一个详细的${recipeName}食谱，包括完整的配料清单和详细的制作步骤。`;

    const result = await generateWeeklyMealPlan({
      planDescription
    });

    // Extract the first recipe from the generated plan
    const weeklyPlan = result.weeklyMealPlan;
    for (const day of weeklyPlan) {
      const meals = [...day.breakfast, ...day.lunch, ...day.dinner];
      const recipe = meals.find(meal =>
        meal.recipeName.toLowerCase().includes(recipeName.toLowerCase())
      );

      if (recipe) {
        return {
          success: true,
          recipe: {
            name: recipe.recipeName,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions
          }
        };
      }
    }

    // If no matching recipe found, return the first available recipe
    for (const day of weeklyPlan) {
      const meals = [...day.breakfast, ...day.lunch, ...day.dinner];
      if (meals.length > 0) {
        const recipe = meals[0];
        return {
          success: true,
          recipe: {
            name: recipe.recipeName,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions
          }
        };
      }
    }

    return {
      success: false,
      error: 'Failed to generate recipe details'
    };
  } catch (error) {
    console.error('Error generating recipe details:', error);
    return {
      success: false,
      error: 'Failed to generate recipe details'
    };
  }
}

/**
 * Server action to suggest recipes based on meal type and preferences
 */
export async function suggestRecipeAction(mealType: string, preferences?: string) {
  try {
    const planDescription = preferences
      ? `请为${mealType}推荐一些食谱，考虑以下偏好：${preferences}`
      : `请为${mealType}推荐一些健康美味的食谱`;

    const result = await generateWeeklyMealPlan({
      planDescription
    });

    // Extract recipes from the generated plan
    const suggestions = [];
    const weeklyPlan = result.weeklyMealPlan;

    for (const day of weeklyPlan) {
      let meals = [];
      if (mealType === 'breakfast') meals = day.breakfast;
      else if (mealType === 'lunch') meals = day.lunch;
      else if (mealType === 'dinner') meals = day.dinner;
      else meals = [...day.breakfast, ...day.lunch, ...day.dinner];

      for (const meal of meals) {
        if (meal && meal.recipeName) {
          suggestions.push({
            name: meal.recipeName,
            ingredients: meal.ingredients,
            instructions: meal.instructions
          });
        }
      }
    }

    return {
      success: true,
      suggestions: suggestions.slice(0, 5) // Return top 5 suggestions
    };
  } catch (error) {
    console.error('Error suggesting recipes:', error);
    return {
      success: false,
      error: 'Failed to suggest recipes'
    };
  }
}