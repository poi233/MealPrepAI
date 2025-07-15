/**
 * @fileOverview Custom hook for managing favorites functionality
 * Provides state management and operations for the favorites system
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { favoritesService } from '@/services/favoritesService';
import type { 
  FavoriteMeal, 
  FavoriteCollection, 
  FavoriteAnalytics,
  FavoriteFilters
} from '@/types/favorites.types';
import type { Meal } from '@/ai/schemas/meal';
import { useToast } from '@/hooks/use-toast';

interface UseFavoritesReturn {
  // State
  favorites: FavoriteMeal[];
  collections: FavoriteCollection[];
  analytics: FavoriteAnalytics | null;
  isLoading: boolean;
  error: string | null;
  
  // Core operations
  toggleFavorite: (meal: Meal, additionalData?: {
    cuisine?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    imageUrl?: string;
    tags?: string[];
    rating?: number;
  }) => Promise<void>;
  rateMeal: (favoriteId: string, rating: number) => Promise<void>;
  deleteFavorite: (favoriteId: string) => Promise<void>;
  
  // Collection management
  createCollection: (name: string, description?: string, color?: string, icon?: string, tags?: string[]) => Promise<void>;
  addToCollection: (favoriteId: string, collectionId: string) => Promise<void>;
  removeFromCollection: (favoriteId: string, collectionId: string) => Promise<void>;
  
  // Bulk operations
  bulkDelete: (favoriteIds: string[]) => Promise<void>;
  bulkTag: (favoriteIds: string[], tags: string[], replace?: boolean) => Promise<void>;
  bulkAddToCollection: (favoriteIds: string[], collectionId: string) => Promise<void>;
  
  // Filtering and search
  searchFavorites: (filters: Partial<FavoriteFilters>) => Promise<FavoriteMeal[]>;
  filteredFavorites: FavoriteMeal[];
  setFilters: (filters: Partial<FavoriteFilters>) => void;
  clearFilters: () => void;
  
  // Utilities
  isFavorite: (mealName: string) => boolean;
  getFavoriteByName: (mealName: string) => FavoriteMeal | undefined;
  refreshData: () => Promise<void>;
}

const DEFAULT_FILTERS: FavoriteFilters = {
  searchQuery: '',
  selectedTags: [],
  selectedCollections: [],
  cuisineTypes: [],
  mealTypes: [],
  ratingRange: [1, 5],
  difficultyLevels: [],
  sortBy: 'date',
  sortOrder: 'desc'
};

export function useFavorites(userId: string = '550e8400-e29b-41d4-a716-446655440000'): UseFavoritesReturn {
  // State
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([]);
  const [collections, setCollections] = useState<FavoriteCollection[]>([]);
  const [analytics, setAnalytics] = useState<FavoriteAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<FavoriteFilters>(DEFAULT_FILTERS);
  const [filteredFavorites, setFilteredFavorites] = useState<FavoriteMeal[]>([]);
  
  const { toast } = useToast();

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [favoritesData, collectionsData, analyticsData] = await Promise.all([
        favoritesService.getFavorites(userId),
        favoritesService.getCollections(userId),
        favoritesService.getAnalytics(userId)
      ]);
      
      setFavorites(favoritesData);
      setCollections(collectionsData);
      setAnalytics(analyticsData);
      setFilteredFavorites(favoritesData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load favorites data';
      setError(errorMessage);
      console.error('Error loading favorites data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initialize data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply filters when favorites or filters change
  useEffect(() => {
    const applyFilters = async () => {
      try {
        const filtered = await favoritesService.searchFavorites(userId, filters);
        setFilteredFavorites(filtered);
      } catch (err) {
        console.error('Error applying filters:', err);
        setFilteredFavorites(favorites);
      }
    };

    if (favorites.length > 0) {
      applyFilters();
    }
  }, [favorites, filters, userId]);

  // Core operations
  const toggleFavorite = useCallback(async (
    meal: Meal, 
    additionalData?: {
      cuisine?: string;
      mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      imageUrl?: string;
      tags?: string[];
      rating?: number;
    }
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const existingFavorite = favorites.find(fav => fav.name === meal.recipeName);
      
      if (existingFavorite) {
        // Remove from favorites
        await favoritesService.deleteFavorite(existingFavorite.id, userId);
        setFavorites(prev => prev.filter(fav => fav.id !== existingFavorite.id));
        toast({
          title: "已取消收藏",
          description: `${meal.recipeName} 已从收藏中移除`,
        });
      } else {
        // Add to favorites
        const favoriteId = await favoritesService.addFavorite(userId, meal, additionalData);
        
        // Refresh favorites to get the new one
        const updatedFavorites = await favoritesService.getFavorites(userId);
        setFavorites(updatedFavorites);
        
        toast({
          title: "已添加收藏",
          description: `${meal.recipeName} 已添加到收藏`,
        });
      }
      
      // Refresh analytics
      const updatedAnalytics = await favoritesService.getAnalytics(userId);
      setAnalytics(updatedAnalytics);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle favorite';
      setError(errorMessage);
      toast({
        title: "操作失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [favorites, userId, toast]);

  const rateMeal = useCallback(async (favoriteId: string, rating: number) => {
    setError(null);
    
    try {
      await favoritesService.updateRating(favoriteId, rating, userId);
      
      // Update local state
      setFavorites(prev => prev.map(fav => 
        fav.id === favoriteId ? { ...fav, rating } : fav
      ));
      
      // Refresh analytics
      const updatedAnalytics = await favoritesService.getAnalytics(userId);
      setAnalytics(updatedAnalytics);
      
      toast({
        title: "评分已更新",
        description: `评分已更新为 ${rating} 星`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update rating';
      setError(errorMessage);
      toast({
        title: "评分失败",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [userId, toast]);

  const deleteFavorite = useCallback(async (favoriteId: string) => {
    setError(null);
    
    try {
      await favoritesService.deleteFavorite(favoriteId, userId);
      
      setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
      
      // Refresh analytics and collections
      const [updatedAnalytics, updatedCollections] = await Promise.all([
        favoritesService.getAnalytics(userId),
        favoritesService.getCollections(userId)
      ]);
      setAnalytics(updatedAnalytics);
      setCollections(updatedCollections);
      
      toast({
        title: "已删除收藏",
        description: "收藏已成功删除",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete favorite';
      setError(errorMessage);
      toast({
        title: "删除失败",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [userId, toast]);

  // Collection management
  const createCollection = useCallback(async (
    name: string, 
    description?: string, 
    color: string = '#4DB6AC', 
    icon: string = 'heart', 
    tags: string[] = []
  ) => {
    setError(null);
    
    try {
      await favoritesService.createCollection(userId, name, description, color, icon, tags);
      
      const updatedCollections = await favoritesService.getCollections(userId);
      setCollections(updatedCollections);
      
      toast({
        title: "收藏夹已创建",
        description: `收藏夹 "${name}" 创建成功`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create collection';
      setError(errorMessage);
      toast({
        title: "创建失败",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [userId, toast]);

  const addToCollection = useCallback(async (favoriteId: string, collectionId: string) => {
    setError(null);
    
    try {
      await favoritesService.addToCollection(collectionId, favoriteId, userId);
      
      // Refresh data
      const [updatedFavorites, updatedCollections] = await Promise.all([
        favoritesService.getFavorites(userId),
        favoritesService.getCollections(userId)
      ]);
      setFavorites(updatedFavorites);
      setCollections(updatedCollections);
      
      toast({
        title: "已添加到收藏夹",
        description: "菜谱已成功添加到收藏夹",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add to collection';
      setError(errorMessage);
      toast({
        title: "添加失败",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [userId, toast]);

  const removeFromCollection = useCallback(async (favoriteId: string, collectionId: string) => {
    setError(null);
    
    try {
      await favoritesService.removeFromCollection(collectionId, favoriteId, userId);
      
      // Refresh data
      const [updatedFavorites, updatedCollections] = await Promise.all([
        favoritesService.getFavorites(userId),
        favoritesService.getCollections(userId)
      ]);
      setFavorites(updatedFavorites);
      setCollections(updatedCollections);
      
      toast({
        title: "已从收藏夹移除",
        description: "菜谱已从收藏夹中移除",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove from collection';
      setError(errorMessage);
      toast({
        title: "移除失败",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [userId, toast]);

  // Bulk operations
  const bulkDelete = useCallback(async (favoriteIds: string[]) => {
    setError(null);
    
    try {
      await favoritesService.bulkDelete(favoriteIds, userId);
      
      setFavorites(prev => prev.filter(fav => !favoriteIds.includes(fav.id)));
      
      // Refresh analytics and collections
      const [updatedAnalytics, updatedCollections] = await Promise.all([
        favoritesService.getAnalytics(userId),
        favoritesService.getCollections(userId)
      ]);
      setAnalytics(updatedAnalytics);
      setCollections(updatedCollections);
      
      toast({
        title: "批量删除成功",
        description: `已删除 ${favoriteIds.length} 个收藏`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk delete favorites';
      setError(errorMessage);
      toast({
        title: "批量删除失败",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [userId, toast]);

  const bulkTag = useCallback(async (favoriteIds: string[], tags: string[], replace: boolean = true) => {
    setError(null);
    
    try {
      await favoritesService.bulkUpdateTags(favoriteIds, tags, userId, replace);
      
      // Refresh favorites data
      const [updatedFavorites, updatedAnalytics] = await Promise.all([
        favoritesService.getFavorites(userId),
        favoritesService.getAnalytics(userId)
      ]);
      setFavorites(updatedFavorites);
      setAnalytics(updatedAnalytics);
      
      toast({
        title: "批量标签成功",
        description: `已为 ${favoriteIds.length} 个收藏${replace ? '替换' : '添加'}标签`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk tag favorites';
      setError(errorMessage);
      toast({
        title: "批量标签失败",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [userId, toast]);

  const bulkAddToCollection = useCallback(async (favoriteIds: string[], collectionId: string) => {
    setError(null);
    
    try {
      await Promise.all(
        favoriteIds.map(favoriteId => 
          favoritesService.addToCollection(collectionId, favoriteId, userId)
        )
      );
      
      // Refresh data
      const [updatedFavorites, updatedCollections] = await Promise.all([
        favoritesService.getFavorites(userId),
        favoritesService.getCollections(userId)
      ]);
      setFavorites(updatedFavorites);
      setCollections(updatedCollections);
      
      toast({
        title: "批量添加成功",
        description: `已将 ${favoriteIds.length} 个收藏添加到收藏夹`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk add to collection';
      setError(errorMessage);
      toast({
        title: "批量添加失败",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [userId, toast]);

  // Search and filtering
  const searchFavorites = useCallback(async (searchFilters: Partial<FavoriteFilters>) => {
    try {
      return await favoritesService.searchFavorites(userId, searchFilters);
    } catch (err) {
      console.error('Error searching favorites:', err);
      return favorites;
    }
  }, [userId, favorites]);

  const setFilters = useCallback((newFilters: Partial<FavoriteFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // Utilities
  const isFavorite = useCallback((mealName: string) => {
    return favorites.some(fav => fav.name === mealName);
  }, [favorites]);

  const getFavoriteByName = useCallback((mealName: string) => {
    return favorites.find(fav => fav.name === mealName);
  }, [favorites]);

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Memoized return value
  return useMemo(() => ({
    // State
    favorites,
    collections,
    analytics,
    isLoading,
    error,
    
    // Core operations
    toggleFavorite,
    rateMeal,
    deleteFavorite,
    
    // Collection management
    createCollection,
    addToCollection,
    removeFromCollection,
    
    // Bulk operations
    bulkDelete,
    bulkTag,
    bulkAddToCollection,
    
    // Filtering and search
    searchFavorites,
    filteredFavorites,
    setFilters,
    clearFilters,
    
    // Utilities
    isFavorite,
    getFavoriteByName,
    refreshData
  }), [
    favorites,
    collections,
    analytics,
    isLoading,
    error,
    toggleFavorite,
    rateMeal,
    deleteFavorite,
    createCollection,
    addToCollection,
    removeFromCollection,
    bulkDelete,
    bulkTag,
    bulkAddToCollection,
    searchFavorites,
    filteredFavorites,
    setFilters,
    clearFilters,
    isFavorite,
    getFavoriteByName,
    refreshData
  ]);
}