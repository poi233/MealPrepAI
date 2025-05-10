
'use server';

import { sql } from '@vercel/postgres';
import type { GenerateWeeklyMealPlanOutput } from '@/ai/flows/generate-weekly-meal-plan';

async function ensureMealPlansTableExists(): Promise<void> {
  try {
    // This command creates the table meal_plans if it doesn't already exist.
    // dietary_preferences is marked as UNIQUE to allow ON CONFLICT behavior.
    // meal_plan_data stores the JSON output from the AI.
    // created_at and updated_at are timestamps for record management.
    await sql`
      CREATE TABLE IF NOT EXISTS meal_plans (
        id SERIAL PRIMARY KEY,
        dietary_preferences TEXT UNIQUE NOT NULL,
        meal_plan_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
  } catch (error) {
    console.error("Database error: Failed to ensure 'meal_plans' table exists:", error);
    // For critical table creation failure, re-throwing might be appropriate
    // to halt operations that depend on this table.
    throw new Error("Failed to initialize database table.");
  }
}

/**
 * Saves or updates a meal plan in the database.
 * If a plan with the same dietaryPreferences exists, it's updated. Otherwise, a new plan is inserted.
 * The `updated_at` timestamp is automatically set to the current time on insert or update.
 * @param dietaryPreferences - The user's dietary preferences string. This is used as a unique key.
 * @param mealPlanData - The meal plan object (GenerateWeeklyMealPlanOutput) to save.
 */
export async function saveMealPlanToDb(dietaryPreferences: string, mealPlanData: GenerateWeeklyMealPlanOutput): Promise<void> {
  await ensureMealPlansTableExists(); // Ensure the table is ready before operation.
  try {
    // Upsert operation: Inserts a new row or updates an existing one if dietary_preferences match.
    // EXCLUDED.meal_plan_data refers to the value that would have been inserted.
    await sql`
      INSERT INTO meal_plans (dietary_preferences, meal_plan_data, updated_at)
      VALUES (${dietaryPreferences}, ${JSON.stringify(mealPlanData)}::jsonb, NOW())
      ON CONFLICT (dietary_preferences)
      DO UPDATE SET
        meal_plan_data = EXCLUDED.meal_plan_data,
        updated_at = NOW();
    `;
  } catch (error) {
    console.error("Database error: Failed to save meal plan:", error);
    throw new Error("Failed to save meal plan to the database.");
  }
}

/**
 * Retrieves a meal plan from the database based on dietary preferences.
 * @param dietaryPreferences - The user's dietary preferences string.
 * @returns The meal plan data (GenerateWeeklyMealPlanOutput) if found, otherwise null.
 */
export async function getMealPlanByPreferencesFromDb(dietaryPreferences: string): Promise<GenerateWeeklyMealPlanOutput | null> {
  await ensureMealPlansTableExists(); // Ensure the table is ready.
  
  if (!dietaryPreferences || dietaryPreferences.trim() === "") {
    // Avoid querying with empty preferences; return null as no specific plan can be found.
    return null;
  }

  try {
    // Selects the meal_plan_data for the given dietary_preferences.
    // Since dietary_preferences is UNIQUE, LIMIT 1 is technically redundant but harmless.
    const { rows } = await sql`
      SELECT meal_plan_data FROM meal_plans
      WHERE dietary_preferences = ${dietaryPreferences}
      LIMIT 1;
    `;
    if (rows.length > 0) {
      // Data is stored as JSONB and should be automatically parsed to an object.
      return rows[0].meal_plan_data as GenerateWeeklyMealPlanOutput;
    }
    return null; // No plan found for these preferences.
  } catch (error) {
    console.error("Database error: Failed to retrieve meal plan by preferences:", error);
    throw new Error("Failed to retrieve meal plan from the database.");
  }
}
