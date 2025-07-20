'use client';

import { ApiClient, ApiClientError } from './api-client';
import type { Recipe } from './django-recipe-service';

export interface Favorite {
  id: string;
  recipe: Recipe;
  personal_rating?: number;
  personal_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  favorites_count: number;
}

export interface FavoriteCreateData {
  recipe_id: string;
  personal_rating?: number;
  personal_notes?: string;
  collection_id?: string;
}

export interface FavoriteUpdateData {
  personal_rating?: number;
  personal_notes?: string;
  collection_id?: string;
}

export interface CollectionCreateData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface FavoriteListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Favorite[];
}

export interface CollectionListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Collection[];
}

/**
 * Favorites service for Django backend
 */
export class DjangoFavoritesService {
  /**
   * Add a recipe to favorites
   */
  static async addToFavorites(data: FavoriteCreateData): Promise<Favorite> {
    try {
      return await ApiClient.post<Favorite>('/favorites/favorites/', data);
    } catch (error) {
      throw this.handleError(error, 'Failed to add recipe to favorites');
    }
  }

  /**
   * Remove a recipe from favorites
   */
  static async removeFromFavorites(favoriteId: string): Promise<void> {
    try {
      await ApiClient.delete(`/favorites/favorites/${favoriteId}/`);
    } catch (error) {
      throw this.handleError(error, 'Failed to remove recipe from favorites');
    }
  }

  /**
   * Remove a recipe from favorites by recipe ID
   */
  static async removeFromFavoritesByRecipeId(recipeId: string): Promise<void> {
    try {
      await ApiClient.delete(`/favorites/recipe/${recipeId}/`);
    } catch (error) {
      throw this.handleError(error, 'Failed to remove recipe from favorites');
    }
  }

  /**
   * Get all user favorites
   */
  static async getUserFavorites(params?: {
    page?: number;
    page_size?: number;
    collection_id?: string;
    search?: string;
    ordering?: string;
  }): Promise<{ favorites: Favorite[]; total: number }> {
    try {
      const queryParams: Record<string, any> = {};
      
      if (params?.page) queryParams.page = params.page;
      if (params?.page_size) queryParams.page_size = params.page_size;
      if (params?.collection_id) queryParams.collection = params.collection_id;
      if (params?.search) queryParams.search = params.search;
      if (params?.ordering) queryParams.ordering = params.ordering;

      const response = await ApiClient.get<FavoriteListResponse>('/favorites/favorites/', queryParams);
      
      return {
        favorites: response.results,
        total: response.count,
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch user favorites');
    }
  }

  /**
   * Get a single favorite by ID
   */
  static async getFavorite(favoriteId: string): Promise<Favorite> {
    try {
      return await ApiClient.get<Favorite>(`/favorites/favorites/${favoriteId}/`);
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch favorite');
    }
  }

  /**
   * Update a favorite
   */
  static async updateFavorite(favoriteId: string, data: FavoriteUpdateData): Promise<Favorite> {
    try {
      return await ApiClient.patch<Favorite>(`/favorites/favorites/${favoriteId}/`, data);
    } catch (error) {
      throw this.handleError(error, 'Failed to update favorite');
    }
  }

  /**
   * Check if a recipe is favorited by the user
   */
  static async isFavorited(recipeId: string): Promise<boolean> {
    try {
      await ApiClient.get(`/favorites/recipe/${recipeId}/`);
      return true;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        return false;
      }
      throw this.handleError(error, 'Failed to check favorite status');
    }
  }

  /**
   * Get favorite status for multiple recipes
   */
  static async getFavoriteStatusForRecipes(recipeIds: string[]): Promise<Record<string, boolean>> {
    try {
      const favoriteStatus: Record<string, boolean> = {};
      
      // Initialize all to false
      recipeIds.forEach(id => {
        favoriteStatus[id] = false;
      });

      // Check each recipe (could be optimized with bulk endpoint if available)
      const promises = recipeIds.map(async (recipeId) => {
        try {
          const isFav = await this.isFavorited(recipeId);
          favoriteStatus[recipeId] = isFav;
        } catch (error) {
          // Keep as false on error
          favoriteStatus[recipeId] = false;
        }
      });

      await Promise.all(promises);
      return favoriteStatus;
    } catch (error) {
      // Return all false on error
      const errorResult: Record<string, boolean> = {};
      recipeIds.forEach(id => {
        errorResult[id] = false;
      });
      return errorResult;
    }
  }

  /**
   * Get favorites count for the user
   */
  static async getFavoritesCount(): Promise<number> {
    try {
      const response = await this.getUserFavorites({ page_size: 1 });
      return response.total;
    } catch (error) {
      console.error('Failed to get favorites count:', error);
      return 0;
    }
  }

  /**
   * Create a new collection
   */
  static async createCollection(data: CollectionCreateData): Promise<Collection> {
    try {
      return await ApiClient.post<Collection>('/favorites/collections/', data);
    } catch (error) {
      throw this.handleError(error, 'Failed to create collection');
    }
  }

  /**
   * Get all user collections
   */
  static async getUserCollections(params?: {
    page?: number;
    page_size?: number;
    search?: string;
  }): Promise<CollectionListResponse> {
    try {
      const queryParams: Record<string, any> = {};
      
      if (params?.page) queryParams.page = params.page;
      if (params?.page_size) queryParams.page_size = params.page_size;
      if (params?.search) queryParams.search = params.search;

      return await ApiClient.get<CollectionListResponse>('/favorites/collections/', queryParams);
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch collections');
    }
  }

  /**
   * Get a single collection by ID
   */
  static async getCollection(collectionId: string): Promise<Collection> {
    try {
      return await ApiClient.get<Collection>(`/favorites/collections/${collectionId}/`);
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch collection');
    }
  }

  /**
   * Update a collection
   */
  static async updateCollection(collectionId: string, data: Partial<CollectionCreateData>): Promise<Collection> {
    try {
      return await ApiClient.patch<Collection>(`/favorites/collections/${collectionId}/`, data);
    } catch (error) {
      throw this.handleError(error, 'Failed to update collection');
    }
  }

  /**
   * Delete a collection
   */
  static async deleteCollection(collectionId: string): Promise<void> {
    try {
      await ApiClient.delete(`/favorites/collections/${collectionId}/`);
    } catch (error) {
      throw this.handleError(error, 'Failed to delete collection');
    }
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