/**
 * @fileOverview Type definitions for the Meal Favorites System
 */

export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface RecipeData {
  recipeName: string;
  ingredients: string[];
  instructions: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
}

export interface FavoriteMeal {
  id: string;
  mealId: string;
  userId: string;
  name: string;
  description: string;
  imageUrl?: string;
  cuisine: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  ingredients: string[];
  cookingTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  rating: number; // 1-5 stars
  tags: string[];
  nutritionInfo: NutritionInfo;
  recipeData: RecipeData;
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
  isShared: boolean;
  sharedBy?: string;
  collections: string[]; // Collection IDs
}

export interface FavoriteCollection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  mealIds: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface FavoriteAnalytics {
  totalFavorites: number;
  topCuisines: { cuisine: string; count: number }[];
  topIngredients: { ingredient: string; count: number }[];
  averageRating: number;
  mostUsedMeals: FavoriteMeal[];
  cookingTimePreferences: { range: string; count: number }[];
  mealTypeDistribution: { type: string; count: number }[];
}

export interface FavoriteFilters {
  searchQuery: string;
  selectedTags: string[];
  selectedCollections: string[];
  cuisineTypes: string[];
  mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'snack')[];
  ratingRange: [number, number];
  difficultyLevels: ('easy' | 'medium' | 'hard')[];
  sortBy: 'rating' | 'date' | 'usage' | 'name';
  sortOrder: 'asc' | 'desc';
}

export interface ShareRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  favoriteId?: string;
  collectionId?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  respondedAt?: Date;
}

// Database record types
export interface FavoriteMealRecord {
  id: string;
  user_id: string;
  meal_id: string;
  name: string;
  description: string;
  image_url?: string;
  cuisine: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  ingredients: string[];
  cooking_time: number;
  difficulty: 'easy' | 'medium' | 'hard';
  rating: number;
  tags: string[];
  nutrition_info: NutritionInfo;
  recipe_data: RecipeData;
  created_at: Date;
  last_used: Date;
  use_count: number;
  is_shared: boolean;
  shared_by?: string;
}

export interface FavoriteCollectionRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
  tags: string[];
}