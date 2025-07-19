'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import type { Favorite } from '@/types/database.types';
import {
  getUserFavorites,
  addToFavorites,
  removeFromFavorites,
  isFavorited,
  getFavoriteStatusForRecipes,
  updateFavorite,
  getFavoritesByMealType,
  getFavoritesCount
} from '@/lib/favorites';

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
      const { favorites: userFavorites } = await getUserFavorites(user.id);
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
      const favorite = await addToFavorites(user.id, recipeId, personalRating, personalNotes);
      
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
      const success = await removeFromFavorites(user.id, recipeId);
      
      if (success) {
        // Update local state
        setFavorites(prev => prev.filter(fav => fav.recipeId !== recipeId));
        setFavoriteIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(recipeId);
          return newSet;
        });
      }
      
      setError(null);
      return success;
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
      const updatedFavorite = await updateFavorite(user.id, recipeId, personalRating, personalNotes);
      
      if (updatedFavorite) {
        // Update local state
        setFavorites(prev => 
          prev.map(fav => 
            fav.recipeId === recipeId ? updatedFavorite : fav
          )
        );
      }
      
      setError(null);
      return !!updatedFavorite;
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
    return favorites.filter(fav => fav.recipe.mealType === mealType);
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