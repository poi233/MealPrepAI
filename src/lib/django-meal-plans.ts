'use client';

import { ApiClient, ApiClientError } from './api-client';
import type { Recipe } from './django-recipe-service';

export interface MealPlan {
  id: string;
  name: string;
  description?: string;
  plan_description?: string;
  analysis_text?: string;
  week_start_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items: MealPlanItem[];
}

export interface MealPlanItem {
  id: string;
  day_of_week: number; // 0 = Monday, 6 = Sunday
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe: Recipe;
  servings: number;
  notes?: string;
  position: number;
}

export interface MealPlanCreateData {
  name: string;
  description?: string;
  week_start_date: string;
}

export interface MealPlanUpdateData {
  name?: string;
  description?: string;
  plan_description?: string;
  analysis_text?: string;
  week_start_date?: string;
  is_active?: boolean;
}

export interface MealPlanItemCreateData {
  day_of_week: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe_id: string;
  servings: number;
  notes?: string;
  position?: number;
}

export interface MealPlanItemUpdateData {
  recipe_id?: string;
  servings?: number;
  notes?: string;
  position?: number;
}

export interface MealPlanListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: MealPlan[];
}

export interface GenerateMealPlanRequest {
  preferences?: string[];
  dietary_restrictions?: string[];
  cuisine_preferences?: string[];
  cooking_experience?: string;
  time_constraints?: {
    breakfast_max_time?: number;
    lunch_max_time?: number;
    dinner_max_time?: number;
  };
  servings?: number;
  days?: number;
  include_snacks?: boolean;
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
}

/**
 * Meal Plans service for Django backend
 */
export class DjangoMealPlansService {
  /**
   * Get all meal plans for the user
   */
  static async getMealPlans(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
    ordering?: string;
  }): Promise<MealPlanListResponse> {
    try {
      const queryParams: Record<string, any> = {};
      
      if (params?.page) queryParams.page = params.page;
      if (params?.page_size) queryParams.page_size = params.page_size;
      if (params?.search) queryParams.search = params.search;
      if (params?.is_active !== undefined) queryParams.is_active = params.is_active;
      if (params?.ordering) queryParams.ordering = params.ordering;

      return await ApiClient.get<MealPlanListResponse>('/meal-plans/', queryParams);
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch meal plans');
    }
  }

  /**
   * Get a single meal plan by ID
   */
  static async getMealPlan(id: string): Promise<MealPlan> {
    try {
      return await ApiClient.get<MealPlan>(`/meal-plans/${id}/`);
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch meal plan');
    }
  }

  /**
   * Create a new meal plan
   */
  static async createMealPlan(data: MealPlanCreateData): Promise<MealPlan> {
    try {
      return await ApiClient.post<MealPlan>('/meal-plans/', data);
    } catch (error) {
      throw this.handleError(error, 'Failed to create meal plan');
    }
  }

  /**
   * Update an existing meal plan
   */
  static async updateMealPlan(id: string, data: MealPlanUpdateData): Promise<MealPlan> {
    try {
      return await ApiClient.patch<MealPlan>(`/meal-plans/${id}/`, data);
    } catch (error) {
      throw this.handleError(error, 'Failed to update meal plan');
    }
  }

  /**
   * Delete a meal plan
   */
  static async deleteMealPlan(id: string): Promise<void> {
    try {
      await ApiClient.delete(`/meal-plans/${id}/`);
    } catch (error) {
      throw this.handleError(error, 'Failed to delete meal plan');
    }
  }

  /**
   * Activate a meal plan (deactivates others)
   */
  static async activateMealPlan(id: string): Promise<MealPlan> {
    try {
      return await ApiClient.post<MealPlan>(`/meal-plans/${id}/activate/`);
    } catch (error) {
      throw this.handleError(error, 'Failed to activate meal plan');
    }
  }

  /**
   * Deactivate a meal plan
   */
  static async deactivateMealPlan(id: string): Promise<MealPlan> {
    try {
      return await ApiClient.post<MealPlan>(`/meal-plans/${id}/deactivate/`);
    } catch (error) {
      throw this.handleError(error, 'Failed to deactivate meal plan');
    }
  }

  /**
   * Get the currently active meal plan
   */
  static async getActiveMealPlan(): Promise<MealPlan | null> {
    try {
      return await ApiClient.get<MealPlan>('/meal-plans/active/');
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        return null;
      }
      throw this.handleError(error, 'Failed to fetch active meal plan');
    }
  }

  /**
   * Analyze a meal plan
   */
  static async analyzeMealPlan(request: AnalyzeMealPlanRequest): Promise<{ analysis: string }> {
    try {
      return await ApiClient.post<{ analysis: string }>(`/meal-plans/${request.meal_plan_id}/analyze/`, {
        focus_areas: request.focus_areas
      });
    } catch (error) {
      throw this.handleError(error, 'Failed to analyze meal plan');
    }
  }

  /**
   * Add item to meal plan
   */
  static async addMealPlanItem(mealPlanId: string, data: MealPlanItemCreateData): Promise<MealPlanItem> {
    try {
      return await ApiClient.post<MealPlanItem>(`/meal-plans/${mealPlanId}/items/`, data);
    } catch (error) {
      throw this.handleError(error, 'Failed to add meal plan item');
    }
  }

  /**
   * Update meal plan item
   */
  static async updateMealPlanItem(
    mealPlanId: string,
    dayOfWeek: number,
    mealType: string,
    data: MealPlanItemUpdateData
  ): Promise<MealPlanItem> {
    try {
      return await ApiClient.patch<MealPlanItem>(
        `/meal-plans/${mealPlanId}/items/${dayOfWeek}/${mealType}/`,
        data
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to update meal plan item');
    }
  }

  /**
   * Remove meal plan item
   */
  static async removeMealPlanItem(
    mealPlanId: string,
    dayOfWeek: number,
    mealType: string
  ): Promise<void> {
    try {
      await ApiClient.delete(`/meal-plans/${mealPlanId}/items/${dayOfWeek}/${mealType}/`);
    } catch (error) {
      throw this.handleError(error, 'Failed to remove meal plan item');
    }
  }

  /**
   * Get meal plan items
   */
  static async getMealPlanItems(mealPlanId: string): Promise<MealPlanItem[]> {
    try {
      const response = await ApiClient.get<{ results: MealPlanItem[] }>(`/meal-plans/${mealPlanId}/items/`);
      return response.results;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch meal plan items');
    }
  }

  /**
   * Generate a new meal plan using AI
   */
  static async generateMealPlan(request: GenerateMealPlanRequest): Promise<MealPlan> {
    try {
      return await ApiClient.post<MealPlan>('/ai/generate-meal-plan/', request);
    } catch (error) {
      throw this.handleError(error, 'Failed to generate meal plan');
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
   * Validate meal plan data
   */
  static validateMealPlanData(data: MealPlanCreateData | MealPlanUpdateData): string[] {
    const errors: string[] = [];

    if ('name' in data && (!data.name || data.name.trim() === '')) {
      errors.push('Meal plan name is required');
    }

    if ('week_start_date' in data && data.week_start_date) {
      const startDate = new Date(data.week_start_date);
      if (isNaN(startDate.getTime())) {
        errors.push('Invalid week start date');
      } else {
        // Validate that the date is a Monday
        const dayOfWeek = startDate.getDay();
        if (dayOfWeek !== 1) { // 1 = Monday
          errors.push('Week start date must be a Monday');
        }
      }
    }

    return errors;
  }

  /**
   * Validate meal plan item data
   */
  static validateMealPlanItemData(data: MealPlanItemCreateData | MealPlanItemUpdateData): string[] {
    const errors: string[] = [];

    if ('day_of_week' in data && (data.day_of_week < 0 || data.day_of_week > 6)) {
      errors.push('Day of week must be between 0 and 6');
    }

    if ('meal_type' in data && !['breakfast', 'lunch', 'dinner', 'snack'].includes(data.meal_type)) {
      errors.push('Invalid meal type');
    }

    if ('servings' in data && data.servings !== undefined && data.servings < 1) {
      errors.push('Servings must be at least 1');
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
          }
        });
        
        if (fieldErrors.length > 0) {
          return new Error(fieldErrors.join('; '));
        }
      }
      
      return new Error(error.message || defaultMessage);
    }
    
    return error instanceof Error ? error : new Error(defaultMessage);
  }
}