'use server';

import { sql } from '@vercel/postgres';
import type { Recipe, RecipeRecord } from '@/types/database.types';

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
 * Updates an existing recipe in the database
 */
export async function updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
  if (!id || id.trim() === '') {
    throw new Error('Recipe ID is required');
  }
  
  try {
    // First check if recipe exists
    const { rows: existingRows } = await sql`
      SELECT * FROM recipes WHERE id = ${id} LIMIT 1
    `;
    
    if (existingRows.length === 0) {
      throw new Error('Recipe not found');
    }
    
    const existingRecipe = transformRecipeRecord(existingRows[0] as RecipeRecord);
    
    // Check if there are any fields to update
    const hasUpdates = Object.keys(updates).some(key => 
      key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && 
      key !== 'totalTime' && key !== 'avgRating' && key !== 'ratingCount'
    );
    
    if (!hasUpdates) {
      throw new Error('No fields to update');
    }
    
    // Use template literals for the update query - only update provided fields
    const { rows } = await sql`
      UPDATE recipes 
      SET 
        name = ${updates.name !== undefined ? updates.name : existingRecipe.name},
        description = ${updates.description !== undefined ? updates.description : existingRecipe.description},
        ingredients = ${updates.ingredients !== undefined ? JSON.stringify(updates.ingredients) : JSON.stringify(existingRecipe.ingredients)}::jsonb,
        instructions = ${updates.instructions !== undefined ? updates.instructions : existingRecipe.instructions},
        nutrition_info = ${updates.nutritionInfo !== undefined ? JSON.stringify(updates.nutritionInfo) : JSON.stringify(existingRecipe.nutritionInfo)}::jsonb,
        cuisine = ${updates.cuisine !== undefined ? updates.cuisine : existingRecipe.cuisine},
        prep_time = ${updates.prepTime !== undefined ? updates.prepTime : existingRecipe.prepTime},
        cook_time = ${updates.cookTime !== undefined ? updates.cookTime : existingRecipe.cookTime},
        difficulty = ${updates.difficulty !== undefined ? updates.difficulty : existingRecipe.difficulty},
        image_url = ${updates.imageUrl !== undefined ? updates.imageUrl : existingRecipe.imageUrl},
        tags = ${updates.tags !== undefined ? updates.tags : existingRecipe.tags},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (rows.length === 0) {
      throw new Error('Recipe not found or update failed');
    }
    
    return transformRecipeRecord(rows[0] as RecipeRecord);
  } catch (error) {
    console.error(`Database error: Failed to update recipe "${id}":`, error);
    
    if (error instanceof Error) {
      throw new Error(`Failed to update recipe: ${error.message}`);
    } else {
      throw new Error(`Failed to update recipe in the database: ${JSON.stringify(error)}`);
    }
  }
}

/**
 * Gets recipes created by a specific user
 */
export async function getRecipesByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<{ recipes: Recipe[]; total: number }> {
  if (!userId || userId.trim() === '') {
    throw new Error('User ID is required');
  }
  
  try {
    // Get total count for user's recipes
    const { rows: countRows } = await sql`
      SELECT COUNT(*) as total FROM recipes 
      WHERE created_by_user_id = ${userId}
    `;
    const total = parseInt(countRows[0].total);
    
    // Get paginated results
    const { rows } = await sql`
      SELECT * FROM recipes 
      WHERE created_by_user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const recipes = rows.map(row => transformRecipeRecord(row as RecipeRecord));
    
    return { recipes, total };
  } catch (error) {
    console.error(`Database error: Failed to retrieve recipes for user "${userId}":`, error);
    throw new Error(`Failed to retrieve recipes for user "${userId}" from the database.`);
  }
}

/**
 * Checks if a recipe is used in any meal plans
 */
export async function isRecipeUsedInMealPlans(recipeId: string): Promise<boolean> {
  if (!recipeId || recipeId.trim() === '') {
    return false;
  }
  
  try {
    const { rows } = await sql`
      SELECT COUNT(*) as count FROM meal_plan_items 
      WHERE recipe_id = ${recipeId}
    `;
    
    return parseInt(rows[0].count) > 0;
  } catch (error) {
    console.error(`Database error: Failed to check recipe usage for "${recipeId}":`, error);
    // Return true to be safe - prevent deletion if we can't check
    return true;
  }
}

/**
 * Removes a recipe from all meal plans (used before deletion)
 */
export async function removeRecipeFromMealPlans(recipeId: string): Promise<void> {
  if (!recipeId || recipeId.trim() === '') {
    return;
  }
  
  try {
    await sql`
      DELETE FROM meal_plan_items 
      WHERE recipe_id = ${recipeId}
    `;
  } catch (error) {
    console.error(`Database error: Failed to remove recipe "${recipeId}" from meal plans:`, error);
    throw new Error(`Failed to remove recipe from meal plans: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deletes a recipe from the database
 */
export async function deleteRecipe(id: string, options: { removeFromMealPlans?: boolean } = {}): Promise<void> {
  if (!id || id.trim() === '') {
    throw new Error('Recipe ID is required');
  }
  
  try {
    // First check if recipe exists
    const { rows: existingRows } = await sql`
      SELECT * FROM recipes WHERE id = ${id} LIMIT 1
    `;
    
    if (existingRows.length === 0) {
      throw new Error('Recipe not found');
    }
    
    // Check if recipe is used in meal plans
    const isUsed = await isRecipeUsedInMealPlans(id);
    if (isUsed && !options.removeFromMealPlans) {
      throw new Error('Recipe is currently used in meal plans. Remove it from meal plans first or use the removeFromMealPlans option.');
    }
    
    // Remove from meal plans if requested
    if (isUsed && options.removeFromMealPlans) {
      await removeRecipeFromMealPlans(id);
    }
    
    // Delete the recipe
    const { rowCount } = await sql`
      DELETE FROM recipes 
      WHERE id = ${id}
    `;
    
    if (rowCount === 0) {
      throw new Error('Recipe not found or deletion failed');
    }
  } catch (error) {
    console.error(`Database error: Failed to delete recipe "${id}":`, error);
    
    if (error instanceof Error) {
      throw new Error(`Failed to delete recipe: ${error.message}`);
    } else {
      throw new Error(`Failed to delete recipe from the database: ${JSON.stringify(error)}`);
    }
  }
}