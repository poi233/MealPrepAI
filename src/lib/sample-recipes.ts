'use server';

import { sql } from '@vercel/postgres';
import type { Recipe, Ingredient, NutritionInfo } from '@/types/database.types';

const sampleRecipes: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    createdByUserId: undefined,
    name: 'Scrambled Eggs with Toast',
    description: 'Classic breakfast with fluffy scrambled eggs and buttered toast',
    ingredients: [
      { name: 'Eggs', amount: 2, unit: 'pieces' },
      { name: 'Butter', amount: 1, unit: 'tbsp' },
      { name: 'Bread', amount: 2, unit: 'slices' },
      { name: 'Salt', amount: 1, unit: 'pinch' },
      { name: 'Black pepper', amount: 1, unit: 'pinch' }
    ],
    instructions: '1. Beat eggs with salt and pepper. 2. Heat butter in pan. 3. Add eggs and scramble gently. 4. Toast bread and serve together.',
    nutritionInfo: { calories: 320, protein: 18, carbs: 24, fat: 16 },
    cuisine: 'American',
    mealType: 'breakfast',
    prepTime: 5,
    cookTime: 10,
    totalTime: 15,
    difficulty: 'easy',
    avgRating: 4.5,
    ratingCount: 120,
    imageUrl: undefined,
    tags: ['quick', 'protein', 'classic']
  },
  {
    createdByUserId: undefined,
    name: 'Grilled Chicken Salad',
    description: 'Fresh mixed greens with grilled chicken breast and vinaigrette',
    ingredients: [
      { name: 'Chicken breast', amount: 150, unit: 'g' },
      { name: 'Mixed greens', amount: 100, unit: 'g' },
      { name: 'Cherry tomatoes', amount: 50, unit: 'g' },
      { name: 'Cucumber', amount: 50, unit: 'g' },
      { name: 'Olive oil', amount: 2, unit: 'tbsp' },
      { name: 'Lemon juice', amount: 1, unit: 'tbsp' }
    ],
    instructions: '1. Season and grill chicken breast. 2. Prepare salad with greens, tomatoes, cucumber. 3. Slice chicken and add to salad. 4. Dress with olive oil and lemon.',
    nutritionInfo: { calories: 280, protein: 35, carbs: 8, fat: 12 },
    cuisine: 'Mediterranean',
    mealType: 'lunch',
    prepTime: 10,
    cookTime: 15,
    totalTime: 25,
    difficulty: 'easy',
    avgRating: 4.7,
    ratingCount: 89,
    imageUrl: undefined,
    tags: ['healthy', 'protein', 'low-carb']
  },
  {
    createdByUserId: undefined,
    name: 'Spaghetti Carbonara',
    description: 'Classic Italian pasta with eggs, cheese, and pancetta',
    ingredients: [
      { name: 'Spaghetti', amount: 100, unit: 'g' },
      { name: 'Pancetta', amount: 50, unit: 'g' },
      { name: 'Eggs', amount: 2, unit: 'pieces' },
      { name: 'Parmesan cheese', amount: 30, unit: 'g' },
      { name: 'Black pepper', amount: 1, unit: 'tsp' },
      { name: 'Salt', amount: 1, unit: 'pinch' }
    ],
    instructions: '1. Cook spaghetti al dente. 2. Fry pancetta until crispy. 3. Beat eggs with cheese and pepper. 4. Toss hot pasta with pancetta and egg mixture.',
    nutritionInfo: { calories: 520, protein: 28, carbs: 45, fat: 24 },
    cuisine: 'Italian',
    mealType: 'dinner',
    prepTime: 10,
    cookTime: 20,
    totalTime: 30,
    difficulty: 'medium',
    avgRating: 4.8,
    ratingCount: 156,
    imageUrl: undefined,
    tags: ['pasta', 'classic', 'comfort-food']
  },
  {
    createdByUserId: undefined,
    name: 'Greek Yogurt with Berries',
    description: 'Healthy snack with protein-rich yogurt and fresh berries',
    ingredients: [
      { name: 'Greek yogurt', amount: 150, unit: 'g' },
      { name: 'Mixed berries', amount: 80, unit: 'g' },
      { name: 'Honey', amount: 1, unit: 'tbsp' },
      { name: 'Granola', amount: 20, unit: 'g' }
    ],
    instructions: '1. Place yogurt in bowl. 2. Top with berries and granola. 3. Drizzle with honey.',
    nutritionInfo: { calories: 220, protein: 15, carbs: 28, fat: 6 },
    cuisine: 'Mediterranean',
    mealType: 'snack',
    prepTime: 3,
    cookTime: 0,
    totalTime: 3,
    difficulty: 'easy',
    avgRating: 4.6,
    ratingCount: 73,
    imageUrl: undefined,
    tags: ['healthy', 'protein', 'quick']
  },
  {
    createdByUserId: undefined,
    name: 'Avocado Toast',
    description: 'Trendy breakfast with mashed avocado on sourdough',
    ingredients: [
      { name: 'Sourdough bread', amount: 2, unit: 'slices' },
      { name: 'Avocado', amount: 1, unit: 'piece' },
      { name: 'Lemon juice', amount: 1, unit: 'tsp' },
      { name: 'Salt', amount: 1, unit: 'pinch' },
      { name: 'Red pepper flakes', amount: 1, unit: 'pinch' }
    ],
    instructions: '1. Toast bread until golden. 2. Mash avocado with lemon juice and salt. 3. Spread on toast and sprinkle with pepper flakes.',
    nutritionInfo: { calories: 290, protein: 8, carbs: 32, fat: 16 },
    cuisine: 'Modern',
    mealType: 'breakfast',
    prepTime: 5,
    cookTime: 3,
    totalTime: 8,
    difficulty: 'easy',
    avgRating: 4.4,
    ratingCount: 201,
    imageUrl: undefined,
    tags: ['trendy', 'healthy', 'vegetarian']
  },
  {
    createdByUserId: undefined,
    name: 'Chicken Stir Fry',
    description: 'Quick and healthy stir fry with vegetables',
    ingredients: [
      { name: 'Chicken breast', amount: 150, unit: 'g' },
      { name: 'Bell peppers', amount: 100, unit: 'g' },
      { name: 'Broccoli', amount: 100, unit: 'g' },
      { name: 'Soy sauce', amount: 2, unit: 'tbsp' },
      { name: 'Garlic', amount: 2, unit: 'cloves' },
      { name: 'Ginger', amount: 1, unit: 'tsp' },
      { name: 'Vegetable oil', amount: 1, unit: 'tbsp' }
    ],
    instructions: '1. Cut chicken and vegetables. 2. Heat oil in wok. 3. Stir fry chicken until cooked. 4. Add vegetables and sauce. 5. Stir fry until tender.',
    nutritionInfo: { calories: 310, protein: 32, carbs: 12, fat: 14 },
    cuisine: 'Asian',
    mealType: 'dinner',
    prepTime: 15,
    cookTime: 10,
    totalTime: 25,
    difficulty: 'easy',
    avgRating: 4.5,
    ratingCount: 94,
    imageUrl: undefined,
    tags: ['healthy', 'quick', 'protein']
  }
];

/**
 * Creates sample recipes in the database for testing
 */
export async function createSampleRecipes(): Promise<void> {
  try {
    // Ensure recipes table exists
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

    // Check if recipes already exist
    const { rows: existingRecipes } = await sql`SELECT COUNT(*) as count FROM recipes`;
    if (parseInt(existingRecipes[0].count) > 0) {
      console.log('Sample recipes already exist, skipping creation');
      return;
    }

    // Insert sample recipes
    for (const recipe of sampleRecipes) {
      await sql`
        INSERT INTO recipes (
          created_by_user_id, name, description, ingredients, instructions,
          nutrition_info, cuisine, meal_type, prep_time, cook_time,
          difficulty, avg_rating, rating_count, image_url, tags
        ) VALUES (
          ${recipe.createdByUserId || null}, ${recipe.name}, ${recipe.description},
          ${JSON.stringify(recipe.ingredients)}::jsonb, ${recipe.instructions},
          ${JSON.stringify(recipe.nutritionInfo)}::jsonb, ${recipe.cuisine},
          ${recipe.mealType}, ${recipe.prepTime}, ${recipe.cookTime},
          ${recipe.difficulty}, ${recipe.avgRating}, ${recipe.ratingCount},
          ${recipe.imageUrl || null}, ${JSON.stringify(recipe.tags)}
        )
      `;
    }

    console.log(`Created ${sampleRecipes.length} sample recipes`);
  } catch (error) {
    console.error('Failed to create sample recipes:', error);
    throw error;
  }
}

/**
 * Gets all recipes from the database
 */
export async function getAllRecipes(): Promise<Recipe[]> {
  try {
    const { rows } = await sql`
      SELECT * FROM recipes
      ORDER BY name ASC
    `;

    return rows.map(row => ({
      id: row.id,
      createdByUserId: row.created_by_user_id,
      name: row.name,
      description: row.description,
      ingredients: row.ingredients,
      instructions: row.instructions,
      nutritionInfo: row.nutrition_info,
      cuisine: row.cuisine,
      mealType: row.meal_type,
      prepTime: row.prep_time,
      cookTime: row.cook_time,
      totalTime: row.total_time,
      difficulty: row.difficulty,
      avgRating: parseFloat(row.avg_rating.toString()),
      ratingCount: row.rating_count,
      imageUrl: row.image_url,
      tags: row.tags,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (error) {
    console.error('Failed to get recipes:', error);
    throw error;
  }
}