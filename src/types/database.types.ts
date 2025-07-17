/**
 * @fileOverview Type definitions for the new normalized database structure
 */

// Core database entity types
export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  dietaryPreferences: DietaryPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface DietaryPreferences {
  allergies?: string[];
  dietType?: 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'mediterranean';
  dislikes?: string[];
  calorieTarget?: number;
}

export interface Recipe {
  id: string;
  createdByUserId?: string;
  name: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: string;
  nutritionInfo: NutritionInfo;
  cuisine?: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  prepTime: number;
  cookTime: number;
  totalTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  avgRating: number;
  ratingCount: number;
  imageUrl?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  notes?: string;
}

export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface MealPlan {
  id: string;
  userId: string;
  name: string;
  description?: string;
  weekStartDate: Date;
  isActive: boolean;
  items: MealPlanItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MealPlanItem {
  mealPlanId: string;
  recipeId: string;
  recipe: Recipe;
  dayOfWeek: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  addedAt: Date;
}

export interface Favorite {
  userId: string;
  recipeId: string;
  recipe: Recipe;
  personalRating?: number;
  personalNotes?: string;
  addedAt: Date;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  isPublic: boolean;
  recipes: Recipe[];
  createdAt: Date;
  updatedAt: Date;
}

// Database record types (matching actual DB column names)
export interface UserRecord {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  display_name?: string;
  dietary_preferences: DietaryPreferences;
  created_at: Date;
  updated_at: Date;
}

export interface RecipeRecord {
  id: string;
  created_by_user_id?: string;
  name: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: string;
  nutrition_info: NutritionInfo;
  cuisine?: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  prep_time: number;
  cook_time: number;
  total_time: number;
  difficulty: 'easy' | 'medium' | 'hard';
  avg_rating: number;
  rating_count: number;
  image_url?: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export interface MealPlanRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  week_start_date: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MealPlanItemRecord {
  meal_plan_id: string;
  recipe_id: string;
  day_of_week: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  added_at: Date;
}

export interface FavoriteRecord {
  user_id: string;
  recipe_id: string;
  personal_rating?: number;
  personal_notes?: string;
  added_at: Date;
}

export interface CollectionRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CollectionRecipeRecord {
  collection_id: string;
  recipe_id: string;
  added_at: Date;
}

// Utility types for database operations
export interface DatabaseError {
  code: string;
  message: string;
  details?: any;
}

export const ErrorCodes = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  RECIPE_NOT_FOUND: 'RECIPE_NOT_FOUND',
  DUPLICATE_USERNAME: 'DUPLICATE_USERNAME',
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  INVALID_MEAL_PLAN: 'INVALID_MEAL_PLAN',
  COLLECTION_NOT_FOUND: 'COLLECTION_NOT_FOUND',
  FOREIGN_KEY_VIOLATION: 'FOREIGN_KEY_VIOLATION',
  UNIQUE_VIOLATION: 'UNIQUE_VIOLATION'
} as const;

// Search and filter types
export interface RecipeSearchFilters {
  searchQuery?: string;
  cuisine?: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  difficulty?: 'easy' | 'medium' | 'hard';
  maxPrepTime?: number;
  maxCookTime?: number;
  minRating?: number;
  tags?: string[];
  sortBy?: 'rating' | 'created_at' | 'name' | 'prep_time';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface MealPlanFilters {
  userId: string;
  isActive?: boolean;
  weekStartDate?: Date;
  sortBy?: 'created_at' | 'name' | 'week_start_date';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}