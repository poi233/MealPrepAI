'use server';

import { sql } from '@vercel/postgres';
import type { Recipe, RecipeRecord } from '../types/database.types';

/**
 * Ensures relationship tables exist for recipe tracking
 */
async function ensureRelationshipTablesExist(): Promise<void> {
  try {
    // Create meal_plans table
    await sql`
      CREATE TABLE IF NOT EXISTS meal_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        week_start_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      )
    `;

    // Create meal_plan_items table
    await sql`
      CREATE TABLE IF NOT EXISTS meal_plan_items (
        meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
        recipe_id UUID NOT NULL,
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (meal_plan_id, day_of_week, meal_type)
      )
    `;

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

    // Create collections table
    await sql`
      CREATE TABLE IF NOT EXISTS collections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#4DB6AC',
        icon VARCHAR(50) DEFAULT 'heart',
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      )
    `;

    // Create collection_recipes table
    await sql`
      CREATE TABLE IF NOT EXISTS collection_recipes (
        collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        recipe_id UUID NOT NULL,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (collection_id, recipe_id)
      )
    `;

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_meal_plan_items_recipe_id ON meal_plan_items(recipe_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_favorites_recipe_id ON favorites(recipe_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_collection_recipes_recipe_id ON collection_recipes(recipe_id)`;

  } catch (error) {
    console.error("Database error: Failed to ensure relationship tables exist:", error);
    throw new Error("Failed to initialize relationship tracking tables.");
  }
}

/**
 * Gets recipe usage statistics across meal plans and favorites
 */
export async function getRecipeUsageStats(recipeId: string): Promise<{
  mealPlanUsage: number;
  favoritesCount: number;
  collectionsCount: number;
  totalUsage: number;
  lastUsed?: Date;
}> {
  await ensureRelationshipTablesExist();
  
  if (!recipeId || recipeId.trim() === '') {
    throw new Error('Recipe ID is required');
  }
  
  try {
    // Get meal plan usage count
    const { rows: mealPlanRows } = await sql`
      SELECT COUNT(*) as count
      FROM meal_plan_items
      WHERE recipe_id = ${recipeId}
    `;
    
    // Get favorites count
    const { rows: favoritesRows } = await sql`
      SELECT COUNT(*) as count
      FROM favorites
      WHERE recipe_id = ${recipeId}
    `;
    
    // Get collections count
    const { rows: collectionsRows } = await sql`
      SELECT COUNT(*) as count
      FROM collection_recipes
      WHERE recipe_id = ${recipeId}
    `;
    
    // Get last used date (most recent from meal plans or favorites)
    const { rows: lastUsedRows } = await sql`
      SELECT MAX(last_activity) as last_used
      FROM (
        SELECT MAX(added_at) as last_activity FROM meal_plan_items WHERE recipe_id = ${recipeId}
        UNION ALL
        SELECT MAX(added_at) as last_activity FROM favorites WHERE recipe_id = ${recipeId}
        UNION ALL
        SELECT MAX(added_at) as last_activity FROM collection_recipes WHERE recipe_id = ${recipeId}
      ) activities
    `;
    
    const mealPlanUsage = parseInt(mealPlanRows[0].count);
    const favoritesCount = parseInt(favoritesRows[0].count);
    const collectionsCount = parseInt(collectionsRows[0].count);
    
    return {
      mealPlanUsage,
      favoritesCount,
      collectionsCount,
      totalUsage: mealPlanUsage + favoritesCount + collectionsCount,
      lastUsed: lastUsedRows[0].last_used ? new Date(lastUsedRows[0].last_used) : undefined
    };
  } catch (error) {
    console.error(`Database error: Failed to get recipe usage stats for "${recipeId}":`, error);
    throw new Error(`Failed to get recipe usage statistics for "${recipeId}".`);
  }
}

/**
 * Gets all recipes that reference a specific recipe (for relationship tracking)
 */
export async function getRecipeRelationships(recipeId: string): Promise<{
  mealPlans: { planId: string; planName: string; dayOfWeek: number; mealType: string; addedAt: Date }[];
  favoritedBy: { userId: string; personalRating?: number; addedAt: Date }[];
  inCollections: { collectionId: string; collectionName: string; userId: string; addedAt: Date }[];
}> {
  await ensureRelationshipTablesExist();
  
  if (!recipeId || recipeId.trim() === '') {
    throw new Error('Recipe ID is required');
  }
  
  try {
    // Get meal plan relationships
    const { rows: mealPlanRows } = await sql`
      SELECT 
        mp.id as plan_id,
        mp.name as plan_name,
        mpi.day_of_week,
        mpi.meal_type,
        mpi.added_at
      FROM meal_plan_items mpi
      JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
      WHERE mpi.recipe_id = ${recipeId}
      ORDER BY mpi.added_at DESC
    `;
    
    // Get favorites relationships
    const { rows: favoritesRows } = await sql`
      SELECT 
        user_id,
        personal_rating,
        added_at
      FROM favorites
      WHERE recipe_id = ${recipeId}
      ORDER BY added_at DESC
    `;
    
    // Get collection relationships
    const { rows: collectionsRows } = await sql`
      SELECT 
        c.id as collection_id,
        c.name as collection_name,
        c.user_id,
        cr.added_at
      FROM collection_recipes cr
      JOIN collections c ON cr.collection_id = c.id
      WHERE cr.recipe_id = ${recipeId}
      ORDER BY cr.added_at DESC
    `;
    
    return {
      mealPlans: mealPlanRows.map(row => ({
        planId: row.plan_id,
        planName: row.plan_name,
        dayOfWeek: row.day_of_week,
        mealType: row.meal_type,
        addedAt: new Date(row.added_at)
      })),
      favoritedBy: favoritesRows.map(row => ({
        userId: row.user_id,
        personalRating: row.personal_rating,
        addedAt: new Date(row.added_at)
      })),
      inCollections: collectionsRows.map(row => ({
        collectionId: row.collection_id,
        collectionName: row.collection_name,
        userId: row.user_id,
        addedAt: new Date(row.added_at)
      }))
    };
  } catch (error) {
    console.error(`Database error: Failed to get recipe relationships for "${recipeId}":`, error);
    throw new Error(`Failed to get recipe relationships for "${recipeId}".`);
  }
}

/**
 * Updates recipe rating based on personal ratings from favorites
 */
export async function recalculateRecipeRating(recipeId: string): Promise<void> {
  await ensureRelationshipTablesExist();
  
  if (!recipeId || recipeId.trim() === '') {
    throw new Error('Recipe ID is required');
  }
  
  try {
    // Calculate average rating from favorites table
    const { rows } = await sql`
      SELECT 
        AVG(personal_rating) as avg_rating,
        COUNT(personal_rating) as rating_count
      FROM favorites
      WHERE recipe_id = ${recipeId} AND personal_rating IS NOT NULL
    `;
    
    const avgRating = rows[0].avg_rating ? parseFloat(rows[0].avg_rating) : 0;
    const ratingCount = parseInt(rows[0].rating_count);
    
    // Update recipe with new rating
    await sql`
      UPDATE recipes 
      SET 
        avg_rating = ${avgRating},
        rating_count = ${ratingCount},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${recipeId}
    `;
  } catch (error) {
    console.error(`Database error: Failed to recalculate recipe rating for "${recipeId}":`, error);
    throw new Error(`Failed to recalculate recipe rating for "${recipeId}".`);
  }
}

/**
 * Adds a personal rating to a recipe (through favorites)
 */
export async function addRecipeRating(userId: string, recipeId: string, rating: number, notes?: string): Promise<void> {
  await ensureRelationshipTablesExist();
  
  if (!userId || userId.trim() === '') {
    throw new Error('User ID is required');
  }
  
  if (!recipeId || recipeId.trim() === '') {
    throw new Error('Recipe ID is required');
  }
  
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }
  
  try {
    // Add or update favorite with rating
    await sql`
      INSERT INTO favorites (user_id, recipe_id, personal_rating, personal_notes)
      VALUES (${userId}, ${recipeId}, ${rating}, ${notes || null})
      ON CONFLICT (user_id, recipe_id)
      DO UPDATE SET
        personal_rating = EXCLUDED.personal_rating,
        personal_notes = EXCLUDED.personal_notes,
        added_at = CURRENT_TIMESTAMP
    `;
    
    // Recalculate recipe's average rating
    await recalculateRecipeRating(recipeId);
  } catch (error) {
    console.error(`Database error: Failed to add recipe rating for "${recipeId}":`, error);
    throw new Error(`Failed to add recipe rating for "${recipeId}".`);
  }
}

/**
 * Removes a personal rating from a recipe
 */
export async function removeRecipeRating(userId: string, recipeId: string): Promise<void> {
  await ensureRelationshipTablesExist();
  
  if (!userId || userId.trim() === '') {
    throw new Error('User ID is required');
  }
  
  if (!recipeId || recipeId.trim() === '') {
    throw new Error('Recipe ID is required');
  }
  
  try {
    // Remove rating but keep favorite if it exists
    await sql`
      UPDATE favorites 
      SET 
        personal_rating = NULL,
        added_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId} AND recipe_id = ${recipeId}
    `;
    
    // Recalculate recipe's average rating
    await recalculateRecipeRating(recipeId);
  } catch (error) {
    console.error(`Database error: Failed to remove recipe rating for "${recipeId}":`, error);
    throw new Error(`Failed to remove recipe rating for "${recipeId}".`);
  }
}

/**
 * Handles recipe sharing by creating a copy for the target user
 */
export async function shareRecipe(recipeId: string, fromUserId: string, toUserId: string): Promise<string> {
  await ensureRelationshipTablesExist();
  
  if (!recipeId || recipeId.trim() === '') {
    throw new Error('Recipe ID is required');
  }
  
  if (!fromUserId || fromUserId.trim() === '') {
    throw new Error('From User ID is required');
  }
  
  if (!toUserId || toUserId.trim() === '') {
    throw new Error('To User ID is required');
  }
  
  try {
    // Get the original recipe
    const { rows: recipeRows } = await sql`
      SELECT * FROM recipes WHERE id = ${recipeId}
    `;
    
    if (recipeRows.length === 0) {
      throw new Error('Recipe not found');
    }
    
    const originalRecipe = recipeRows[0];
    
    // Verify ownership (optional - recipes can be shared by anyone)
    if (originalRecipe.created_by_user_id && originalRecipe.created_by_user_id !== fromUserId) {
      console.warn(`Recipe ${recipeId} is being shared by non-owner ${fromUserId}`);
    }
    
    // Create a copy of the recipe for the new user
    const { rows: newRecipeRows } = await sql`
      INSERT INTO recipes (
        created_by_user_id, name, description, ingredients, instructions,
        nutrition_info, cuisine, meal_type, prep_time, cook_time,
        difficulty, image_url, tags
      )
      VALUES (
        ${toUserId},
        ${originalRecipe.name + ' (Shared)'},
        ${originalRecipe.description},
        ${JSON.stringify(originalRecipe.ingredients)},
        ${originalRecipe.instructions},
        ${JSON.stringify(originalRecipe.nutrition_info)},
        ${originalRecipe.cuisine},
        ${originalRecipe.meal_type},
        ${originalRecipe.prep_time},
        ${originalRecipe.cook_time},
        ${originalRecipe.difficulty},
        ${originalRecipe.image_url},
        ${originalRecipe.tags}
      )
      RETURNING id
    `;
    
    return newRecipeRows[0].id;
  } catch (error) {
    console.error(`Database error: Failed to share recipe "${recipeId}":`, error);
    throw new Error(`Failed to share recipe "${recipeId}".`);
  }
}

/**
 * Gets popular recipes based on usage across meal plans and favorites
 */
export async function getPopularRecipes(limit: number = 10): Promise<Recipe[]> {
  await ensureRelationshipTablesExist();
  
  try {
    const { rows } = await sql`
      SELECT 
        r.*,
        (COALESCE(mp_stats.meal_plan_usage, 0) + 
         COALESCE(fav_stats.favorites_count, 0) + 
         COALESCE(col_stats.collections_count, 0)) as total_usage
      FROM recipes r
      LEFT JOIN (
        SELECT recipe_id, COUNT(*) as meal_plan_usage
        FROM meal_plan_items
        GROUP BY recipe_id
      ) mp_stats ON r.id = mp_stats.recipe_id
      LEFT JOIN (
        SELECT recipe_id, COUNT(*) as favorites_count
        FROM favorites
        GROUP BY recipe_id
      ) fav_stats ON r.id = fav_stats.recipe_id
      LEFT JOIN (
        SELECT recipe_id, COUNT(*) as collections_count
        FROM collection_recipes
        GROUP BY recipe_id
      ) col_stats ON r.id = col_stats.recipe_id
      WHERE r.avg_rating >= 3.0
      ORDER BY total_usage DESC, r.avg_rating DESC
      LIMIT ${limit}
    `;
    
    return rows.map(row => transformRecipeRecord(row as RecipeRecord));
  } catch (error) {
    console.error('Database error: Failed to get popular recipes:', error);
    throw new Error('Failed to get popular recipes.');
  }
}

/**
 * Gets recipes with their usage statistics for a user
 */
export async function getRecipesWithUsageStats(userId?: string, limit: number = 20): Promise<Array<Recipe & {
  usageStats: {
    mealPlanUsage: number;
    favoritesCount: number;
    collectionsCount: number;
    totalUsage: number;
    isUserFavorite: boolean;
    userRating?: number;
  };
}>> {
  await ensureRelationshipTablesExist();
  
  try {
    let query;
    
    if (userId) {
      // Get recipes with user-specific usage stats
      query = sql`
        SELECT 
          r.*,
          COALESCE(mp_stats.meal_plan_usage, 0) as meal_plan_usage,
          COALESCE(fav_stats.favorites_count, 0) as favorites_count,
          COALESCE(col_stats.collections_count, 0) as collections_count,
          CASE WHEN uf.recipe_id IS NOT NULL THEN true ELSE false END as is_user_favorite,
          uf.personal_rating as user_rating
        FROM recipes r
        LEFT JOIN (
          SELECT recipe_id, COUNT(*) as meal_plan_usage
          FROM meal_plan_items
          GROUP BY recipe_id
        ) mp_stats ON r.id = mp_stats.recipe_id
        LEFT JOIN (
          SELECT recipe_id, COUNT(*) as favorites_count
          FROM favorites
          GROUP BY recipe_id
        ) fav_stats ON r.id = fav_stats.recipe_id
        LEFT JOIN (
          SELECT recipe_id, COUNT(*) as collections_count
          FROM collection_recipes
          GROUP BY recipe_id
        ) col_stats ON r.id = col_stats.recipe_id
        LEFT JOIN favorites uf ON r.id = uf.recipe_id AND uf.user_id = ${userId}
        ORDER BY r.avg_rating DESC, r.created_at DESC
        LIMIT ${limit}
      `;
    } else {
      // Get recipes with general usage stats
      query = sql`
        SELECT 
          r.*,
          COALESCE(mp_stats.meal_plan_usage, 0) as meal_plan_usage,
          COALESCE(fav_stats.favorites_count, 0) as favorites_count,
          COALESCE(col_stats.collections_count, 0) as collections_count,
          false as is_user_favorite,
          NULL as user_rating
        FROM recipes r
        LEFT JOIN (
          SELECT recipe_id, COUNT(*) as meal_plan_usage
          FROM meal_plan_items
          GROUP BY recipe_id
        ) mp_stats ON r.id = mp_stats.recipe_id
        LEFT JOIN (
          SELECT recipe_id, COUNT(*) as favorites_count
          FROM favorites
          GROUP BY recipe_id
        ) fav_stats ON r.id = fav_stats.recipe_id
        LEFT JOIN (
          SELECT recipe_id, COUNT(*) as collections_count
          FROM collection_recipes
          GROUP BY recipe_id
        ) col_stats ON r.id = col_stats.recipe_id
        ORDER BY r.avg_rating DESC, r.created_at DESC
        LIMIT ${limit}
      `;
    }
    
    const { rows } = await query;
    
    return rows.map(row => {
      const recipe = transformRecipeRecord(row as RecipeRecord);
      const mealPlanUsage = parseInt(row.meal_plan_usage) || 0;
      const favoritesCount = parseInt(row.favorites_count) || 0;
      const collectionsCount = parseInt(row.collections_count) || 0;
      
      return {
        ...recipe,
        usageStats: {
          mealPlanUsage,
          favoritesCount,
          collectionsCount,
          totalUsage: mealPlanUsage + favoritesCount + collectionsCount,
          isUserFavorite: row.is_user_favorite || false,
          userRating: row.user_rating || undefined
        }
      };
    });
  } catch (error) {
    console.error('Database error: Failed to get recipes with usage stats:', error);
    throw new Error('Failed to get recipes with usage statistics.');
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