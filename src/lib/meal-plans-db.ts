'use server';

import { sql } from '@vercel/postgres';
import type { 
  MealPlan, 
  MealPlanItem, 
  MealPlanRecord, 
  MealPlanItemRecord,
  Recipe,
  RecipeRecord,
  MealPlanFilters 
} from '../types/database.types';

/**
 * Creates a mock user for testing purposes
 */
export async function createMockUser(userId: string): Promise<void> {
  try {
    await sql`
      INSERT INTO users (id, username, email, display_name, dietary_preferences)
      VALUES (${userId}, 'testuser', 'test@example.com', 'Test User', '{}')
      ON CONFLICT (id) DO NOTHING
    `;
  } catch (error) {
    console.error('Failed to create mock user:', error);
    // Don't throw error, just log it
  }
}

/**
 * Ensures normalized meal plan tables exist
 */
async function ensureMealPlanTablesExist(): Promise<void> {
  try {
    // Create users table first (for foreign key reference)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        display_name VARCHAR(255),
        dietary_preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

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

    // Add foreign key constraint to meal_plans
    await sql`
      ALTER TABLE meal_plans 
      ADD CONSTRAINT fk_meal_plans_user 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

    // Create recipes table if it doesn't exist (for foreign key reference)
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
        meal_type VARCHAR(20) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
        prep_time INTEGER DEFAULT 0,
        cook_time INTEGER DEFAULT 0,
        total_time INTEGER GENERATED ALWAYS AS (prep_time + cook_time) STORED,
        difficulty VARCHAR(10) CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
        avg_rating DECIMAL(3,2) DEFAULT 0.00,
        rating_count INTEGER DEFAULT 0,
        image_url VARCHAR(500),
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Add foreign key constraint to meal_plan_items
    await sql`
      ALTER TABLE meal_plan_items 
      ADD CONSTRAINT fk_meal_plan_items_recipe 
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    `;

    // Create performance indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_meal_plans_active ON meal_plans(user_id, is_active) WHERE is_active = true`;
    await sql`CREATE INDEX IF NOT EXISTS idx_meal_plans_week_start ON meal_plans(week_start_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_meal_plan_items_plan_id ON meal_plan_items(meal_plan_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_meal_plan_items_recipe_id ON meal_plan_items(recipe_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_meal_plan_items_day_meal ON meal_plan_items(day_of_week, meal_type)`;

    // Create update trigger for meal_plans
    await sql`
      CREATE OR REPLACE FUNCTION update_meal_plan_updated_at()
      RETURNS TRIGGER AS $
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $ language 'plpgsql'
    `;

    await sql`
      DROP TRIGGER IF EXISTS update_meal_plans_updated_at ON meal_plans
    `;

    await sql`
      CREATE TRIGGER update_meal_plans_updated_at 
      BEFORE UPDATE ON meal_plans
      FOR EACH ROW EXECUTE FUNCTION update_meal_plan_updated_at()
    `;

  } catch (error: unknown) {
    // Ignore constraint already exists errors
    if (!(error instanceof Error && error.message && error.message.includes('already exists'))) {
      console.error("Database error: Failed to ensure meal plan tables exist:", error);
      throw new Error("Failed to initialize meal plan database tables.");
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
    mealType: record.meal_type,
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
 * Transforms database record to MealPlan type
 */
function transformMealPlanRecord(record: MealPlanRecord, items: MealPlanItem[] = []): MealPlan {
  return {
    id: record.id,
    userId: record.user_id,
    name: record.name,
    description: record.description,
    weekStartDate: record.week_start_date,
    isActive: record.is_active,
    items: items,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

/**
 * Creates a new meal plan
 */
export async function createMealPlan(mealPlan: Omit<MealPlan, 'id' | 'items' | 'createdAt' | 'updatedAt'>): Promise<MealPlan> {
  await ensureMealPlanTablesExist();
  
  if (!mealPlan.userId || mealPlan.userId.trim() === '') {
    throw new Error('User ID is required');
  }
  
  if (!mealPlan.name || mealPlan.name.trim() === '') {
    throw new Error('Meal plan name is required');
  }
  
  if (!mealPlan.weekStartDate) {
    throw new Error('Week start date is required');
  }
  
  try {
    const { rows } = await sql`
      INSERT INTO meal_plans (user_id, name, description, week_start_date, is_active)
      VALUES (${mealPlan.userId}, ${mealPlan.name}, ${mealPlan.description || null}, ${mealPlan.weekStartDate.toISOString().split('T')[0]}, ${mealPlan.isActive || false})
      RETURNING *
    `;
    
    if (rows.length === 0) {
      throw new Error('Failed to create meal plan');
    }
    
    return transformMealPlanRecord(rows[0] as MealPlanRecord);
  } catch (error) {
    console.error('Database error: Failed to create meal plan:', error);
    throw new Error('Failed to create meal plan in the database.');
  }
}

/**
 * Retrieves a meal plan by ID with all items and recipe details
 */
export async function getMealPlanById(id: string): Promise<MealPlan | null> {
  await ensureMealPlanTablesExist();
  
  if (!id || id.trim() === '') {
    return null;
  }
  
  try {
    // Get meal plan
    const { rows: planRows } = await sql`
      SELECT * FROM meal_plans
      WHERE id = ${id}
      LIMIT 1
    `;
    
    if (planRows.length === 0) {
      return null;
    }
    
    // Get meal plan items with recipe details using JOIN
    const { rows: itemRows } = await sql`
      SELECT 
        mpi.meal_plan_id,
        mpi.recipe_id,
        mpi.day_of_week,
        mpi.meal_type,
        mpi.added_at,
        r.*
      FROM meal_plan_items mpi
      JOIN recipes r ON mpi.recipe_id = r.id
      WHERE mpi.meal_plan_id = ${id}
      ORDER BY mpi.day_of_week, mpi.meal_type
    `;
    
    const items: MealPlanItem[] = itemRows.map(row => ({
      mealPlanId: row.meal_plan_id,
      recipeId: row.recipe_id,
      recipe: transformRecipeRecord(row as RecipeRecord),
      dayOfWeek: row.day_of_week,
      mealType: row.meal_type,
      addedAt: row.added_at
    }));
    
    return transformMealPlanRecord(planRows[0] as MealPlanRecord, items);
  } catch (error) {
    console.error(`Database error: Failed to retrieve meal plan by ID "${id}":`, error);
    throw new Error(`Failed to retrieve meal plan "${id}" from the database.`);
  }
}

/**
 * Retrieves meal plans for a user with filtering and pagination - FIXED VERSION
 */
export async function getMealPlansForUser(filters: MealPlanFilters): Promise<{ mealPlans: MealPlan[]; total: number }> {
  await ensureMealPlanTablesExist();
  
  if (!filters.userId || filters.userId.trim() === '') {
    throw new Error('User ID is required');
  }
  
  try {
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    // Get total count using template literals
    let countResult;
    if (filters.isActive !== undefined && filters.weekStartDate) {
      countResult = await sql`
        SELECT COUNT(*) as total FROM meal_plans 
        WHERE user_id = ${filters.userId} 
          AND is_active = ${filters.isActive}
          AND week_start_date = ${filters.weekStartDate.toISOString().split('T')[0]}
      `;
    } else if (filters.isActive !== undefined) {
      countResult = await sql`
        SELECT COUNT(*) as total FROM meal_plans 
        WHERE user_id = ${filters.userId} 
          AND is_active = ${filters.isActive}
      `;
    } else if (filters.weekStartDate) {
      countResult = await sql`
        SELECT COUNT(*) as total FROM meal_plans 
        WHERE user_id = ${filters.userId} 
          AND week_start_date = ${filters.weekStartDate.toISOString().split('T')[0]}
      `;
    } else {
      countResult = await sql`
        SELECT COUNT(*) as total FROM meal_plans 
        WHERE user_id = ${filters.userId}
      `;
    }
    const total = parseInt(countResult.rows[0].total);
    
    // Get meal plans with ordering and pagination using template literals
    const validSortColumns = ['name', 'week_start_date', 'created_at'];
    const orderColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    
    // Build the ORDER BY clause safely
    let orderByClause = 'ORDER BY created_at DESC';
    if (orderColumn === 'name') {
      orderByClause = sortOrder === 'ASC' ? 'ORDER BY name ASC' : 'ORDER BY name DESC';
    } else if (orderColumn === 'week_start_date') {
      orderByClause = sortOrder === 'ASC' ? 'ORDER BY week_start_date ASC' : 'ORDER BY week_start_date DESC';
    } else {
      orderByClause = sortOrder === 'ASC' ? 'ORDER BY created_at ASC' : 'ORDER BY created_at DESC';
    }
    
    // Build and execute the query using sql.query for dynamic ORDER BY
    let planQuery = 'SELECT * FROM meal_plans WHERE user_id = $1';
    const planParams = [filters.userId];
    let paramCount = 1;
    
    if (filters.isActive !== undefined) {
      paramCount++;
      planQuery += ` AND is_active = $${paramCount}`;
      planParams.push(filters.isActive.toString());
    }
    
    if (filters.weekStartDate) {
      paramCount++;
      planQuery += ` AND week_start_date = $${paramCount}`;
      planParams.push(filters.weekStartDate.toISOString().split('T')[0]);
    }
    
    planQuery += ` ${orderByClause} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    planParams.push(limit.toString(), offset.toString());
    
    const planRows = await sql.query(planQuery, planParams);
    
    // Get items for all meal plans
    const planIds = planRows.rows.map(row => row.id);
    const itemsMap: Map<string, MealPlanItem[]> = new Map();
    
    if (planIds.length > 0) {
      // Get items for each plan individually to avoid complex IN queries
      for (const planId of planIds) {
        const { rows: itemRows } = await sql`
          SELECT 
            mpi.meal_plan_id,
            mpi.recipe_id,
            mpi.day_of_week,
            mpi.meal_type,
            mpi.added_at,
            r.*
          FROM meal_plan_items mpi
          JOIN recipes r ON mpi.recipe_id = r.id
          WHERE mpi.meal_plan_id = ${planId}
          ORDER BY mpi.day_of_week, mpi.meal_type
        `;
        
        const items = itemRows.map(row => ({
          mealPlanId: row.meal_plan_id,
          recipeId: row.recipe_id,
          recipe: transformRecipeRecord(row as RecipeRecord),
          dayOfWeek: row.day_of_week,
          mealType: row.meal_type,
          addedAt: row.added_at
        }));
        
        itemsMap.set(planId, items);
      }
    }
    
    const mealPlans = planRows.rows.map(row => 
      transformMealPlanRecord(row as MealPlanRecord, itemsMap.get(row.id) || [])
    );
    
    return { mealPlans, total };
  } catch (error) {
    console.error('Database error: Failed to get meal plans for user:', error);
    throw new Error('Failed to retrieve meal plans from the database.');
  }
}
/**
 
* Updates an existing meal plan
 */
export async function updateMealPlan(id: string, updates: Partial<Omit<MealPlan, 'id' | 'userId' | 'items' | 'createdAt' | 'updatedAt'>>): Promise<MealPlan | null> {
  await ensureMealPlanTablesExist();
  
  if (!id || id.trim() === '') {
    throw new Error('Meal plan ID is required');
  }
  
  try {
    // Check if meal plan exists
    const existingPlan = await getMealPlanById(id);
    if (!existingPlan) {
      return null;
    }
    
    // Use individual update queries for simplicity with Vercel Postgres
    if (updates.name !== undefined) {
      await sql`UPDATE meal_plans SET name = ${updates.name}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
    }
    
    if (updates.description !== undefined) {
      await sql`UPDATE meal_plans SET description = ${updates.description}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
    }
    
    if (updates.weekStartDate !== undefined) {
      const dateStr = updates.weekStartDate.toISOString().split('T')[0];
      await sql`UPDATE meal_plans SET week_start_date = ${dateStr}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
    }
    
    if (updates.isActive !== undefined) {
      await sql`UPDATE meal_plans SET is_active = ${updates.isActive}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
    }
    
    // Return updated meal plan with items
    return await getMealPlanById(id);
  } catch (error) {
    console.error(`Database error: Failed to update meal plan "${id}":`, error);
    throw new Error(`Failed to update meal plan "${id}" in the database.`);
  }
}

/**
 * Deletes a meal plan by ID
 */
export async function deleteMealPlan(id: string): Promise<boolean> {
  await ensureMealPlanTablesExist();
  
  if (!id || id.trim() === '') {
    return false;
  }
  
  try {
    const result = await sql`
      DELETE FROM meal_plans
      WHERE id = ${id}
    `;
    
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error(`Database error: Failed to delete meal plan "${id}":`, error);
    throw new Error(`Failed to delete meal plan "${id}" from the database.`);
  }
}

/**
 * Sets a meal plan as active for a user (deactivates others)
 */
export async function setActiveMealPlan(userId: string, mealPlanId: string): Promise<void> {
  await ensureMealPlanTablesExist();
  
  if (!userId || userId.trim() === '') {
    throw new Error('User ID is required');
  }
  
  if (!mealPlanId || mealPlanId.trim() === '') {
    throw new Error('Meal plan ID is required');
  }
  
  try {
    await sql.query('BEGIN');
    
    // Deactivate all meal plans for the user
    await sql`
      UPDATE meal_plans 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId} AND is_active = TRUE
    `;
    
    // Activate the specified meal plan
    const result = await sql`
      UPDATE meal_plans 
      SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${mealPlanId} AND user_id = ${userId}
    `;
    
    if ((result.rowCount || 0) === 0) {
      await sql.query('ROLLBACK');
      throw new Error('Meal plan not found or does not belong to user');
    }
    
    await sql.query('COMMIT');
  } catch (error) {
    await sql.query('ROLLBACK');
    console.error(`Database error: Failed to set active meal plan "${mealPlanId}":`, error);
    throw new Error(`Failed to set active meal plan "${mealPlanId}".`);
  }
}

/**
 * Gets the active meal plan for a user
 */
export async function getActiveMealPlan(userId: string): Promise<MealPlan | null> {
  await ensureMealPlanTablesExist();
  
  if (!userId || userId.trim() === '') {
    return null;
  }
  
  try {
    const { rows } = await sql`
      SELECT * FROM meal_plans
      WHERE user_id = ${userId} AND is_active = TRUE
      LIMIT 1
    `;
    
    if (rows.length === 0) {
      return null;
    }
    
    return await getMealPlanById(rows[0].id);
  } catch (error) {
    console.error(`Database error: Failed to get active meal plan for user "${userId}":`, error);
    throw new Error(`Failed to get active meal plan for user "${userId}".`);
  }
}

// ===== MEAL PLAN ITEMS MANAGEMENT =====

/**
 * Adds a recipe to a meal plan for a specific day and meal type
 */
export async function addRecipeToMealPlan(
  mealPlanId: string, 
  recipeId: string, 
  dayOfWeek: number, 
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): Promise<MealPlanItem> {
  await ensureMealPlanTablesExist();
  
  if (!mealPlanId || mealPlanId.trim() === '') {
    throw new Error('Meal plan ID is required');
  }
  
  if (!recipeId || recipeId.trim() === '') {
    throw new Error('Recipe ID is required');
  }
  
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error('Day of week must be between 0 and 6');
  }
  
  if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
    throw new Error('Invalid meal type');
  }
  
  try {
    // Verify meal plan exists
    const mealPlan = await getMealPlanById(mealPlanId);
    if (!mealPlan) {
      throw new Error('Meal plan not found');
    }
    
    // Add or replace the meal plan item
    await sql`
      INSERT INTO meal_plan_items (meal_plan_id, recipe_id, day_of_week, meal_type)
      VALUES (${mealPlanId}, ${recipeId}, ${dayOfWeek}, ${mealType})
      ON CONFLICT (meal_plan_id, day_of_week, meal_type)
      DO UPDATE SET
        recipe_id = EXCLUDED.recipe_id,
        added_at = CURRENT_TIMESTAMP
    `;
    
    // Get the recipe details
    const { rows: recipeRows } = await sql`
      SELECT * FROM recipes WHERE id = ${recipeId}
    `;
    
    if (recipeRows.length === 0) {
      throw new Error('Recipe not found');
    }
    
    // Update meal plan's updated_at timestamp
    await sql`
      UPDATE meal_plans 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${mealPlanId}
    `;
    
    return {
      mealPlanId,
      recipeId,
      recipe: transformRecipeRecord(recipeRows[0] as RecipeRecord),
      dayOfWeek,
      mealType,
      addedAt: new Date()
    };
  } catch (error) {
    console.error('Database error: Failed to add recipe to meal plan:', error);
    throw new Error('Failed to add recipe to meal plan.');
  }
}

/**
 * Removes a recipe from a meal plan for a specific day and meal type
 */
export async function removeRecipeFromMealPlan(
  mealPlanId: string, 
  dayOfWeek: number, 
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): Promise<boolean> {
  await ensureMealPlanTablesExist();
  
  if (!mealPlanId || mealPlanId.trim() === '') {
    throw new Error('Meal plan ID is required');
  }
  
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error('Day of week must be between 0 and 6');
  }
  
  if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
    throw new Error('Invalid meal type');
  }
  
  try {
    const result = await sql`
      DELETE FROM meal_plan_items
      WHERE meal_plan_id = ${mealPlanId} 
        AND day_of_week = ${dayOfWeek} 
        AND meal_type = ${mealType}
    `;
    
    if ((result.rowCount || 0) > 0) {
      // Update meal plan's updated_at timestamp
      await sql`
        UPDATE meal_plans 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = ${mealPlanId}
      `;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Database error: Failed to remove recipe from meal plan:', error);
    throw new Error('Failed to remove recipe from meal plan.');
  }
}

/**
 * Updates a recipe assignment in a meal plan
 */
export async function updateMealPlanItem(
  mealPlanId: string, 
  dayOfWeek: number, 
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  newRecipeId: string
): Promise<MealPlanItem | null> {
  await ensureMealPlanTablesExist();
  
  if (!mealPlanId || mealPlanId.trim() === '') {
    throw new Error('Meal plan ID is required');
  }
  
  if (!newRecipeId || newRecipeId.trim() === '') {
    throw new Error('Recipe ID is required');
  }
  
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error('Day of week must be between 0 and 6');
  }
  
  if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
    throw new Error('Invalid meal type');
  }
  
  try {
    // Update the meal plan item
    const result = await sql`
      UPDATE meal_plan_items 
      SET recipe_id = ${newRecipeId}, added_at = CURRENT_TIMESTAMP
      WHERE meal_plan_id = ${mealPlanId} 
        AND day_of_week = ${dayOfWeek} 
        AND meal_type = ${mealType}
    `;
    
    if ((result.rowCount || 0) === 0) {
      return null;
    }
    
    // Get the updated item with recipe details
    const { rows: itemRows } = await sql`
      SELECT 
        mpi.meal_plan_id,
        mpi.recipe_id,
        mpi.day_of_week,
        mpi.meal_type,
        mpi.added_at,
        r.*
      FROM meal_plan_items mpi
      JOIN recipes r ON mpi.recipe_id = r.id
      WHERE mpi.meal_plan_id = ${mealPlanId} 
        AND mpi.day_of_week = ${dayOfWeek} 
        AND mpi.meal_type = ${mealType}
    `;
    
    if (itemRows.length === 0) {
      return null;
    }
    
    const row = itemRows[0];
    
    // Update meal plan's updated_at timestamp
    await sql`
      UPDATE meal_plans 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${mealPlanId}
    `;
    
    return {
      mealPlanId: row.meal_plan_id,
      recipeId: row.recipe_id,
      recipe: transformRecipeRecord(row as RecipeRecord),
      dayOfWeek: row.day_of_week,
      mealType: row.meal_type,
      addedAt: row.added_at
    };
  } catch (error) {
    console.error('Database error: Failed to update meal plan item:', error);
    throw new Error('Failed to update meal plan item.');
  }
}

/**
 * Gets all meal plan items for a specific meal plan with efficient JOIN
 */
export async function getMealPlanItems(mealPlanId: string): Promise<MealPlanItem[]> {
  await ensureMealPlanTablesExist();
  
  if (!mealPlanId || mealPlanId.trim() === '') {
    return [];
  }
  
  try {
    const { rows } = await sql`
      SELECT 
        mpi.meal_plan_id,
        mpi.recipe_id,
        mpi.day_of_week,
        mpi.meal_type,
        mpi.added_at,
        r.*
      FROM meal_plan_items mpi
      JOIN recipes r ON mpi.recipe_id = r.id
      WHERE mpi.meal_plan_id = ${mealPlanId}
      ORDER BY mpi.day_of_week, mpi.meal_type
    `;
    
    return rows.map(row => ({
      mealPlanId: row.meal_plan_id,
      recipeId: row.recipe_id,
      recipe: transformRecipeRecord(row as RecipeRecord),
      dayOfWeek: row.day_of_week,
      mealType: row.meal_type,
      addedAt: row.added_at
    }));
  } catch (error) {
    console.error(`Database error: Failed to get meal plan items for "${mealPlanId}":`, error);
    throw new Error(`Failed to get meal plan items for "${mealPlanId}".`);
  }
}

/**
 * Gets meal plan items for a specific day
 */
export async function getMealPlanItemsForDay(mealPlanId: string, dayOfWeek: number): Promise<MealPlanItem[]> {
  await ensureMealPlanTablesExist();
  
  if (!mealPlanId || mealPlanId.trim() === '') {
    return [];
  }
  
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error('Day of week must be between 0 and 6');
  }
  
  try {
    const { rows } = await sql`
      SELECT 
        mpi.meal_plan_id,
        mpi.recipe_id,
        mpi.day_of_week,
        mpi.meal_type,
        mpi.added_at,
        r.*
      FROM meal_plan_items mpi
      JOIN recipes r ON mpi.recipe_id = r.id
      WHERE mpi.meal_plan_id = ${mealPlanId} AND mpi.day_of_week = ${dayOfWeek}
      ORDER BY mpi.meal_type
    `;
    
    return rows.map(row => ({
      mealPlanId: row.meal_plan_id,
      recipeId: row.recipe_id,
      recipe: transformRecipeRecord(row as RecipeRecord),
      dayOfWeek: row.day_of_week,
      mealType: row.meal_type,
      addedAt: row.added_at
    }));
  } catch (error) {
    console.error(`Database error: Failed to get meal plan items for day ${dayOfWeek}:`, error);
    throw new Error(`Failed to get meal plan items for day ${dayOfWeek}.`);
  }
}

/**
 * Clears all items from a meal plan
 */
export async function clearMealPlan(mealPlanId: string): Promise<void> {
  await ensureMealPlanTablesExist();
  
  if (!mealPlanId || mealPlanId.trim() === '') {
    throw new Error('Meal plan ID is required');
  }
  
  try {
    await sql`
      DELETE FROM meal_plan_items
      WHERE meal_plan_id = ${mealPlanId}
    `;
    
    // Update meal plan's updated_at timestamp
    await sql`
      UPDATE meal_plans 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${mealPlanId}
    `;
  } catch (error) {
    console.error(`Database error: Failed to clear meal plan "${mealPlanId}":`, error);
    throw new Error(`Failed to clear meal plan "${mealPlanId}".`);
  }
}