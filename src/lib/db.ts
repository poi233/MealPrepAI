
'use server';

import { sql } from '@vercel/postgres';
import type { GenerateWeeklyMealPlanOutput } from '@/ai/flows/generate-weekly-meal-plan';
import type { FavoriteMeal, FavoriteCollection, FavoriteMealRecord, FavoriteCollectionRecord } from '@/types/favorites.types';

// Define a type for the meal plan record retrieved from DB, including plan_description
export type MealPlanRecord = GenerateWeeklyMealPlanOutput & {
  planName: string;
  planDescription: string;
  isActive: boolean;
  analysisText?: string | null; // Added for analysis text
};

async function ensureMealPlansTableExists(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS meal_plans (
        id SERIAL PRIMARY KEY,
        plan_name TEXT UNIQUE NOT NULL,
        plan_description TEXT NOT NULL DEFAULT 'No description provided.',
        meal_plan_data JSONB NOT NULL,
        is_active BOOLEAN DEFAULT FALSE,
        analysis_text TEXT NULL, -- Added for analysis text
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    const columnsResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='meal_plans';
    `;
    const existingColumns = columnsResult.rows.map(r => r.column_name);

    if (!existingColumns.includes('is_active')) {
      await sql`ALTER TABLE meal_plans ADD COLUMN is_active BOOLEAN DEFAULT FALSE;`;
    }
    
    if (!existingColumns.includes('plan_description')) {
        await sql`ALTER TABLE meal_plans ADD COLUMN plan_description TEXT NOT NULL DEFAULT 'No description provided.';`;
    }

    if (!existingColumns.includes('analysis_text')) {
        await sql`ALTER TABLE meal_plans ADD COLUMN analysis_text TEXT NULL;`;
    }

  } catch (error) {
    console.error("Database error: Failed to ensure 'meal_plans' table exists/is updated:", error);
    throw new Error("Failed to initialize database table 'meal_plans'.");
  }
}

async function ensureShoppingListsTableExists(): Promise<void> {
  await ensureMealPlansTableExists(); // Ensure meal_plans table exists first
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS shopping_lists (
        id SERIAL PRIMARY KEY,
        meal_plan_name TEXT NOT NULL UNIQUE,
        shopping_list_text TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_meal_plan
          FOREIGN KEY(meal_plan_name) 
          REFERENCES meal_plans(plan_name)
          ON DELETE CASCADE
      );
    `;
  } catch (error) {
    console.error("Database error: Failed to ensure 'shopping_lists' table exists:", error);
    throw new Error("Failed to initialize database table 'shopping_lists'.");
  }
}


export async function saveMealPlanToDb(
  planName: string,
  planDescription: string,
  mealPlanData: GenerateWeeklyMealPlanOutput
): Promise<void> {
  await ensureMealPlansTableExists();
  try {
    // When a plan is saved/updated, clear its existing analysis text as it might become outdated.
    await sql`
      INSERT INTO meal_plans (plan_name, plan_description, meal_plan_data, analysis_text, updated_at)
      VALUES (${planName}, ${planDescription}, ${JSON.stringify(mealPlanData)}::jsonb, NULL, NOW())
      ON CONFLICT (plan_name)
      DO UPDATE SET
        plan_description = EXCLUDED.plan_description,
        meal_plan_data = EXCLUDED.meal_plan_data,
        analysis_text = NULL, -- Clear analysis on meal plan update
        updated_at = NOW();
    `;
  } catch (error) {
    console.error("Database error: Failed to save meal plan:", error);
    throw new Error("Failed to save meal plan to the database.");
  }
}

export async function getMealPlanByNameFromDb(planName: string): Promise<{ mealPlanData: GenerateWeeklyMealPlanOutput; planDescription: string; isActive: boolean; analysisText: string | null } | null> {
  await ensureMealPlansTableExists();
  if (!planName || planName.trim() === "") {
    return null;
  }
  try {
    const { rows } = await sql`
      SELECT meal_plan_data, plan_description, is_active, analysis_text FROM meal_plans
      WHERE plan_name = ${planName}
      LIMIT 1;
    `;
    if (rows.length > 0) {
      return {
        mealPlanData: rows[0].meal_plan_data as GenerateWeeklyMealPlanOutput,
        planDescription: rows[0].plan_description as string,
        isActive: rows[0].is_active as boolean,
        analysisText: rows[0].analysis_text as string | null,
      };
    }
    return null;
  } catch (error) {
    console.error(`Database error: Failed to retrieve meal plan by name "${planName}":`, error);
    throw new Error(`Failed to retrieve meal plan "${planName}" from the database.`);
  }
}

export async function deleteMealPlanFromDbByName(planName: string): Promise<void> {
  await ensureMealPlansTableExists(); 
  await ensureShoppingListsTableExists(); 
  if (!planName || planName.trim() === "") {
    console.warn("Attempted to delete meal plan with empty plan name.");
    return;
  }
  try {
    const result = await sql`
      DELETE FROM meal_plans
      WHERE plan_name = ${planName};
    `;
    // Deletion completed successfully
  } catch (error) {
    console.error("Database error: Failed to delete meal plan by name:", error);
    throw new Error("Failed to delete meal plan from the database.");
  }
}

export async function getAllMealPlanNamesFromDb(): Promise<string[]> {
  await ensureMealPlansTableExists();
  try {
    const { rows } = await sql`
      SELECT plan_name FROM meal_plans ORDER BY plan_name ASC;
    `;
    return rows.map(row => row.plan_name as string);
  } catch (error) {
    console.error("Database error: Failed to retrieve all meal plan names:", error);
    throw new Error("Failed to retrieve all meal plan names from the database.");
  }
}

export async function getActiveMealPlanFromDb(): Promise<{ planName: string; planDescription: string; mealPlanData: GenerateWeeklyMealPlanOutput; analysisText: string | null } | null> {
  await ensureMealPlansTableExists();
  try {
    const { rows } = await sql`
      SELECT plan_name, plan_description, meal_plan_data, analysis_text FROM meal_plans
      WHERE is_active = TRUE
      LIMIT 1;
    `;
    if (rows.length > 0) {
      return {
        planName: rows[0].plan_name as string,
        planDescription: rows[0].plan_description as string,
        mealPlanData: rows[0].meal_plan_data as GenerateWeeklyMealPlanOutput,
        analysisText: rows[0].analysis_text as string | null,
      };
    }
    return null;
  } catch (error) {
    console.error("Database error: Failed to retrieve active meal plan:", error);
    throw new Error("Failed to retrieve active meal plan from the database.");
  }
}

export async function setActivePlanInDb(planName: string): Promise<void> {
  await ensureMealPlansTableExists();
  const effectivePlanName = planName.trim();

  try {
    await sql.query('BEGIN');
    
    await sql`UPDATE meal_plans SET is_active = FALSE WHERE is_active = TRUE;`;
    
    if (effectivePlanName !== "") {
      const result = await sql`
        UPDATE meal_plans SET is_active = TRUE, updated_at = NOW()
        WHERE plan_name = ${effectivePlanName};
      `;

      if (result.rowCount === 0) {
        await sql.query('ROLLBACK');
        throw new Error(`Plan with name "${effectivePlanName}" not found. Cannot set as active.`);
      }
    }
    
    await sql.query('COMMIT');

    // Active plan status updated successfully

  } catch (error) {
    await sql.query('ROLLBACK'); 
    console.error(`Database error: Failed to set active plan status for "${planName}" (effective: "${effectivePlanName}"):`, error);
    throw new Error(`Failed to update active plan status for "${planName}": ${(error as Error).message}`);
  }
}

// Shopping List specific functions
export async function saveShoppingListToDb(planName: string, shoppingListText: string): Promise<void> {
  await ensureShoppingListsTableExists();
  if (!planName || planName.trim() === "") {
    throw new Error("Plan name cannot be empty when saving shopping list.");
  }
  if (shoppingListText === null || shoppingListText === undefined) { 
      throw new Error("Shopping list text cannot be null or undefined.");
  }
  try {
    await sql`
      INSERT INTO shopping_lists (meal_plan_name, shopping_list_text, updated_at)
      VALUES (${planName}, ${shoppingListText}, NOW())
      ON CONFLICT (meal_plan_name) 
      DO UPDATE SET 
        shopping_list_text = EXCLUDED.shopping_list_text,
        updated_at = NOW();
    `;
  } catch (error) {
    console.error(`Database error: Failed to save shopping list for plan "${planName}":`, error);
    throw new Error(`Failed to save shopping list for plan "${planName}" to the database.`);
  }
}

export async function getShoppingListByPlanNameFromDb(planName: string): Promise<{ shoppingListText: string } | null> {
  await ensureShoppingListsTableExists();
  if (!planName || planName.trim() === "") {
    return null;
  }
  try {
    const { rows } = await sql`
      SELECT shopping_list_text FROM shopping_lists
      WHERE meal_plan_name = ${planName}
      LIMIT 1;
    `;
    if (rows.length > 0) {
      return {
        shoppingListText: rows[0].shopping_list_text as string,
      };
    }
    return null;
  } catch (error) {
    console.error(`Database error: Failed to retrieve shopping list for plan "${planName}":`, error);
    throw new Error(`Failed to retrieve shopping list for plan "${planName}" from the database.`);
  }
}

// Meal Plan Analysis specific functions
export async function saveMealPlanAnalysisToDb(planName: string, analysisText: string): Promise<void> {
  await ensureMealPlansTableExists();
  if (!planName || planName.trim() === "") {
    throw new Error("Plan name cannot be empty when saving meal plan analysis.");
  }
  try {
    const result = await sql`
      UPDATE meal_plans 
      SET analysis_text = ${analysisText}, updated_at = NOW()
      WHERE plan_name = ${planName};
    `;
    if (result.rowCount === 0) {
      throw new Error(`Plan with name "${planName}" not found. Cannot save analysis.`);
    }
  } catch (error) {
    console.error(`Database error: Failed to save meal plan analysis for plan "${planName}":`, error);
    throw new Error(`Failed to save meal plan analysis for plan "${planName}" to the database.`);
  }
}

export async function getMealPlanAnalysisFromDb(planName: string): Promise<{ analysisText: string | null } | null> {
  await ensureMealPlansTableExists();
  if (!planName || planName.trim() === "") {
    return null;
  }
  try {
    const { rows } = await sql`
      SELECT analysis_text FROM meal_plans
      WHERE plan_name = ${planName}
      LIMIT 1;
    `;
    if (rows.length > 0) {
      return {
        analysisText: rows[0].analysis_text, // Can be null from DB
      };
    }
    return null; // Plan not found
  } catch (error) {
    console.error(`Database error: Failed to retrieve meal plan analysis for plan "${planName}":`, error);
    throw new Error(`Failed to retrieve meal plan analysis for plan "${planName}" from the database.`);
  }
}

// ===== FAVORITES SYSTEM DATABASE FUNCTIONS =====

async function ensureFavoritesTablesExist(): Promise<void> {
  try {
    // Create users table if it doesn't exist (for foreign key references)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create favorites table
    await sql`
      CREATE TABLE IF NOT EXISTS favorites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL DEFAULT gen_random_uuid(),
        meal_id UUID NOT NULL DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        cuisine VARCHAR(100),
        meal_type VARCHAR(20) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
        ingredients JSONB,
        cooking_time INTEGER DEFAULT 0,
        difficulty VARCHAR(10) CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
        rating INTEGER CHECK (rating >= 1 AND rating <= 5) DEFAULT 3,
        tags TEXT[] DEFAULT '{}',
        nutrition_info JSONB DEFAULT '{}',
        recipe_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        use_count INTEGER DEFAULT 0,
        is_shared BOOLEAN DEFAULT FALSE,
        shared_by UUID,
        UNIQUE(user_id, meal_id)
      );
    `;

    // Create collections table
    await sql`
      CREATE TABLE IF NOT EXISTS favorite_collections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#4DB6AC',
        icon VARCHAR(50) DEFAULT 'heart',
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        tags TEXT[] DEFAULT '{}'
      );
    `;

    // Create collection_meals junction table
    await sql`
      CREATE TABLE IF NOT EXISTS collection_meals (
        collection_id UUID REFERENCES favorite_collections(id) ON DELETE CASCADE,
        favorite_id UUID REFERENCES favorites(id) ON DELETE CASCADE,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (collection_id, favorite_id)
      );
    `;

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_favorites_cuisine ON favorites(cuisine);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_favorites_meal_type ON favorites(meal_type);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_favorites_rating ON favorites(rating);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_favorites_tags ON favorites USING GIN(tags);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_collections_user_id ON favorite_collections(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_collection_meals_collection ON collection_meals(collection_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_collection_meals_favorite ON collection_meals(favorite_id);`;

  } catch (error) {
    console.error("Database error: Failed to ensure favorites tables exist:", error);
    throw new Error("Failed to initialize favorites database tables.");
  }
}

// Favorites CRUD operations
export async function saveFavoriteToDb(favorite: Omit<FavoriteMealRecord, 'id' | 'created_at' | 'last_used'>): Promise<string> {
  await ensureFavoritesTablesExist();
  try {
    const { rows } = await sql`
      INSERT INTO favorites (
        user_id, meal_id, name, description, image_url, cuisine, meal_type,
        ingredients, cooking_time, difficulty, rating, tags, nutrition_info,
        recipe_data, use_count, is_shared, shared_by
      )
      VALUES (
        ${favorite.user_id}, ${favorite.meal_id}, ${favorite.name}, ${favorite.description},
        ${favorite.image_url || null}, ${favorite.cuisine}, ${favorite.meal_type},
        ${JSON.stringify(favorite.ingredients)}::jsonb, ${favorite.cooking_time},
        ${favorite.difficulty}, ${favorite.rating}, ${favorite.tags},
        ${JSON.stringify(favorite.nutrition_info)}::jsonb,
        ${JSON.stringify(favorite.recipe_data)}::jsonb, ${favorite.use_count},
        ${favorite.is_shared}, ${favorite.shared_by || null}
      )
      ON CONFLICT (user_id, meal_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url,
        cuisine = EXCLUDED.cuisine,
        meal_type = EXCLUDED.meal_type,
        ingredients = EXCLUDED.ingredients,
        cooking_time = EXCLUDED.cooking_time,
        difficulty = EXCLUDED.difficulty,
        rating = EXCLUDED.rating,
        tags = EXCLUDED.tags,
        nutrition_info = EXCLUDED.nutrition_info,
        recipe_data = EXCLUDED.recipe_data,
        last_used = NOW()
      RETURNING id;
    `;
    return rows[0].id;
  } catch (error) {
    console.error("Database error: Failed to save favorite:", error);
    throw new Error("Failed to save favorite to database.");
  }
}

export async function getFavoritesByUserIdFromDb(userId: string): Promise<FavoriteMeal[]> {
  await ensureFavoritesTablesExist();
  try {
    // First, let's try a simpler query to debug
    const { rows } = await sql`
      SELECT * FROM favorites 
      WHERE user_id = ${userId}
      ORDER BY last_used DESC;
    `;
    

    
    return rows.map(row => ({
      id: row.id,
      mealId: row.meal_id,
      userId: row.user_id,
      name: row.name,
      description: row.description || '',
      imageUrl: row.image_url,
      cuisine: row.cuisine,
      mealType: row.meal_type,
      ingredients: row.ingredients,
      cookingTime: row.cooking_time,
      difficulty: row.difficulty,
      rating: row.rating,
      tags: row.tags || [],
      nutritionInfo: row.nutrition_info || {},
      recipeData: row.recipe_data,
      createdAt: new Date(row.created_at),
      lastUsed: new Date(row.last_used),
      useCount: row.use_count,
      isShared: row.is_shared,
      sharedBy: row.shared_by,
      collections: [] // We'll handle collections separately for now
    }));
  } catch (error) {
    console.error("Database error: Failed to get favorites:", error);
    throw new Error("Failed to retrieve favorites from database.");
  }
}

export async function updateFavoriteRatingInDb(favoriteId: string, rating: number): Promise<void> {
  await ensureFavoritesTablesExist();
  try {
    const result = await sql`
      UPDATE favorites 
      SET rating = ${rating}, last_used = NOW()
      WHERE id = ${favoriteId};
    `;
    if (result.rowCount === 0) {
      throw new Error(`Favorite with id "${favoriteId}" not found.`);
    }
  } catch (error) {
    console.error("Database error: Failed to update favorite rating:", error);
    throw new Error("Failed to update favorite rating in database.");
  }
}

export async function deleteFavoriteFromDb(favoriteId: string): Promise<void> {
  await ensureFavoritesTablesExist();
  try {
    const result = await sql`
      DELETE FROM favorites WHERE id = ${favoriteId};
    `;
    if (result.rowCount === 0) {
      throw new Error(`Favorite with id "${favoriteId}" not found.`);
    }
  } catch (error) {
    console.error("Database error: Failed to delete favorite:", error);
    throw new Error("Failed to delete favorite from database.");
  }
}

// Collection CRUD operations
export async function saveCollectionToDb(collection: Omit<FavoriteCollectionRecord, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  await ensureFavoritesTablesExist();
  try {
    const { rows } = await sql`
      INSERT INTO favorite_collections (
        user_id, name, description, color, icon, is_public, tags
      )
      VALUES (
        ${collection.user_id}, ${collection.name}, ${collection.description || null},
        ${collection.color}, ${collection.icon}, ${collection.is_public}, ${collection.tags}
      )
      RETURNING id;
    `;
    return rows[0].id;
  } catch (error) {
    console.error("Database error: Failed to save collection:", error);
    throw new Error("Failed to save collection to database.");
  }
}

export async function getCollectionsByUserIdFromDb(userId: string): Promise<FavoriteCollection[]> {
  await ensureFavoritesTablesExist();
  try {
    // Simplified query for debugging
    const { rows } = await sql`
      SELECT * FROM favorite_collections 
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC;
    `;
    

    
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      mealIds: [], // We'll handle meal IDs separately for now
      isPublic: row.is_public,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      tags: row.tags || []
    }));
  } catch (error) {
    console.error("Database error: Failed to get collections:", error);
    throw new Error("Failed to retrieve collections from database.");
  }
}

export async function addMealToCollectionInDb(collectionId: string, favoriteId: string): Promise<void> {
  await ensureFavoritesTablesExist();
  try {
    await sql`
      INSERT INTO collection_meals (collection_id, favorite_id)
      VALUES (${collectionId}, ${favoriteId})
      ON CONFLICT (collection_id, favorite_id) DO NOTHING;
    `;
    
    // Update collection's updated_at timestamp
    await sql`
      UPDATE favorite_collections 
      SET updated_at = NOW() 
      WHERE id = ${collectionId};
    `;
  } catch (error) {
    console.error("Database error: Failed to add meal to collection:", error);
    throw new Error("Failed to add meal to collection in database.");
  }
}

export async function removeMealFromCollectionInDb(collectionId: string, favoriteId: string): Promise<void> {
  await ensureFavoritesTablesExist();
  try {
    await sql`
      DELETE FROM collection_meals 
      WHERE collection_id = ${collectionId} AND favorite_id = ${favoriteId};
    `;
    
    // Update collection's updated_at timestamp
    await sql`
      UPDATE favorite_collections 
      SET updated_at = NOW() 
      WHERE id = ${collectionId};
    `;
  } catch (error) {
    console.error("Database error: Failed to remove meal from collection:", error);
    throw new Error("Failed to remove meal from collection in database.");
  }
}

// Seed data for development
export async function seedFavoritesData(): Promise<void> {
  await ensureFavoritesTablesExist();
  try {
    // Create a default user for development with a fixed UUID
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const { rows: userRows } = await sql`
      INSERT INTO users (id, email, name)
      VALUES (${userId}, 'dev@mealprep.ai', 'Development User')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `;

    // Create some sample favorites with proper UUIDs
    const sampleFavorites = [
      {
        user_id: userId,
        meal_id: '550e8400-e29b-41d4-a716-446655440001',
        name: '牛油果吐司',
        description: '健康美味的早餐选择',
        cuisine: '西式',
        meal_type: 'breakfast' as const,
        ingredients: ['牛油果 1个', '全麦面包 2片', '柠檬汁 1茶匙', '盐 少许'],
        cooking_time: 10,
        difficulty: 'easy' as const,
        rating: 5,
        tags: ['健康', '快手', '素食'],
        nutrition_info: { calories: 250, protein: 8, carbs: 20, fat: 18 },
        recipe_data: {
          recipeName: '牛油果吐司',
          ingredients: ['牛油果 1个', '全麦面包 2片', '柠檬汁 1茶匙', '盐 少许'],
          instructions: '1. 烤面包至金黄\n2. 牛油果压成泥\n3. 涂抹在面包上\n4. 撒盐和柠檬汁'
        },
        use_count: 5,
        is_shared: false
      },
      {
        user_id: userId,
        meal_id: '550e8400-e29b-41d4-a716-446655440002',
        name: '鸡胸肉沙拉',
        description: '高蛋白低脂午餐',
        cuisine: '西式',
        meal_type: 'lunch' as const,
        ingredients: ['鸡胸肉 150g', '混合生菜 100g', '小番茄 5个', '橄榄油 1汤匙'],
        cooking_time: 20,
        difficulty: 'medium' as const,
        rating: 4,
        tags: ['高蛋白', '减脂', '健康'],
        nutrition_info: { calories: 300, protein: 35, carbs: 10, fat: 12 },
        recipe_data: {
          recipeName: '鸡胸肉沙拉',
          ingredients: ['鸡胸肉 150g', '混合生菜 100g', '小番茄 5个', '橄榄油 1汤匙'],
          instructions: '1. 煎鸡胸肉至熟透\n2. 切片备用\n3. 混合蔬菜\n4. 淋上橄榄油调味'
        },
        use_count: 3,
        is_shared: false
      }
    ];

    for (const favorite of sampleFavorites) {
      await saveFavoriteToDb(favorite);
    }

    // Create a sample collection
    const collectionId = await saveCollectionToDb({
      user_id: userId,
      name: '快手早餐',
      description: '10分钟内完成的健康早餐',
      color: '#4DB6AC',
      icon: 'coffee',
      is_public: false,
      tags: ['早餐', '快手']
    });

    // Favorites seed data created successfully
  } catch (error) {
    console.error("Database error: Failed to seed favorites data:", error);
    // Don't throw error for seeding, just log it
  }
}
