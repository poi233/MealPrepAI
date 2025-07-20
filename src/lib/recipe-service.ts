// Legacy recipe service - migrated to Django backend
// This file is kept for backward compatibility

export { DjangoRecipeService as RecipeService } from './django-recipe-service';

// Re-export types with legacy names for compatibility
export type {
  Recipe,
  RecipeCreateData as RecipeUpdateData,
  RecipeDeleteOptions
} from './django-recipe-service';

export interface RecipeDeleteError {
  error: string;
  canForceDelete?: boolean;
}