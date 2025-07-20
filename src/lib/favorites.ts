// Legacy favorites service - migrated to Django backend
// This file is kept for backward compatibility

export { DjangoFavoritesService } from './django-favorites';

// Re-export types with legacy names for compatibility
export type {
  Favorite,
  FavoriteCreateData,
  FavoriteUpdateData,
  Collection,
  CollectionCreateData
} from './django-favorites';

// Legacy functions for backward compatibility
import { DjangoFavoritesService } from './django-favorites';

/**
 * Legacy function signatures maintained for compatibility
 */
export async function addToFavorites(
  userId: string, 
  recipeId: string, 
  personalRating?: number, 
  personalNotes?: string
): Promise<any> {
  return DjangoFavoritesService.addToFavorites({
    recipe_id: recipeId,
    personal_rating: personalRating,
    personal_notes: personalNotes
  });
}

export async function removeFromFavorites(userId: string, recipeId: string): Promise<boolean> {
  try {
    await DjangoFavoritesService.removeFromFavoritesByRecipeId(recipeId);
    return true;
  } catch (error) {
    return false;
  }
}

export async function getUserFavorites(userId: string, limit: number = 50, offset: number = 0): Promise<{ favorites: any[]; total: number }> {
  const page = Math.floor(offset / limit) + 1;
  return DjangoFavoritesService.getUserFavorites({
    page,
    page_size: limit
  });
}

export async function isFavorited(userId: string, recipeId: string): Promise<boolean> {
  return DjangoFavoritesService.isFavorited(recipeId);
}

export async function getFavoriteStatusForRecipes(userId: string, recipeIds: string[]): Promise<Record<string, boolean>> {
  return DjangoFavoritesService.getFavoriteStatusForRecipes(recipeIds);
}

export async function updateFavorite(
  userId: string, 
  recipeId: string, 
  personalRating?: number, 
  personalNotes?: string
): Promise<any> {
  // This would need to find the favorite ID first, but for simplicity we'll just add/update
  return DjangoFavoritesService.addToFavorites({
    recipe_id: recipeId,
    personal_rating: personalRating,
    personal_notes: personalNotes
  });
}

export async function getFavoritesCount(userId: string): Promise<number> {
  return DjangoFavoritesService.getFavoritesCount();
}