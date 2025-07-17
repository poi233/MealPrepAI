'use server';

import { sql } from '@vercel/postgres';
import { executeRawQuery, testConnection, tableExists, handleDatabaseError } from './connection';

/**
 * Database initialization and cleanup functions
 */

/**
 * Execute all schema statements in the correct order
 */
async function executeSchemaStatements(): Promise<void> {
  // Enable UUID extension
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

  // Create users table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(100),
      dietary_preferences JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create recipes table
  await sql`
    CREATE TABLE IF NOT EXISTS recipes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
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

  // Create meal_plans table
  await sql`
    CREATE TABLE IF NOT EXISTS meal_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
      recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
      added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (meal_plan_id, day_of_week, meal_type)
    )
  `;

  // Create favorites table
  await sql`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
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
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
      recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (collection_id, recipe_id)
    )
  `;

  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON recipes(meal_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_recipes_avg_rating ON recipes(avg_rating DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN(tags)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_recipes_search ON recipes USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')))`;
  await sql`CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_meal_plans_active ON meal_plans(user_id, is_active) WHERE is_active = true`;
  await sql`CREATE INDEX IF NOT EXISTS idx_meal_plan_items_plan_id ON meal_plan_items(meal_plan_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_favorites_added_at ON favorites(added_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_collection_recipes_collection_id ON collection_recipes(collection_id)`;

  // Create update trigger function using executeRawQuery to handle dollar quoting
  await executeRawQuery(
    "CREATE OR REPLACE FUNCTION update_updated_at_column() " +
    "RETURNS TRIGGER AS $$ " +
    "BEGIN " +
    "    NEW.updated_at = CURRENT_TIMESTAMP; " +
    "    RETURN NEW; " +
    "END; " +
    "$$ language 'plpgsql';"
  );

  // Create triggers
  await executeRawQuery("DROP TRIGGER IF EXISTS update_users_updated_at ON users;");
  await executeRawQuery(
    "CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users " +
    "FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();"
  );

  await executeRawQuery("DROP TRIGGER IF EXISTS update_recipes_updated_at ON recipes;");
  await executeRawQuery(
    "CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes " +
    "FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();"
  );

  await executeRawQuery("DROP TRIGGER IF EXISTS update_meal_plans_updated_at ON meal_plans;");
  await executeRawQuery(
    "CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans " +
    "FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();"
  );

  await executeRawQuery("DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;");
  await executeRawQuery(
    "CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections " +
    "FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();"
  );
}

/**
 * Initialize the database with the new schema
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Starting database initialization...');

    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Cannot connect to database');
    }

    // Execute schema directly using sql template
    await executeSchemaStatements();

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw handleDatabaseError(error);
  }
}

/**
 * Drop all legacy tables and clean up old structure
 */
export async function cleanupLegacyTables(): Promise<void> {
  try {
    console.log('Starting legacy table cleanup...');

    // List of legacy tables to drop
    const legacyTables = [
      'shopping_lists',
      'meal_plans' // This will be recreated with new structure
    ];

    // Drop legacy tables if they exist
    for (const tableName of legacyTables) {
      const exists = await tableExists(tableName);
      if (exists) {
        await executeRawQuery(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
        console.log(`Dropped legacy table: ${tableName}`);
      }
    }

    // Drop any legacy functions or triggers
    await executeRawQuery('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
    
    console.log('Legacy cleanup completed');
  } catch (error) {
    console.error('Legacy cleanup failed:', error);
    throw handleDatabaseError(error);
  }
}

/**
 * Verify database schema is properly set up
 */
export async function verifyDatabaseSchema(): Promise<{
  isValid: boolean;
  missingTables: string[];
  errors: string[];
}> {
  const requiredTables = [
    'users',
    'recipes',
    'meal_plans',
    'meal_plan_items',
    'favorites',
    'collections',
    'collection_recipes'
  ];

  const missingTables: string[] = [];
  const errors: string[] = [];

  try {
    // Check if all required tables exist
    for (const tableName of requiredTables) {
      const exists = await tableExists(tableName);
      if (!exists) {
        missingTables.push(tableName);
      }
    }

    // Check if UUID extension is available
    try {
      await sql`SELECT gen_random_uuid()`;
    } catch (error) {
      errors.push('UUID extension (pgcrypto) is not available');
    }

    // Check if full-text search is working
    try {
      await sql`SELECT to_tsvector('english', 'test')`;
    } catch (error) {
      errors.push('Full-text search functionality is not available');
    }

    return {
      isValid: missingTables.length === 0 && errors.length === 0,
      missingTables,
      errors
    };
  } catch (error) {
    return {
      isValid: false,
      missingTables,
      errors: [handleDatabaseError(error).message]
    };
  }
}

/**
 * Reset database to clean state (development only)
 */
export async function resetDatabase(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database reset is not allowed in production');
  }

  try {
    console.log('Resetting database...');

    // Drop all tables in correct order (respecting foreign keys)
    const tablesToDrop = [
      'collection_recipes',
      'favorites',
      'meal_plan_items',
      'collections',
      'meal_plans',
      'recipes',
      'users'
    ];

    for (const tableName of tablesToDrop) {
      await executeRawQuery(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
    }

    // Drop functions and triggers
    await executeRawQuery('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');

    // Reinitialize with clean schema
    await initializeDatabase();

    console.log('Database reset completed');
  } catch (error) {
    console.error('Database reset failed:', error);
    throw handleDatabaseError(error);
  }
}

/**
 * Create sample data for development and testing
 */
export async function createSampleData(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Sample data creation is not allowed in production');
  }

  try {
    console.log('Creating sample data...');

    // Create sample user
    const userResult = await sql`
      INSERT INTO users (username, email, password_hash, display_name, dietary_preferences)
      VALUES (
        'testuser',
        'test@example.com',
        '$2b$10$example.hash.here',
        'Test User',
        '{"dietType": "vegetarian", "allergies": ["nuts"]}'::jsonb
      )
      ON CONFLICT (username) DO NOTHING
      RETURNING id;
    `;

    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;

      // Create sample recipes
      const recipeResult = await sql`
        INSERT INTO recipes (
          created_by_user_id, name, description, ingredients, instructions,
          nutrition_info, cuisine, meal_type, prep_time, cook_time, difficulty, tags
        )
        VALUES (
          ${userId},
          'Sample Breakfast Bowl',
          'A healthy breakfast bowl with oats and fruits',
          '[{"name": "oats", "amount": 1, "unit": "cup"}, {"name": "banana", "amount": 1, "unit": "piece"}]'::jsonb,
          'Mix oats with water, add sliced banana and enjoy.',
          '{"calories": 300, "protein": 8, "carbs": 60}'::jsonb,
          'American',
          'breakfast',
          5,
          10,
          'easy',
          ARRAY['healthy', 'quick']
        )
        ON CONFLICT DO NOTHING
        RETURNING id;
      `;

      if (recipeResult.rows.length > 0) {
        const recipeId = recipeResult.rows[0].id;

        // Create sample meal plan
        const mealPlanResult = await sql`
          INSERT INTO meal_plans (user_id, name, description, week_start_date, is_active)
          VALUES (
            ${userId},
            'Sample Week',
            'A sample meal plan for testing',
            CURRENT_DATE,
            true
          )
          ON CONFLICT (user_id, name) DO NOTHING
          RETURNING id;
        `;

        if (mealPlanResult.rows.length > 0) {
          const mealPlanId = mealPlanResult.rows[0].id;

          // Add recipe to meal plan
          await sql`
            INSERT INTO meal_plan_items (meal_plan_id, recipe_id, day_of_week, meal_type)
            VALUES (${mealPlanId}, ${recipeId}, 1, 'breakfast')
            ON CONFLICT DO NOTHING;
          `;

          // Add to favorites
          await sql`
            INSERT INTO favorites (user_id, recipe_id, personal_rating, personal_notes)
            VALUES (${userId}, ${recipeId}, 5, 'Love this recipe!')
            ON CONFLICT DO NOTHING;
          `;

          // Create sample collection
          const collectionResult = await sql`
            INSERT INTO collections (user_id, name, description, color, icon)
            VALUES (
              ${userId},
              'Breakfast Favorites',
              'My favorite breakfast recipes',
              '#4DB6AC',
              'coffee'
            )
            ON CONFLICT (user_id, name) DO NOTHING
            RETURNING id;
          `;

          if (collectionResult.rows.length > 0) {
            const collectionId = collectionResult.rows[0].id;

            // Add recipe to collection
            await sql`
              INSERT INTO collection_recipes (collection_id, recipe_id)
              VALUES (${collectionId}, ${recipeId})
              ON CONFLICT DO NOTHING;
            `;
          }
        }
      }
    }

    console.log('Sample data created successfully');
  } catch (error) {
    console.error('Sample data creation failed:', error);
    throw handleDatabaseError(error);
  }
}

/**
 * Get database health status
 */
export async function getDatabaseHealth(): Promise<{
  isHealthy: boolean;
  connectionStatus: boolean;
  schemaStatus: { isValid: boolean; missingTables: string[]; errors: string[] };
  lastChecked: Date;
}> {
  const lastChecked = new Date();
  
  try {
    const connectionStatus = await testConnection();
    const schemaStatus = await verifyDatabaseSchema();
    
    return {
      isHealthy: connectionStatus && schemaStatus.isValid,
      connectionStatus,
      schemaStatus,
      lastChecked
    };
  } catch (error) {
    return {
      isHealthy: false,
      connectionStatus: false,
      schemaStatus: { isValid: false, missingTables: [], errors: [handleDatabaseError(error).message] },
      lastChecked
    };
  }
}