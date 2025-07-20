'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import type { Favorite } from '@/types/database.types';
import { DjangoFavoritesService } from '@/lib/django-favorites';

interface FavoritesContextType {
  favorites: Favorite[];
  favoriteIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addFavorite: (recipeId: string, personalRating?: number, personalNotes?: string) => Promise<boolean>;
  removeFavorite: (recipeId: string) => Promise<boolean>;
  toggleFavorite: (recipeId: string) => Promise<boolean>;
  updateFavoriteDetails: (recipeId: string, personalRating?: number, personalNotes?: string) => Promise<boolean>;
  checkIsFavorited: (recipeId: string) => boolean;
  getFavoritesByMeal: (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => Favorite[];
  
  // Utilities
  refreshFavorites: () => Promise<void>;
  clearError: () => void;
  
  // Stats
  favoritesCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load favorites when user changes or authenticates
  useEffect(() => {
    if (isAuthenticated && user) {
      loadFavorites();
    } else {
      // Clear favorites when user logs out
      setFavorites([]);
      setFavoriteIds(new Set());
    }
  }, [isAuthenticated, user]);

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { favorites: djangoFavorites } = await DjangoFavoritesService.getUserFavorites();
      console.log('Raw Django favorites:', djangoFavorites);
      
      // Convert Django favorites to database format
      const userFavorites: Favorite[] = djangoFavorites.map(fav => ({
        userId: user.id,
        recipeId: fav.recipe.id,
        recipe: {
          id: fav.recipe.id,
          createdByUserId: fav.recipe.created_by_user_id,
          name: fav.recipe.name,
          description: fav.recipe.description,
          ingredients: fav.recipe.ingredients,
          instructions: fav.recipe.instructions,
          nutritionInfo: fav.recipe.nutrition_info || {},
          cuisine: fav.recipe.cuisine,
          prepTime: fav.recipe.prep_time || 0,
          cookTime: fav.recipe.cook_time || 0,
          totalTime: (fav.recipe.prep_time || 0) + (fav.recipe.cook_time || 0),
          difficulty: fav.recipe.difficulty || 'medium',
          avgRating: Number(fav.recipe.avg_rating) || 0,
          ratingCount: Number(fav.recipe.rating_count) || 0,
          imageUrl: fav.recipe.image_url,
          tags: fav.recipe.tags || [],
          createdAt: fav.recipe.created_at ? new Date(fav.recipe.created_at) : new Date(),
          updatedAt: fav.recipe.updated_at ? new Date(fav.recipe.updated_at) : new Date()
        },
        personalRating: fav.personal_rating,
        personalNotes: fav.personal_notes,
        addedAt: new Date(fav.created_at)
      }));
      
      setFavorites(userFavorites);
      setFavoriteIds(new Set(userFavorites.map(fav => fav.recipeId)));
    } catch (err) {
      console.error('Failed to load favorites:', err);
      setError('Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const addFavorite = useCallback(async (
    recipeId: string, 
    personalRating?: number, 
    personalNotes?: string
  ): Promise<boolean> => {
    if (!user) {
      setError('User must be authenticated to add favorites');
      return false;
    }

    try {
      const djangoFavorite = await DjangoFavoritesService.addToFavorites({
        recipe_id: recipeId,
        personal_rating: personalRating,
        personal_notes: personalNotes
      });
      
      // Convert to database format
      const favorite: Favorite = {
        userId: user.id,
        recipeId: djangoFavorite.recipe.id,
        recipe: {
          id: djangoFavorite.recipe.id,
          createdByUserId: djangoFavorite.recipe.created_by_user_id,
          name: djangoFavorite.recipe.name,
          description: djangoFavorite.recipe.description,
          ingredients: djangoFavorite.recipe.ingredients,
          instructions: djangoFavorite.recipe.instructions,
          nutritionInfo: djangoFavorite.recipe.nutrition_info || {},
          cuisine: djangoFavorite.recipe.cuisine,
          prepTime: djangoFavorite.recipe.prep_time || 0,
          cookTime: djangoFavorite.recipe.cook_time || 0,
          totalTime: (djangoFavorite.recipe.prep_time || 0) + (djangoFavorite.recipe.cook_time || 0),
          difficulty: djangoFavorite.recipe.difficulty || 'medium',
          avgRating: Number(djangoFavorite.recipe.avg_rating) || 0,
          ratingCount: Number(djangoFavorite.recipe.rating_count) || 0,
          imageUrl: djangoFavorite.recipe.image_url,
          tags: djangoFavorite.recipe.tags || [],
          createdAt: djangoFavorite.recipe.created_at ? new Date(djangoFavorite.recipe.created_at) : new Date(),
          updatedAt: djangoFavorite.recipe.updated_at ? new Date(djangoFavorite.recipe.updated_at) : new Date()
        },
        personalRating: djangoFavorite.personal_rating,
        personalNotes: djangoFavorite.personal_notes,
        addedAt: new Date(djangoFavorite.created_at)
      };
      
      // Update local state
      setFavorites(prev => {
        const filtered = prev.filter(fav => fav.recipeId !== recipeId);
        return [favorite, ...filtered];
      });
      setFavoriteIds(prev => new Set([...prev, recipeId]));
      
      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to add favorite:', err);
      setError('Failed to add to favorites');
      return false;
    }
  }, [user]);

  const removeFavorite = useCallback(async (recipeId: string): Promise<boolean> => {
    if (!user) {
      setError('User must be authenticated to remove favorites');
      return false;
    }

    try {
      await DjangoFavoritesService.removeFromFavoritesByRecipeId(recipeId);
      
      // Update local state
      setFavorites(prev => prev.filter(fav => fav.recipeId !== recipeId));
      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(recipeId);
        return newSet;
      });
      
      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to remove favorite:', err);
      setError('Failed to remove from favorites');
      return false;
    }
  }, [user]);

  const toggleFavorite = useCallback(async (recipeId: string): Promise<boolean> => {
    const isFav = favoriteIds.has(recipeId);
    
    if (isFav) {
      return await removeFavorite(recipeId);
    } else {
      return await addFavorite(recipeId);
    }
  }, [favoriteIds, addFavorite, removeFavorite]);

  const updateFavoriteDetails = useCallback(async (
    recipeId: string, 
    personalRating?: number, 
    personalNotes?: string
  ): Promise<boolean> => {
    if (!user) {
      setError('User must be authenticated to update favorites');
      return false;
    }

    try {
      // Find the favorite to update
      const existingFavorite = favorites.find(fav => fav.recipeId === recipeId);
      if (!existingFavorite) {
        setError('Favorite not found');
        return false;
      }

      // For now, we'll need to find the Django favorite ID
      // This is a limitation of the current implementation
      const { favorites: djangoFavorites } = await DjangoFavoritesService.getUserFavorites();
      const djangoFavorite = djangoFavorites.find(fav => fav.recipe.id === recipeId);
      
      if (!djangoFavorite) {
        setError('Favorite not found in backend');
        return false;
      }

      const updatedDjangoFavorite = await DjangoFavoritesService.updateFavorite(djangoFavorite.id, {
        personal_rating: personalRating,
        personal_notes: personalNotes
      });
      
      // Convert to database format
      const updatedFavorite: Favorite = {
        ...existingFavorite,
        personalRating: updatedDjangoFavorite.personal_rating,
        personalNotes: updatedDjangoFavorite.personal_notes
      };
      
      // Update local state
      setFavorites(prev => 
        prev.map(fav => 
          fav.recipeId === recipeId ? updatedFavorite : fav
        )
      );
      
      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to update favorite:', err);
      setError('Failed to update favorite details');
      return false;
    }
  }, [user]);

  const checkIsFavorited = useCallback((recipeId: string): boolean => {
    return favoriteIds.has(recipeId);
  }, [favoriteIds]);

  const getFavoritesByMeal = useCallback((mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'): Favorite[] => {
    return favorites.filter(fav => 
      fav.recipe.tags?.includes(mealType) || 
      fav.recipe.tags?.includes(mealType.toLowerCase())
    );
  }, [favorites]);

  const refreshFavorites = useCallback(async () => {
    await loadFavorites();
  }, [loadFavorites]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: FavoritesContextType = {
    favorites,
    favoriteIds,
    isLoading,
    error,
    
    // Actions
    addFavorite,
    removeFavorite,
    toggleFavorite,
    updateFavoriteDetails,
    checkIsFavorited,
    getFavoritesByMeal,
    
    // Utilities
    refreshFavorites,
    clearError,
    
    // Stats
    favoritesCount: favorites.length,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

// Hook for checking if a specific recipe is favorited
export function useIsFavorited(recipeId: string): boolean {
  const { checkIsFavorited } = useFavorites();
  return checkIsFavorited(recipeId);
}

// Hook for getting favorites by meal type
export function useFavoritesByMealType(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'): Favorite[] {
  const { getFavoritesByMeal } = useFavorites();
  return getFavoritesByMeal(mealType);
}