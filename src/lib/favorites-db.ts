'use server';

import { sql } from '@vercel/postgres';
import type { FavoriteMeal, FavoriteCollection, FavoriteMealRecord, FavoriteCollectionRecord } from '@/types/favorites.types';

// ===== FAVORITES SYSTEM DATABASE FUNCTIONS =====

async function ensureFavoritesTablesExist(): Promise<void> {
  try {
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

export async function updateFavoriteTagsInDb(favoriteId: string, tags: string[]): Promise<void> {
  await ensureFavoritesTablesExist();
  try {
    const result = await sql`
      UPDATE favorites 
      SET 
        tags = ${tags},
        last_used = NOW()
      WHERE id = ${favoriteId}
    `;
    
    if (result.count === 0) {
      throw new Error(`Favorite with id "${favoriteId}" not found.`);
    }
  } catch (error) {
    console.error("Database error: Failed to update favorite tags:", error);
    throw new Error("Failed to update favorite tags in database.");
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

export async function deleteCollectionFromDb(collectionId: string): Promise<void> {
  await ensureFavoritesTablesExist();
  try {
    // The collection_meals junction table will be automatically cleaned up due to CASCADE
    const result = await sql`
      DELETE FROM favorite_collections WHERE id = ${collectionId};
    `;
    if (result.rowCount === 0) {
      throw new Error(`Collection with id "${collectionId}" not found.`);
    }
  } catch (error) {
    console.error("Database error: Failed to delete collection:", error);
    throw new Error("Failed to delete collection from database.");
  }
}

export async function getCollectionMealsFromDb(collectionId: string): Promise<string[]> {
  await ensureFavoritesTablesExist();
  try {
    const { rows } = await sql`
      SELECT favorite_id FROM collection_meals 
      WHERE collection_id = ${collectionId}
      ORDER BY added_at DESC;
    `;
    return rows.map(row => row.favorite_id);
  } catch (error) {
    console.error("Database error: Failed to get collection meals:", error);
    throw new Error("Failed to get collection meals from database.");
  }
}

export async function getFavoritesWithCollectionsFromDb(userId: string): Promise<FavoriteMeal[]> {
  await ensureFavoritesTablesExist();
  try {
    const { rows } = await sql`
      SELECT 
        f.*,
        COALESCE(
          array_agg(cm.collection_id) FILTER (WHERE cm.collection_id IS NOT NULL), 
          '{}'
        ) as collection_ids
      FROM favorites f
      LEFT JOIN collection_meals cm ON f.id = cm.favorite_id
      WHERE f.user_id = ${userId}
      GROUP BY f.id
      ORDER BY f.last_used DESC;
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
      collections: row.collection_ids || []
    }));
  } catch (error) {
    console.error("Database error: Failed to get favorites with collections:", error);
    throw new Error("Failed to retrieve favorites with collections from database.");
  }
}

// Seed data for development
export async function seedFavoritesData(): Promise<void> {
  await ensureFavoritesTablesExist();
  try {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    // Check if data already exists
    const { rows: existingFavorites } = await sql`
      SELECT COUNT(*) as count FROM favorites WHERE user_id = ${userId};
    `;
    
    if (parseInt(existingFavorites[0].count) > 0) {
      console.log('Favorites seed data already exists, skipping...');
      return;
    }

    // Create some sample favorites
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

    // Create sample collections
    await saveCollectionToDb({
      user_id: userId,
      name: '快手早餐',
      description: '10分钟内完成的健康早餐',
      color: '#4DB6AC',
      icon: 'coffee',
      is_public: false,
      tags: ['早餐', '快手']
    });

    await saveCollectionToDb({
      user_id: userId,
      name: '周末大餐',
      description: '周末特别准备的丰盛大餐',
      color: '#FF7043',
      icon: 'utensils',
      is_public: false,
      tags: ['周末', '大餐']
    });

    console.log('Favorites seed data created successfully');
  } catch (error) {
    console.error("Database error: Failed to seed favorites data:", error);
    // Don't throw error for seeding, just log it
  }
}