'use server';

import { sql } from '@vercel/postgres';
import type { 
  Favorite, 
  FavoriteRecord, 
  Recipe,
  RecipeRecord,
  DatabaseError 
} from '@/types/database.types';

/**
 * Ensures the favorites table exists with proper schema and indexes
 */
async function ensureFavoritesTableExists(): Promise<void> {
  try {
    // Create favorites table
    await sql`
      CREATE TABLE IF NOT EXISTS favorites (
        user_id UUID NOT NULL,
        recipe_id UUID NOT NULL,
        personal_rating INTEGER CHECK (personal_rating BETWEEN 1 AND 5),
        personal_notes TEXT,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, recipe_id)
      )
    `;

    // Create performance indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_favorites_recipe_id ON favorites(recipe_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_favorites_added_at ON favorites(added_at DESC)`;

    // Add foreign key constraints if they don't exist
    await sql`
      ALTER TABLE favorites 
      ADD CONSTRAINT fk_favorites_recipe 
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    `;

  } catch (error) {
    // Ignore constraint already exists errors
    if (!(error instanceof Error && error.message && error.message.includes('already exists'))) {
      console.error("Database error: Failed to ensure 'favorites' table exists:", error);
      throw new Error("Failed to initialize database table 'favorites'.");
    }
  }
}

/**
 * Transforms database record to Recipe type
 */
function transformRecipeRecord(record: RecipeRecord): Recipe {
  return {
    id: record.id,
    createdByUserId: record.created_by_user_id,
    name: record.name,
    description: record.description,
    ingredients: record.ingredients,
    instructions: record.instructions,
    nutritionInfo: record.nutrition_info,
    cuisine: record.cuisine,
    prepTime: record.prep_time,
    cookTime: record.cook_time,
    totalTime: record.total_time,
    difficulty: record.difficulty,
    avgRating: parseFloat(record.avg_rating.toString()),
    ratingCount: record.rating_count,
    imageUrl: record.image_url,
    tags: record.tags,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

/**
 * Transforms database record to Favorite type
 */
function transformFavoriteRecord(record: FavoriteRecord & RecipeRecord): Favorite {
  return {
    userId: record.user_id,
    recipeId: record.recipe_id,
    recipe: transformRecipeRecord(record),
    personalRating: record.personal_rating,
    personalNotes: record.personal_notes,
    addedAt: record.added_at
  };
}

/**
 * Adds a recipe to user's favorites
 */
export async function addToFavorites(
  userId: string, 
  recipeId: string, 
  personalRating?: number, 
  personalNotes?: string
): Promise<Favorite> {
  await ensureFavoritesTableExists();
  
  if (!userId || userId.trim() === '') {
    throw new Error('User ID is required');
  }
  
  if (!recipeId || recipeId.trim() === '') {
    throw new Error('Recipe ID is required');
  }
  
  if (personalRating !== undefined && (personalRating < 1 || personalRating > 5)) {
    throw new Error('Personal rating must be between 1 and 5');
  }
  
  try {
    // Insert or update favorite
    await sql`
      INSERT INTO favorites (user_id, recipe_id, personal_rating, personal_notes)
      VALUES (${userId}, ${recipeId}, ${personalRating || null}, ${personalNotes || null})
      ON CONFLICT (user_id, recipe_id)
      DO UPDATE SET
        personal_rating = EXCLUDED.personal_rating,
        personal_notes = EXCLUDED.personal_notes,
        added_at = CURRENT_TIMESTAMP
    `;
    
    // Get the favorite with recipe details
    const { rows } = await sql`
      SELECT 
        f.user_id,
        f.recipe_id,
        f.personal_rating,
        f.personal_notes,
        f.added_at,
        r.*
      FROM favorites f
      JOIN recipes r ON f.recipe_id = r.id
      WHERE f.user_id = ${userId} AND f.recipe_id = ${recipeId}
    `;
    
    if (rows.length === 0) {
      throw new Error('Failed to retrieve favorite after creation');
    }
    
    return transformFavoriteRecord(rows[0] as FavoriteRecord & RecipeRecord);
  } catch (error) {
    console.error('Database error: Failed to add to favorites:', error);
    throw new Error('Failed to add recipe to favorites.');
  }
}

/**
 * Removes a recipe from user's favorites
 */
export async function removeFromFavorites(userId: string, recipeId: string): Promise<boolean> {
  await ensureFavoritesTableExists();
  
  if (!userId || userId.trim() === '') {
    throw new Error('User ID is required');
  }
  
  if (!recipeId || recipeId.trim() === '') {
    throw new Error('Recipe ID is required');
  }
  
  try {
    const result = await sql`
      DELETE FROM favorites
      WHERE user_id = ${userId} AND recipe_id = ${recipeId}
    `;
    
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error('Database error: Failed to remove from favorites:', error);
    throw new Error('Failed to remove recipe from favorites.');
  }
}

/**
 * Gets all favorites for a user with recipe details
 */
export async function getUserFavorites(userId: string, limit: number = 50, offset: number = 0): Promise<{ favorites: Favorite[]; total: number }> {
  await ensureFavoritesTableExists();
  
  if (!userId || userId.trim() === '') {
    throw new Error('User ID is required');
  }
  
  try {
    // Get total count
    const { rows: countRows } = await sql`
      SELECT COUNT(*) as total 
      FROM favorites 
      WHERE user_id = ${userId}
    `;
    const total = parseInt(countRows[0].total);
    
    // Get paginated favorites with recipe details
    const { rows } = await sql`
      SELECT 
        f.user_id,
        f.recipe_id,
        f.personal_rating,
        f.personal_notes,
        f.added_at,
        r.*
      FROM favorites f
      JOIN recipes r ON f.recipe_id = r.id
      WHERE f.user_id = ${userId}
      ORDER BY f.added_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const favorites = rows.map(row => transformFavoriteRecord(row as FavoriteRecord & RecipeRecord));
    
    return { favorites, total };
  } catch (error) {
    console.error('Database error: Failed to get user favorites:', error);
    throw new Error('Failed to retrieve user favorites.');
  }
}

/**
 * Checks if a recipe is favorited by a user
 */
export async function isFavorited(userId: string, recipeId: string): Promise<boolean> {
  await ensureFavoritesTableExists();
  
  if (!userId || userId.trim() === '') {
    return false;
  }
  
  if (!recipeId || recipeId.trim() === '') {
    return false;
  }
  
  try {
    const { rows } = await sql`
      SELECT 1 FROM favorites
      WHERE user_id = ${userId} AND recipe_id = ${recipeId}
      LIMIT 1
    `;
    
    return rows.length > 0;
  } catch (error) {
    console.error('Database error: Failed to check if recipe is favorited:', error);
    return false;
  }
}

/**
 * Gets favorite status for multiple recipes for a user
 */
export async function getFavoriteStatusForRecipes(userId: string, recipeIds: string[]): Promise<Record<string, boolean>> {
  await ensureFavoritesTableExists();
  
  if (!userId || userId.trim() === '' || !recipeIds || recipeIds.length === 0) {
    return {};
  }
  
  try {
    // Build query with IN clause for multiple recipe IDs
    const placeholders = recipeIds.map((_, index) => `$${index + 2}`).join(', ');
    const query = `
      SELECT recipe_id 
      FROM favorites 
      WHERE user_id = $1 AND recipe_id IN (${placeholders})
    `;
    
    const result = await sql.query(query, [userId, ...recipeIds]);
    
    // Create result object with all recipes set to false initially
    const favoriteStatus: Record<string, boolean> = {};
    recipeIds.forEach(id => {
      favoriteStatus[id] = false;
    });
    
    // Set favorited recipes to true
    result.rows.forEach(row => {
      favoriteStatus[row.recipe_id] = true;
    });
    
    return favoriteStatus;
  } catch (error) {
    console.error('Database error: Failed to get favorite status for recipes:', error);
    // Return all false on error
    const errorResult: Record<string, boolean> = {};
    recipeIds.forEach(id => {
      errorResult[id] = false;
    });
    return errorResult;
  }
}

/**
 * Updates personal rating and notes for a favorite
 */
export async function updateFavorite(
  userId: string, 
  recipeId: string, 
  personalRating?: number, 
  personalNotes?: string
): Promise<Favorite | null> {
  await ensureFavoritesTableExists();
  
  if (!userId || userId.trim() === '') {
    throw new Error('User ID is required');
  }
  
  if (!recipeId || recipeId.trim() === '') {
    throw new Error('Recipe ID is required');
  }
  
  if (personalRating !== undefined && (personalRating < 1 || personalRating > 5)) {
    throw new Error('Personal rating must be between 1 and 5');
  }
  
  try {
    // Update the favorite
    const result = await sql`
      UPDATE favorites 
      SET 
        personal_rating = ${personalRating || null},
        personal_notes = ${personalNotes || null}
      WHERE user_id = ${userId} AND recipe_id = ${recipeId}
    `;
    
    if ((result.rowCount || 0) === 0) {
      return null; // Favorite doesn't exist
    }
    
    // Get the updated favorite with recipe details
    const { rows } = await sql`
      SELECT 
        f.user_id,
        f.recipe_id,
        f.personal_rating,
        f.personal_notes,
        f.added_at,
        r.*
      FROM favorites f
      JOIN recipes r ON f.recipe_id = r.id
      WHERE f.user_id = ${userId} AND f.recipe_id = ${recipeId}
    `;
    
    if (rows.length === 0) {
      return null;
    }
    
    return transformFavoriteRecord(rows[0] as FavoriteRecord & RecipeRecord);
  } catch (error) {
    console.error('Database error: Failed to update favorite:', error);
    throw new Error('Failed to update favorite.');
  }
}

/**
 * Gets count of favorites for a user
 */
export async function getFavoritesCount(userId: string): Promise<number> {
  await ensureFavoritesTableExists();
  
  if (!userId || userId.trim() === '') {
    return 0;
  }
  
  try {
    const { rows } = await sql`
      SELECT COUNT(*) as count 
      FROM favorites 
      WHERE user_id = ${userId}
    `;
    
    return parseInt(rows[0].count);
  } catch (error) {
    console.error('Database error: Failed to get favorites count:', error);
    return 0;
  }
}