'use server';

import { sql } from '@vercel/postgres';
import type { 
  Recipe, 
  RecipeRecord, 
  Ingredient, 
  NutritionInfo, 
  RecipeSearchFilters,
  DatabaseError 
} from '@/types/database.types';

/**
 * Ensures the recipes table exists with proper schema and indexes
 */
async function ensureRecipesTableExists(): Promise<void> {
  try {
    // Create recipes table
    await sql`
      CREATE TABLE IF NOT EXISTS recipes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_by_user_id UUID,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        ingredients JSONB NOT NULL,
        instructions TEXT NOT NULL,
        nutrition_info JSONB DEFAULT '{}',
        cuisine VARCHAR(100),
        prep_time INTEGER DEFAULT 0,
        cook_time INTEGER DEFAULT 0,
        total_time INTEGER GENERATED ALWAYS AS (prep_time + cook_time) STORED,
        difficulty VARCHAR(10) NOT NULL,
        avg_rating DECIMAL(3,2) DEFAULT 0.00,
        rating_count INTEGER DEFAULT 0,
        image_url VARCHAR(500),
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create performance indexes (each in separate statement)
    await sql`CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_recipes_avg_rating ON recipes(avg_rating DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN(tags)`;
    
    // Full-text search index
    await sql`
      CREATE INDEX IF NOT EXISTS idx_recipes_search 
      ON recipes USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')))
    `;

  } catch (error) {
    console.error("Database error: Failed to ensure 'recipes' table exists:", error);
    throw new Error("Failed to initialize database table 'recipes'.");
  }
}

/**
 * Validates recipe data before database operations
 */
function validateRecipeData(recipe: Partial<Recipe>, isUpdate: boolean = false): void {
  if (!isUpdate) {
    // Full validation for create operations
    if (!recipe.name || recipe.name.trim() === '') {
      throw new Error('Recipe name is required');
    }
    
    if (!recipe.ingredients || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      throw new Error('Recipe must have at least one ingredient');
    }
    
    if (!recipe.instructions || recipe.instructions.trim() === '') {
      throw new Error('Recipe instructions are required');
    }
  } else {
    // Partial validation for update operations
    if (recipe.name !== undefined && (!recipe.name || recipe.name.trim() === '')) {
      throw new Error('Recipe name cannot be empty');
    }
    
    if (recipe.ingredients !== undefined && (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0)) {
      throw new Error('Recipe must have at least one ingredient');
    }
    
    if (recipe.instructions !== undefined && (!recipe.instructions || recipe.instructions.trim() === '')) {
      throw new Error('Recipe instructions cannot be empty');
    }
  }
    
  if (recipe.difficulty && !['easy', 'medium', 'hard'].includes(recipe.difficulty)) {
    throw new Error('Invalid difficulty level');
  }
  
  if (recipe.prepTime !== undefined && recipe.prepTime < 0) {
    throw new Error('Prep time cannot be negative');
  }
  
  if (recipe.cookTime !== undefined && recipe.cookTime < 0) {
    throw new Error('Cook time cannot be negative');
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
 * Creates a new recipe in the database
 */
export async function createRecipe(recipe: Omit<Recipe, 'id' | 'totalTime' | 'avgRating' | 'ratingCount' | 'createdAt' | 'updatedAt'>): Promise<Recipe> {
  await ensureRecipesTableExists();
  validateRecipeData(recipe);
  
  try {
    const { rows } = await sql`
      INSERT INTO recipes (
        created_by_user_id, name, description, ingredients, instructions,
        nutrition_info, cuisine, prep_time, cook_time,
        difficulty, image_url, tags
      )
      VALUES (
        ${recipe.createdByUserId || null},
        ${recipe.name},
        ${recipe.description || null},
        ${JSON.stringify(recipe.ingredients)}::jsonb,
        ${recipe.instructions},
        ${JSON.stringify(recipe.nutritionInfo || {})}::jsonb,
        ${recipe.cuisine || null},
        ${recipe.prepTime || 0},
        ${recipe.cookTime || 0},
        ${recipe.difficulty || 'medium'},
        ${recipe.imageUrl || null},
        ${JSON.stringify(recipe.tags || [])}
      )
      RETURNING *
    `;
    
    if (rows.length === 0) {
      throw new Error('Failed to create recipe');
    }
    
    return transformRecipeRecord(rows[0] as RecipeRecord);
  } catch (error) {
    console.error('Database error: Failed to create recipe:', error);
    
    // Preserve the original error for debugging
    if (error instanceof Error) {
      throw new Error(`Failed to create recipe in the database: ${error.message}`);
    } else {
      throw new Error(`Failed to create recipe in the database: ${JSON.stringify(error)}`);
    }
  }
}

/**
 * Retrieves a recipe by ID
 */
export async function getRecipeById(id: string): Promise<Recipe | null> {
  await ensureRecipesTableExists();
  
  if (!id || id.trim() === '') {
    return null;
  }
  
  try {
    const { rows } = await sql`
      SELECT * FROM recipes
      WHERE id = ${id}
      LIMIT 1
    `;
    
    if (rows.length === 0) {
      return null;
    }
    
    return transformRecipeRecord(rows[0] as RecipeRecord);
  } catch (error) {
    console.error(`Database error: Failed to retrieve recipe by ID "${id}":`, error);
    throw new Error(`Failed to retrieve recipe "${id}" from the database.`);
  }
}

/**
 * Searches recipes with filters and full-text search
 */
export async function searchRecipes(filters: RecipeSearchFilters = {}): Promise<{ recipes: Recipe[]; total: number }> {
  await ensureRecipesTableExists();
  
  try {
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    
    // Get total count
    const { rows: countRows } = await sql`SELECT COUNT(*) as total FROM recipes`;
    const total = parseInt(countRows[0].total);
    
    // Get paginated results with basic filtering
    let searchResult;
    
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const searchQuery = filters.searchQuery.trim();
      searchResult = await sql`
        SELECT * FROM recipes 
        WHERE to_tsvector('english', name || ' ' || COALESCE(description, '')) @@ plainto_tsquery(${searchQuery})
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      searchResult = await sql`
        SELECT * FROM recipes 
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }
    
    const recipes = searchResult.rows.map(row => transformRecipeRecord(row as RecipeRecord));
    
    return { recipes, total };
  } catch (error) {
    console.error('Database error: Failed to search recipes:', error);
    throw new Error('Failed to search recipes in the database.');
  }
}

/**
 * Gets all recipes with optional basic filtering
 */
export async function getAllRecipes(limit: number = 50, offset: number = 0): Promise<{ recipes: Recipe[]; total: number }> {
  return await searchRecipes({ limit, offset, sortBy: 'created_at', sortOrder: 'desc' });
}


/**
 * Gets recipes created by a specific user
 */
export async function getRecipesByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<{ recipes: Recipe[]; total: number }> {
  await ensureRecipesTableExists();
  
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
 * Updates an existing recipe in the database
 */
export async function updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
  await ensureRecipesTableExists();
  
  if (!id || id.trim() === '') {
    throw new Error('Recipe ID is required');
  }
  
  validateRecipeData(updates, true); // Partial validation for updates
  
  try {
    // First check if recipe exists
    const existingRecipe = await getRecipeById(id);
    if (!existingRecipe) {
      throw new Error('Recipe not found');
    }
    
    // Build dynamic update query based on provided fields
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(updates.name);
    }
    
    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(updates.description);
    }
    
    if (updates.ingredients !== undefined) {
      updateFields.push(`ingredients = $${paramIndex++}::jsonb`);
      updateValues.push(JSON.stringify(updates.ingredients));
    }
    
    if (updates.instructions !== undefined) {
      updateFields.push(`instructions = $${paramIndex++}`);
      updateValues.push(updates.instructions);
    }
    
    if (updates.nutritionInfo !== undefined) {
      updateFields.push(`nutrition_info = $${paramIndex++}::jsonb`);
      updateValues.push(JSON.stringify(updates.nutritionInfo));
    }
    
    if (updates.cuisine !== undefined) {
      updateFields.push(`cuisine = $${paramIndex++}`);
      updateValues.push(updates.cuisine);
    }
    
    if (updates.prepTime !== undefined) {
      updateFields.push(`prep_time = $${paramIndex++}`);
      updateValues.push(updates.prepTime);
    }
    
    if (updates.cookTime !== undefined) {
      updateFields.push(`cook_time = $${paramIndex++}`);
      updateValues.push(updates.cookTime);
    }
    
    if (updates.difficulty !== undefined) {
      updateFields.push(`difficulty = $${paramIndex++}`);
      updateValues.push(updates.difficulty);
    }
    
    if (updates.imageUrl !== undefined) {
      updateFields.push(`image_url = $${paramIndex++}`);
      updateValues.push(updates.imageUrl);
    }
    
    if (updates.tags !== undefined) {
      updateFields.push(`tags = $${paramIndex++}`);
      updateValues.push(updates.tags);
    }
    
    // Always update the updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updateFields.length === 1) { // Only updated_at was added
      throw new Error('No fields to update');
    }
    
    // Add the ID parameter at the end
    updateValues.push(id);
    
    const query = `
      UPDATE recipes 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const { rows } = await sql.query(query, updateValues);
    
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
  await ensureRecipesTableExists();
  
  if (!id || id.trim() === '') {
    throw new Error('Recipe ID is required');
  }
  
  try {
    // First check if recipe exists
    const existingRecipe = await getRecipeById(id);
    if (!existingRecipe) {
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

/**
 * Updates an existing recipe in the database (corrected version)
 */
export async function updateRecipeFixed(id: string, updates: Partial<Recipe>): Promise<Recipe> {
  await ensureRecipesTableExists();
  
  if (!id || id.trim() === '') {
    throw new Error('Recipe ID is required');
  }
  
  validateRecipeData(updates, true); // Partial validation for updates
  
  try {
    // First check if recipe exists
    const existingRecipe = await getRecipeById(id);
    if (!existingRecipe) {
      throw new Error('Recipe not found');
    }
    
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
        tags = ${updates.tags !== undefined ? JSON.stringify(updates.tags) : JSON.stringify(existingRecipe.tags)},
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