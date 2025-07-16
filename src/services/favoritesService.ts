/**
 * @fileOverview Service layer for favorites operations
 * Handles business logic and data transformation between UI and database
 */

import {
  saveFavoriteToDb,
  getFavoritesByUserIdFromDb,
  getFavoritesWithCollectionsFromDb,
  updateFavoriteRatingInDb,
  updateFavoriteTagsInDb,
  deleteFavoriteFromDb,
  saveCollectionToDb,
  updateCollectionInDb,
  getCollectionsByUserIdFromDb,
  getCollectionMealsFromDb,
  addMealToCollectionInDb,
  removeMealFromCollectionInDb,
  deleteCollectionFromDb,
  seedFavoritesData
} from '@/lib/favorites-db';
import type { 
  FavoriteMeal, 
  FavoriteCollection, 
  FavoriteAnalytics,
  FavoriteFilters,
  RecipeData,
  NutritionInfo
} from '@/types/favorites.types';
import type { Meal } from '@/ai/schemas/meal';

// Cache for frequently accessed data
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

function getCacheKey(prefix: string, ...args: string[]): string {
  return `${prefix}:${args.join(':')}`;
}

function setCache<T>(key: string, data: T, ttlMs: number = 3600000): void { // 1 hour default
  cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
}

function getCache<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > cached.ttl) {
    cache.delete(key);
    return null;
  }
  
  return cached.data as T;
}

function invalidateCache(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

export class FavoritesService {
  private static instance: FavoritesService;
  
  static getInstance(): FavoritesService {
    if (!FavoritesService.instance) {
      FavoritesService.instance = new FavoritesService();
    }
    return FavoritesService.instance;
  }

  // Core favorites operations
  async addFavorite(
    userId: string, 
    meal: Meal, 
    additionalData?: {
      cuisine?: string;
      mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      imageUrl?: string;
      tags?: string[];
      rating?: number;
    }
  ): Promise<string> {
    try {
      const mealId = crypto.randomUUID();
      
      // Ensure required fields are not undefined
      const safeMeal = {
        recipeName: meal.recipeName || 'Untitled Recipe',
        ingredients: meal.ingredients || [],
        instructions: meal.instructions || 'No instructions provided'
      };
      
      const favoriteData = {
        user_id: userId,
        meal_id: mealId,
        name: safeMeal.recipeName,
        description: `Favorite recipe: ${safeMeal.recipeName}`,
        image_url: additionalData?.imageUrl,
        cuisine: additionalData?.cuisine || 'Unknown',
        meal_type: additionalData?.mealType || 'dinner',
        ingredients: safeMeal.ingredients,
        cooking_time: this.estimateCookingTime(safeMeal.instructions),
        difficulty: this.estimateDifficulty(safeMeal.instructions, safeMeal.ingredients.length),
        rating: additionalData?.rating || 3,
        tags: additionalData?.tags || [],
        nutrition_info: this.estimateNutrition(safeMeal.ingredients),
        recipe_data: {
          recipeName: safeMeal.recipeName,
          ingredients: safeMeal.ingredients,
          instructions: safeMeal.instructions,
          servings: 1,
          prepTime: 10,
          cookTime: this.estimateCookingTime(safeMeal.instructions)
        },
        use_count: 0,
        is_shared: false
      };

      const favoriteId = await saveFavoriteToDb(favoriteData);
      
      // Invalidate cache
      invalidateCache(`favorites:${userId}`);
      invalidateCache(`analytics:${userId}`);
      
      return favoriteId;
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw new Error('Failed to add favorite meal');
    }
  }

  async getFavorites(userId: string): Promise<FavoriteMeal[]> {
    try {
      const cacheKey = getCacheKey('favorites', userId);
      const cached = getCache<FavoriteMeal[]>(cacheKey);
      if (cached) return cached;

      const favorites = await getFavoritesWithCollectionsFromDb(userId);
      setCache(cacheKey, favorites);
      return favorites;
    } catch (error) {
      console.error('Error getting favorites:', error);
      throw new Error('Failed to retrieve favorite meals');
    }
  }

  async updateRating(favoriteId: string, rating: number, userId: string): Promise<void> {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      await updateFavoriteRatingInDb(favoriteId, rating);
      
      // Invalidate cache
      invalidateCache(`favorites:${userId}`);
      invalidateCache(`analytics:${userId}`);
    } catch (error) {
      console.error('Error updating rating:', error);
      throw new Error('Failed to update meal rating');
    }
  }

  async deleteFavorite(favoriteId: string, userId: string): Promise<void> {
    try {
      await deleteFavoriteFromDb(favoriteId);
      
      // Invalidate cache
      invalidateCache(`favorites:${userId}`);
      invalidateCache(`collections:${userId}`);
      invalidateCache(`analytics:${userId}`);
    } catch (error) {
      console.error('Error deleting favorite:', error);
      throw new Error('Failed to delete favorite meal');
    }
  }

  async incrementUsageCount(favoriteId: string, userId: string): Promise<void> {
    try {
      // This would need to be implemented in the database layer
      // For now, we'll update the last_used timestamp and increment use_count
      // await incrementFavoriteUsageInDb(favoriteId);
      
      // Invalidate cache to force refresh
      invalidateCache(`favorites:${userId}`);
      invalidateCache(`analytics:${userId}`);
    } catch (error) {
      console.error('Error incrementing usage count:', error);
      // Don't throw error as this is not critical
    }
  }

  async bulkDelete(favoriteIds: string[], userId: string): Promise<void> {
    try {
      await Promise.all(favoriteIds.map(id => deleteFavoriteFromDb(id)));
      
      // Invalidate cache
      invalidateCache(`favorites:${userId}`);
      invalidateCache(`collections:${userId}`);
      invalidateCache(`analytics:${userId}`);
    } catch (error) {
      console.error('Error bulk deleting favorites:', error);
      throw new Error('Failed to delete favorite meals');
    }
  }

  async bulkUpdateTags(favoriteIds: string[], tags: string[], userId: string, replace: boolean = true): Promise<void> {
    try {
      if (replace) {
        // Replace existing tags with new ones
        await Promise.all(favoriteIds.map(async (favoriteId) => {
          const newTags = [...new Set(tags)]; // Deduplicate new tags only
          await this.updateFavoriteTags(favoriteId, newTags, userId);
        }));
      } else {
        // Add new tags to existing ones
        const favorites = await this.getFavorites(userId);
        const favoritesToUpdate = favorites.filter(fav => favoriteIds.includes(fav.id));
        
        await Promise.all(favoritesToUpdate.map(async (favorite) => {
          const combinedTags = [...new Set([...favorite.tags, ...tags])]; // Merge and deduplicate
          await this.updateFavoriteTags(favorite.id, combinedTags, userId);
        }));
      }
      
      // Invalidate cache
      invalidateCache(`favorites:${userId}`);
      invalidateCache(`analytics:${userId}`);
    } catch (error) {
      console.error('Error bulk updating tags:', error);
      throw new Error('Failed to update tags for favorite meals');
    }
  }

  async updateFavoriteTags(favoriteId: string, tags: string[], userId: string): Promise<void> {
    try {
      await updateFavoriteTagsInDb(favoriteId, tags);
      
      // Invalidate cache
      invalidateCache(`favorites:${userId}`);
      invalidateCache(`analytics:${userId}`);
    } catch (error) {
      console.error('Error updating favorite tags:', error);
      throw new Error('Failed to update favorite tags');
    }
  }

  async getTagAnalytics(userId: string): Promise<{
    totalTags: number;
    activeTags: number;
    tagUsage: Array<{
      tag: string;
      count: number;
      percentage: number;
      averageRating: number;
      cuisines: string[];
    }>;
  }> {
    try {
      const cacheKey = getCacheKey('tag-analytics', userId);
      const cached = getCache<any>(cacheKey);
      if (cached) return cached;

      const favorites = await this.getFavorites(userId);
      const tagMap = new Map<string, {
        count: number;
        ratings: number[];
        cuisines: Set<string>;
      }>();

      favorites.forEach(favorite => {
        favorite.tags.forEach(tag => {
          if (!tagMap.has(tag)) {
            tagMap.set(tag, {
              count: 0,
              ratings: [],
              cuisines: new Set()
            });
          }
          
          const tagData = tagMap.get(tag)!;
          tagData.count++;
          tagData.ratings.push(favorite.rating);
          tagData.cuisines.add(favorite.cuisine);
        });
      });

      const totalFavorites = favorites.length;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const tagUsage = Array.from(tagMap.entries()).map(([tag, data]) => ({
        tag,
        count: data.count,
        percentage: totalFavorites > 0 ? (data.count / totalFavorites) * 100 : 0,
        averageRating: data.ratings.reduce((sum, rating) => sum + rating, 0) / data.ratings.length,
        cuisines: Array.from(data.cuisines)
      })).sort((a, b) => b.count - a.count);

      const activeTags = favorites
        .filter(fav => fav.lastUsed > thirtyDaysAgo)
        .flatMap(fav => fav.tags)
        .filter((tag, index, arr) => arr.indexOf(tag) === index)
        .length;

      const analytics = {
        totalTags: tagMap.size,
        activeTags,
        tagUsage
      };

      setCache(cacheKey, analytics, 3600000); // 1 hour
      return analytics;
    } catch (error) {
      console.error('Error getting tag analytics:', error);
      throw new Error('Failed to retrieve tag analytics');
    }
  }

  // Collection operations
  async createCollection(
    userId: string,
    name: string,
    description?: string,
    color: string = '#4DB6AC',
    icon: string = 'heart',
    tags: string[] = []
  ): Promise<string> {
    try {
      const collectionData = {
        user_id: userId,
        name,
        description,
        color,
        icon,
        is_public: false,
        tags
      };

      const collectionId = await saveCollectionToDb(collectionData);
      
      // Invalidate cache
      invalidateCache(`collections:${userId}`);
      
      return collectionId;
    } catch (error) {
      console.error('Error creating collection:', error);
      throw new Error('Failed to create collection');
    }
  }

  async updateCollection(
    collectionId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      color?: string;
      icon?: string;
      tags?: string[];
    }
  ): Promise<void> {
    try {
      await updateCollectionInDb(collectionId, updates);
      
      // Invalidate cache
      invalidateCache(`collections:${userId}`);
    } catch (error) {
      console.error('Error updating collection:', error);
      throw new Error('Failed to update collection');
    }
  }

  async getCollections(userId: string): Promise<FavoriteCollection[]> {
    try {
      const cacheKey = getCacheKey('collections', userId);
      const cached = getCache<FavoriteCollection[]>(cacheKey);
      if (cached) return cached;

      const collections = await getCollectionsByUserIdFromDb(userId);
      setCache(cacheKey, collections);
      return collections;
    } catch (error) {
      console.error('Error getting collections:', error);
      throw new Error('Failed to retrieve collections');
    }
  }

  async addToCollection(collectionId: string, favoriteId: string, userId: string): Promise<void> {
    try {
      await addMealToCollectionInDb(collectionId, favoriteId);
      
      // Invalidate cache
      invalidateCache(`collections:${userId}`);
      invalidateCache(`favorites:${userId}`);
    } catch (error) {
      console.error('Error adding to collection:', error);
      throw new Error('Failed to add meal to collection');
    }
  }

  async removeFromCollection(collectionId: string, favoriteId: string, userId: string): Promise<void> {
    try {
      await removeMealFromCollectionInDb(collectionId, favoriteId);
      
      // Invalidate cache
      invalidateCache(`collections:${userId}`);
      invalidateCache(`favorites:${userId}`);
    } catch (error) {
      console.error('Error removing from collection:', error);
      throw new Error('Failed to remove meal from collection');
    }
  }

  async deleteCollection(collectionId: string, userId: string): Promise<void> {
    try {
      await deleteCollectionFromDb(collectionId);
      
      // Invalidate cache
      invalidateCache(`collections:${userId}`);
      invalidateCache(`favorites:${userId}`);
    } catch (error) {
      console.error('Error deleting collection:', error);
      throw new Error('Failed to delete collection');
    }
  }

  async getCollectionMeals(collectionId: string, userId: string): Promise<FavoriteMeal[]> {
    try {
      const [mealIds, favorites] = await Promise.all([
        getCollectionMealsFromDb(collectionId),
        this.getFavorites(userId)
      ]);
      
      return favorites.filter(favorite => mealIds.includes(favorite.id));
    } catch (error) {
      console.error('Error getting collection meals:', error);
      throw new Error('Failed to retrieve collection meals');
    }
  }

  // Search and filtering
  async searchFavorites(userId: string, filters: Partial<FavoriteFilters>): Promise<FavoriteMeal[]> {
    try {
      const favorites = await this.getFavorites(userId);
      
      let filtered = [...favorites];

      // Apply search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(fav => 
          fav.name.toLowerCase().includes(query) ||
          fav.description.toLowerCase().includes(query) ||
          fav.ingredients.some(ing => ing.toLowerCase().includes(query)) ||
          fav.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }

      // Apply tag filters
      if (filters.selectedTags && filters.selectedTags.length > 0) {
        filtered = filtered.filter(fav =>
          filters.selectedTags!.some(tag => fav.tags.includes(tag))
        );
      }

      // Apply cuisine filter
      if (filters.cuisineTypes && filters.cuisineTypes.length > 0) {
        filtered = filtered.filter(fav =>
          filters.cuisineTypes!.includes(fav.cuisine)
        );
      }

      // Apply meal type filter
      if (filters.mealTypes && filters.mealTypes.length > 0) {
        filtered = filtered.filter(fav =>
          filters.mealTypes!.includes(fav.mealType)
        );
      }

      // Apply rating filter
      if (filters.ratingRange) {
        const [min, max] = filters.ratingRange;
        filtered = filtered.filter(fav =>
          fav.rating >= min && fav.rating <= max
        );
      }

      // Apply difficulty filter
      if (filters.difficultyLevels && filters.difficultyLevels.length > 0) {
        filtered = filtered.filter(fav =>
          filters.difficultyLevels!.includes(fav.difficulty)
        );
      }

      // Apply sorting
      if (filters.sortBy) {
        filtered.sort((a, b) => {
          let comparison = 0;
          
          switch (filters.sortBy) {
            case 'rating':
              comparison = a.rating - b.rating;
              break;
            case 'date':
              comparison = a.createdAt.getTime() - b.createdAt.getTime();
              break;
            case 'usage':
              comparison = a.useCount - b.useCount;
              break;
            case 'name':
              comparison = a.name.localeCompare(b.name);
              break;
          }
          
          return filters.sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      return filtered;
    } catch (error) {
      console.error('Error searching favorites:', error);
      throw new Error('Failed to search favorite meals');
    }
  }

  // Analytics
  async getAnalytics(userId: string): Promise<FavoriteAnalytics> {
    try {
      const cacheKey = getCacheKey('analytics', userId);
      const cached = getCache<FavoriteAnalytics>(cacheKey);
      if (cached) return cached;

      const favorites = await this.getFavorites(userId);
      
      const analytics: FavoriteAnalytics = {
        totalFavorites: favorites.length,
        topCuisines: this.calculateTopCuisines(favorites),
        topIngredients: this.calculateTopIngredients(favorites),
        averageRating: this.calculateAverageRating(favorites),
        mostUsedMeals: favorites
          .sort((a, b) => b.useCount - a.useCount)
          .slice(0, 5),
        cookingTimePreferences: this.calculateCookingTimePreferences(favorites),
        mealTypeDistribution: this.calculateMealTypeDistribution(favorites)
      };

      setCache(cacheKey, analytics, 86400000); // 24 hours
      return analytics;
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw new Error('Failed to retrieve analytics');
    }
  }

  // Utility methods
  private estimateCookingTime(instructions: string): number {
    const timeMatches = instructions.match(/(\d+)\s*(分钟|minutes?|mins?)/gi);
    if (timeMatches) {
      const times = timeMatches.map(match => {
        const num = parseInt(match.match(/\d+/)?.[0] || '0');
        return num;
      });
      return Math.max(...times);
    }
    
    // Estimate based on instruction length
    const instructionLength = instructions.length;
    if (instructionLength < 200) return 15;
    if (instructionLength < 500) return 30;
    return 45;
  }

  private estimateDifficulty(instructions: string, ingredientCount: number): 'easy' | 'medium' | 'hard' {
    const complexWords = ['烤箱', '炖', '煎', '炸', '腌制', 'marinate', 'braise', 'sauté'];
    const hasComplexTechniques = complexWords.some(word => 
      instructions.toLowerCase().includes(word.toLowerCase())
    );
    
    if (ingredientCount <= 5 && !hasComplexTechniques) return 'easy';
    if (ingredientCount <= 10 && !hasComplexTechniques) return 'medium';
    return 'hard';
  }

  private estimateNutrition(ingredients: string[]): NutritionInfo {
    // Simple estimation based on common ingredients
    // In a real app, you'd use a nutrition API
    const baseCalories = ingredients.length * 50;
    return {
      calories: baseCalories,
      protein: Math.round(baseCalories * 0.15 / 4),
      carbs: Math.round(baseCalories * 0.45 / 4),
      fat: Math.round(baseCalories * 0.30 / 9),
      fiber: Math.round(ingredients.length * 2),
      sugar: Math.round(baseCalories * 0.10 / 4),
      sodium: Math.round(baseCalories * 2)
    };
  }

  private calculateTopCuisines(favorites: FavoriteMeal[]): { cuisine: string; count: number }[] {
    const cuisineCount = favorites.reduce((acc, fav) => {
      acc[fav.cuisine] = (acc[fav.cuisine] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(cuisineCount)
      .map(([cuisine, count]) => ({ cuisine, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private calculateTopIngredients(favorites: FavoriteMeal[]): { ingredient: string; count: number }[] {
    const ingredientCount = favorites.reduce((acc, fav) => {
      fav.ingredients.forEach(ingredient => {
        // Extract ingredient name (remove quantities)
        const name = ingredient.split(/\d/)[0].trim() || ingredient;
        acc[name] = (acc[name] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(ingredientCount)
      .map(([ingredient, count]) => ({ ingredient, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateAverageRating(favorites: FavoriteMeal[]): number {
    if (favorites.length === 0) return 0;
    const sum = favorites.reduce((acc, fav) => acc + fav.rating, 0);
    return Math.round((sum / favorites.length) * 10) / 10;
  }

  private calculateCookingTimePreferences(favorites: FavoriteMeal[]): { range: string; count: number }[] {
    const ranges = [
      { range: '0-15分钟', min: 0, max: 15 },
      { range: '16-30分钟', min: 16, max: 30 },
      { range: '31-45分钟', min: 31, max: 45 },
      { range: '46-60分钟', min: 46, max: 60 },
      { range: '60分钟以上', min: 61, max: Infinity }
    ];

    return ranges.map(({ range, min, max }) => ({
      range,
      count: favorites.filter(fav => fav.cookingTime >= min && fav.cookingTime <= max).length
    }));
  }

  private calculateMealTypeDistribution(favorites: FavoriteMeal[]): { type: string; count: number }[] {
    const typeCount = favorites.reduce((acc, fav) => {
      acc[fav.mealType] = (acc[fav.mealType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCount)
      .map(([type, count]) => ({ type, count }));
  }

  // Initialize with seed data for development
  async initializeWithSeedData(): Promise<void> {
    try {
      await seedFavoritesData();
    } catch (error) {
      console.error('Error seeding favorites data:', error);
      // Don't throw error for seeding
    }
  }
}

// Export singleton instance
export const favoritesService = FavoritesService.getInstance();