'use client';

import { ApiClient, ApiClientError } from './api-client';

export interface Recipe {
  id: string;
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
  total_time?: number;
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
  image_url?: string;
  avg_rating?: number;
  rating_count?: number;
  created_by_user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RecipeCreateData {
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
  image_url?: string;
}

export interface RecipeUpdateData extends Partial<RecipeCreateData> { }

export interface RecipeListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Recipe[];
}

export interface RecipeGenerateRequest {
  name: string;
  description?: string;
  dietary_restrictions?: string[];
  cuisine_preference?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  prep_time_max?: number;
  cook_time_max?: number;
}

export interface RecipeDeleteOptions {
  removeFromMealPlans?: boolean;
}

/**
 * Recipe service for Django backend
 */
export class DjangoRecipeService {
  /**
   * Get all recipes with pagination and filtering
   */
  static async getRecipes(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    cuisine?: string;
    difficulty?: string;
    tags?: string[];
    user_only?: boolean;
    ordering?: string;
  }): Promise<RecipeListResponse> {
    try {
      const queryParams: Record<string, any> = {};

      if (params?.page) queryParams.page = params.page;
      if (params?.page_size) queryParams.page_size = params.page_size;
      if (params?.search) queryParams.search = params.search;
      if (params?.cuisine) queryParams.cuisine = params.cuisine;
      if (params?.difficulty) queryParams.difficulty = params.difficulty;
      if (params?.tags) queryParams.tags = params.tags.join(',');
      if (params?.user_only) queryParams.my_recipes = 'true';  // Use my_recipes parameter
      if (params?.ordering) queryParams.ordering = params.ordering;

      return await ApiClient.get<RecipeListResponse>('/recipes/', queryParams);
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch recipes');
    }
  }

  /**
   * Get a single recipe by ID
   */
  static async getRecipe(id: string): Promise<Recipe> {
    try {
      return await ApiClient.get<Recipe>(`/recipes/${id}/`);
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch recipe');
    }
  }

  /**
   * Create a new recipe
   */
  static async createRecipe(data: RecipeCreateData): Promise<Recipe> {
    try {
      return await ApiClient.post<Recipe>('/recipes/', data);
    } catch (error) {
      throw this.handleError(error, 'Failed to create recipe');
    }
  }

  /**
   * Update an existing recipe
   */
  static async updateRecipe(id: string, data: RecipeUpdateData): Promise<Recipe> {
    try {
      return await ApiClient.patch<Recipe>(`/recipes/${id}/`, data);
    } catch (error) {
      throw this.handleError(error, 'Failed to update recipe');
    }
  }

  /**
   * Delete a recipe
   */
  static async deleteRecipe(id: string): Promise<void> {
    try {
      await ApiClient.delete(`/recipes/${id}/`);
    } catch (error) {
      throw this.handleError(error, 'Failed to delete recipe');
    }
  }

  /**
   * Generate recipe details using AI
   */
  static async generateRecipe(request: RecipeGenerateRequest): Promise<Recipe> {
    try {
      return await ApiClient.post<Recipe>('/ai/generate-recipe-details/', request);
    } catch (error) {
      throw this.handleError(error, 'Failed to generate recipe');
    }
  }

  /**
   * Save an AI-generated recipe to the database
   */
  static async saveAIGeneratedRecipe(recipe: Recipe): Promise<Recipe> {
    try {
      // Ensure all required fields are present with defaults
      const recipeData = {
        name: recipe.name,
        description: recipe.description || '',
        cuisine: recipe.cuisine || 'International',
        difficulty: recipe.difficulty || 'medium',
        prep_time: recipe.prep_time || 15,
        cook_time: recipe.cook_time || 30,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || '',
        nutrition_info: recipe.nutrition_info && Object.keys(recipe.nutrition_info).length > 0
          ? recipe.nutrition_info
          : { calories: 350, protein: 25, carbs: 30, fat: 15 },
        tags: recipe.tags || []
      };

      console.log('Saving recipe data:', JSON.stringify(recipeData, null, 2));

      const saveRequest = {
        ai_recipe_data: recipeData,
        save_to_account: true
      };

      return await ApiClient.post<Recipe>('/ai/create-recipe-from-ai/', saveRequest);
    } catch (error) {
      throw this.handleError(error, 'Failed to save AI-generated recipe');
    }
  }

  /**
   * Generate and save recipe using AI
   */
  static async generateAndSaveRecipe(request: RecipeGenerateRequest): Promise<Recipe> {
    try {
      // First generate the recipe
      const generatedRecipe = await this.generateRecipe(request);

      // Then save it to the database
      return await this.saveAIGeneratedRecipe(generatedRecipe);
    } catch (error) {
      throw this.handleError(error, 'Failed to generate and save recipe');
    }
  }

  /**
   * Get recipes created by current user
   */
  static async getUserRecipes(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    ordering?: string;
  }): Promise<RecipeListResponse> {
    try {
      const queryParams: Record<string, any> = {
        my_recipes: 'true'  // Filter to only user's recipes
      };

      if (params?.page) queryParams.page = params.page;
      if (params?.page_size) queryParams.page_size = params.page_size;
      if (params?.search) queryParams.search = params.search;
      if (params?.ordering) queryParams.ordering = params.ordering;

      console.log('getUserRecipes calling:', '/recipes/', 'with params:', queryParams);
      const response = await ApiClient.get<any>('/recipes/', queryParams);
      console.log('getUserRecipes response:', response);

      // Handle different response formats
      // Backend might return {recipes: [], total: number} or {results: [], count: number}
      const results = response.results || response.recipes || [];
      const count = response.count || response.total || 0;

      return {
        results,
        count,
        next: response.next,
        previous: response.previous
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch user recipes');
    }
  }

  /**
   * Check if current user can edit a recipe
   */
  static canEditRecipe(recipe: Recipe, currentUserId?: string): boolean {
    return !!(recipe.created_by_user_id && currentUserId && recipe.created_by_user_id === currentUserId);
  }

  /**
   * Validate recipe data before submission
   */
  static validateRecipeData(data: RecipeCreateData | RecipeUpdateData): string[] {
    const errors: string[] = [];

    if ('name' in data && (!data.name || data.name.trim() === '')) {
      errors.push('Recipe name is required');
    }

    if ('ingredients' in data && (!Array.isArray(data.ingredients) || data.ingredients.length === 0)) {
      errors.push('Recipe must have at least one ingredient');
    }

    if ('instructions' in data && (!data.instructions || data.instructions.trim() === '')) {
      errors.push('Recipe instructions are required');
    }

    if ('difficulty' in data && data.difficulty && !['easy', 'medium', 'hard'].includes(data.difficulty)) {
      errors.push('Invalid difficulty level');
    }

    if ('prep_time' in data && data.prep_time !== undefined && data.prep_time < 0) {
      errors.push('Prep time cannot be negative');
    }

    if ('cook_time' in data && data.cook_time !== undefined && data.cook_time < 0) {
      errors.push('Cook time cannot be negative');
    }

    return errors;
  }

  /**
   * Handle API errors
   */
  private static handleError(error: any, defaultMessage: string): Error {
    if (error instanceof ApiClientError) {
      if (error.status === 400 && error.response) {
        // Handle validation errors
        const details = error.response;
        const fieldErrors: string[] = [];

        Object.entries(details).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            fieldErrors.push(`${field}: ${messages.join(', ')}`);
          } else if (typeof messages === 'string') {
            fieldErrors.push(`${field}: ${messages}`);
          } else if (messages && typeof messages === 'object') {
            fieldErrors.push(`${field}: ${JSON.stringify(messages)}`);
          }
        });

        if (fieldErrors.length > 0) {
          return new Error(fieldErrors.join('; '));
        }
      }

      // Handle other error responses
      if (error.response && typeof error.response === 'object') {
        if (error.response.error && typeof error.response.error === 'string') {
          return new Error(error.response.error);
        }
        if (error.response.message && typeof error.response.message === 'string') {
          return new Error(error.response.message);
        }
        if (error.response.detail && typeof error.response.detail === 'string') {
          return new Error(error.response.detail);
        }
      }

      return new Error(error.message || defaultMessage);
    }

    // Handle generic errors
    if (error && typeof error === 'object') {
      if (error.message && typeof error.message === 'string') {
        return new Error(error.message);
      }
      if (error.error && typeof error.error === 'string') {
        return new Error(error.error);
      }
      // Fallback for objects without readable message
      return new Error(`${defaultMessage}: ${JSON.stringify(error)}`);
    }

    return error instanceof Error ? error : new Error(defaultMessage);
  }
}