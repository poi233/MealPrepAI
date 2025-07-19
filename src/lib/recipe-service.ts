'use client';

import type { Recipe } from '@/types/database.types';

export interface RecipeUpdateData {
  name?: string;
  description?: string;
  ingredients?: Array<{
    name: string;
    amount: number;
    unit: string;
    notes?: string;
  }>;
  instructions?: string;
  prepTime?: number;
  cookTime?: number;
  difficulty?: string;
  cuisine?: string;
  tags?: string[];
  nutritionInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  imageUrl?: string;
}

export interface RecipeDeleteOptions {
  removeFromMealPlans?: boolean;
}

export interface RecipeDeleteError {
  error: string;
  canForceDelete?: boolean;
}

/**
 * Client-side service for recipe CRUD operations
 */
export class RecipeService {
  private static baseUrl = '/api/recipes';

  /**
   * Get a recipe by ID
   */
  static async getRecipe(id: string): Promise<Recipe> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch recipe');
    }
    
    return response.json();
  }

  /**
   * Update a recipe
   */
  static async updateRecipe(id: string, updates: RecipeUpdateData): Promise<Recipe> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update recipe');
    }
    
    return response.json();
  }

  /**
   * Delete a recipe
   */
  static async deleteRecipe(id: string, options: RecipeDeleteOptions = {}): Promise<void> {
    const url = new URL(`${this.baseUrl}/${id}`, window.location.origin);
    if (options.removeFromMealPlans) {
      url.searchParams.set('removeFromMealPlans', 'true');
    }

    const response = await fetch(url.toString(), {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error: RecipeDeleteError = await response.json();
      
      // Special handling for conflict status (recipe used in meal plans)
      if (response.status === 409) {
        const conflictError = new Error(error.error) as Error & { canForceDelete?: boolean };
        conflictError.canForceDelete = error.canForceDelete;
        throw conflictError;
      }
      
      throw new Error(error.error || 'Failed to delete recipe');
    }
  }

  /**
   * Get recipes created by current user
   */
  static async getUserRecipes(limit: number = 50, offset: number = 0): Promise<{ recipes: Recipe[]; total: number }> {
    const response = await fetch(`${this.baseUrl}?userOnly=true&limit=${limit}&offset=${offset}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user recipes');
    }
    
    return response.json();
  }

  /**
   * Check if current user can edit a recipe
   */
  static canEditRecipe(recipe: Recipe, currentUserId?: string): boolean {
    return !!(recipe.createdByUserId && currentUserId && recipe.createdByUserId === currentUserId);
  }

  /**
   * Validate recipe data before submission
   */
  static validateRecipeData(data: RecipeUpdateData): string[] {
    const errors: string[] = [];

    if (data.name !== undefined && (!data.name || data.name.trim() === '')) {
      errors.push('Recipe name is required');
    }

    if (data.ingredients !== undefined && (!Array.isArray(data.ingredients) || data.ingredients.length === 0)) {
      errors.push('Recipe must have at least one ingredient');
    }

    if (data.instructions !== undefined && (!data.instructions || data.instructions.trim() === '')) {
      errors.push('Recipe instructions are required');
    }

    if (data.difficulty !== undefined && !['easy', 'medium', 'hard'].includes(data.difficulty)) {
      errors.push('Invalid difficulty level');
    }

    if (data.prepTime !== undefined && data.prepTime < 0) {
      errors.push('Prep time cannot be negative');
    }

    if (data.cookTime !== undefined && data.cookTime < 0) {
      errors.push('Cook time cannot be negative');
    }

    return errors;
  }
}