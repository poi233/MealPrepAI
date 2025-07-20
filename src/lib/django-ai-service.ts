'use client';

import { ApiClient } from './api-client';
import type { Recipe } from './django-recipe-service';
import type { MealPlan } from './django-meal-plans';

export interface GenerateRecipeDetailsRequest {
  query: string;
  dietary_restrictions?: string[];
  cuisine_preference?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  prep_time_max?: number;
  cook_time_max?: number;
  servings?: number;
}

export interface CreateRecipeFromAIRequest {
  ai_generated_data: {
    name: string;
    description?: string;
    ingredients: Array<{
      name: string;
      amount: number;
      unit: string;
      notes?: string;
    }>;
    instructions: string;
    prep_time?: number;
    cook_time?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    cuisine?: string;
    tags?: string[];
    nutrition_info?: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    };
  };
  user_modifications?: Partial<{
    name: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    cuisine: string;
    tags: string[];
  }>;
}

export interface SuggestRecipeModificationsRequest {
  recipe_id: string;
  modification_type: 'dietary' | 'cuisine' | 'difficulty' | 'time' | 'ingredients';
  specific_request?: string;
  dietary_restrictions?: string[];
  target_cuisine?: string;
  target_difficulty?: 'easy' | 'medium' | 'hard';
  time_constraints?: {
    max_prep_time?: number;
    max_cook_time?: number;
  };
  ingredient_substitutions?: Array<{
    original: string;
    substitute: string;
  }>;
}

export interface RecipeSubstitution {
  ingredient: string;
  substitutes: Array<{
    name: string;
    ratio: string;
    notes?: string;
  }>;
}

export interface GenerateMealPlanRequest {
  preferences?: string[];
  dietary_restrictions?: string[];
  cuisine_preferences?: string[];
  cooking_experience?: 'beginner' | 'intermediate' | 'advanced';
  time_constraints?: {
    breakfast_max_time?: number;
    lunch_max_time?: number;
    dinner_max_time?: number;
  };
  servings?: number;
  days?: number;
  include_snacks?: boolean;
  exclude_recipes?: string[];
  budget_consideration?: 'low' | 'medium' | 'high';
}

export interface AnalyzeMealPlanRequest {
  meal_plan_id: string;
  focus_areas?: string[];
}

export interface ShoppingListItem {
  ingredient: string;
  amount: number;
  unit: string;
  recipes: string[];
  category?: string;
  estimated_cost?: number;
}

/**
 * AI service for Django backend
 */
export class DjangoAIService {
  /**
   * Generate recipe details using AI
   */
  static async generateRecipeDetails(request: GenerateRecipeDetailsRequest): Promise<Recipe> {
    try {
      return await ApiClient.post<Recipe>('/ai/generate-recipe-details/', request);
    } catch (error) {
      throw this.handleError(error, 'Failed to generate recipe details');
    }
  }

  /**
   * Create a recipe from AI-generated data
   */
  static async createRecipeFromAI(request: CreateRecipeFromAIRequest): Promise<Recipe> {
    try {
      return await ApiClient.post<Recipe>('/ai/create-recipe-from-ai/', request);
    } catch (error) {
      throw this.handleError(error, 'Failed to create recipe from AI data');
    }
  }

  /**
   * Suggest modifications for an existing recipe
   */
  static async suggestRecipeModifications(
    request: SuggestRecipeModificationsRequest
  ): Promise<{ suggestions: any; modified_recipe?: Recipe }> {
    try {
      return await ApiClient.post<{ suggestions: any; modified_recipe?: Recipe }>(
        '/ai/suggest-recipe-modifications/',
        request
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to suggest recipe modifications');
    }
  }

  /**
   * Get ingredient substitutions for a recipe
   */
  static async getRecipeSubstitutions(recipeId: string): Promise<RecipeSubstitution[]> {
    try {
      const response = await ApiClient.get<{ substitutions: RecipeSubstitution[] }>(
        `/ai/suggest-recipe-substitutions/${recipeId}/`
      );
      return response.substitutions;
    } catch (error) {
      throw this.handleError(error, 'Failed to get recipe substitutions');
    }
  }

  /**
   * Generate a meal plan using AI
   */
  static async generateMealPlan(request: GenerateMealPlanRequest): Promise<MealPlan> {
    try {
      return await ApiClient.post<MealPlan>('/ai/generate-meal-plan/', request);
    } catch (error) {
      throw this.handleError(error, 'Failed to generate meal plan');
    }
  }

  /**
   * Analyze a meal plan
   */
  static async analyzeMealPlan(request: AnalyzeMealPlanRequest): Promise<{ analysis: string }> {
    try {
      return await ApiClient.post<{ analysis: string }>(
        '/ai/analyze-meal-plan/',
        request
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to analyze meal plan');
    }
  }

  /**
   * Generate shopping list for a meal plan
   */
  static async generateShoppingList(mealPlanId: string): Promise<ShoppingListItem[]> {
    try {
      const response = await ApiClient.get<{ shopping_list: ShoppingListItem[] }>(
        `/ai/generate-shopping-list/${mealPlanId}/`
      );
      return response.shopping_list;
    } catch (error) {
      throw this.handleError(error, 'Failed to generate shopping list');
    }
  }

  /**
   * Validate generate recipe request
   */
  static validateGenerateRecipeRequest(request: GenerateRecipeDetailsRequest): string[] {
    const errors: string[] = [];

    if (!request.query || request.query.trim() === '') {
      errors.push('Recipe query is required');
    }

    if (request.difficulty && !['easy', 'medium', 'hard'].includes(request.difficulty)) {
      errors.push('Invalid difficulty level');
    }

    if (request.prep_time_max !== undefined && request.prep_time_max < 0) {
      errors.push('Prep time cannot be negative');
    }

    if (request.cook_time_max !== undefined && request.cook_time_max < 0) {
      errors.push('Cook time cannot be negative');
    }

    if (request.servings !== undefined && request.servings < 1) {
      errors.push('Servings must be at least 1');
    }

    return errors;
  }

  /**
   * Validate generate meal plan request
   */
  static validateGenerateMealPlanRequest(request: GenerateMealPlanRequest): string[] {
    const errors: string[] = [];

    if (request.cooking_experience && !['beginner', 'intermediate', 'advanced'].includes(request.cooking_experience)) {
      errors.push('Invalid cooking experience level');
    }

    if (request.servings !== undefined && request.servings < 1) {
      errors.push('Servings must be at least 1');
    }

    if (request.days !== undefined && (request.days < 1 || request.days > 14)) {
      errors.push('Days must be between 1 and 14');
    }

    if (request.budget_consideration && !['low', 'medium', 'high'].includes(request.budget_consideration)) {
      errors.push('Invalid budget consideration');
    }

    return errors;
  }

  /**
   * Handle API errors
   */
  private static handleError(error: any, defaultMessage: string): Error {
    if (error && error.message) {
      return new Error(error.message);
    }
    
    return error instanceof Error ? error : new Error(defaultMessage);
  }
}