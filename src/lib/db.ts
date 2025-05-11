'use server';

import { sql } from '@vercel/postgres';
import type { GenerateWeeklyMealPlanOutput } from '@/ai/flows/generate-weekly-meal-plan';

// Define a type for the meal plan record retrieved from DB, including plan_description
export type MealPlanRecord = GenerateWeeklyMealPlanOutput & {
  planName: string;
  planDescription: string;
  isActive: boolean;
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    // Ensure plan_name has a unique index if not already covered by UNIQUE constraint
    // (UNIQUE constraint implicitly creates an index)
    // await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_name_unique ON meal_plans (plan_name);`;

    // Add is_active column if it doesn't exist (for migration from older schema)
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='meal_plans' AND column_name='is_active';
    `;
    if (result.rows.length === 0) {
      await sql`ALTER TABLE meal_plans ADD COLUMN is_active BOOLEAN DEFAULT FALSE;`;
    }
    
    // Add plan_description column if it doesn't exist (for migration)
    const descResult = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='meal_plans' AND column_name='plan_description';
    `;
    if (descResult.rows.length === 0) {
        await sql`ALTER TABLE meal_plans ADD COLUMN plan_description TEXT NOT NULL DEFAULT 'No description provided.';`;
    }
    // Old dietary_preferences column cleanup (if exists and no longer needed)
    // This should be handled carefully, potentially as a separate migration script.
    // For now, we assume new tables or this will be handled manually if migrating.
  } catch (error) {
    console.error("Database error: Failed to ensure 'meal_plans' table exists/is updated:", error);
    throw new Error("Failed to initialize database table.");
  }
}

export async function saveMealPlanToDb(
  planName: string,
  planDescription: string,
  mealPlanData: GenerateWeeklyMealPlanOutput
): Promise<void> {
  await ensureMealPlansTableExists();
  try {
    // When saving, is_active is not directly set here. setActivePlanInDb handles that.
    await sql`
      INSERT INTO meal_plans (plan_name, plan_description, meal_plan_data, updated_at)
      VALUES (${planName}, ${planDescription}, ${JSON.stringify(mealPlanData)}::jsonb, NOW())
      ON CONFLICT (plan_name)
      DO UPDATE SET
        plan_description = EXCLUDED.plan_description,
        meal_plan_data = EXCLUDED.meal_plan_data,
        updated_at = NOW();
    `;
  } catch (error) {
    console.error("Database error: Failed to save meal plan:", error);
    throw new Error("Failed to save meal plan to the database.");
  }
}

export async function getMealPlanByNameFromDb(planName: string): Promise<{ mealPlanData: GenerateWeeklyMealPlanOutput; planDescription: string; isActive: boolean } | null> {
  await ensureMealPlansTableExists();
  if (!planName || planName.trim() === "") {
    return null;
  }
  try {
    const { rows } = await sql`
      SELECT meal_plan_data, plan_description, is_active FROM meal_plans
      WHERE plan_name = ${planName}
      LIMIT 1;
    `;
    if (rows.length > 0) {
      return {
        mealPlanData: rows[0].meal_plan_data as GenerateWeeklyMealPlanOutput,
        planDescription: rows[0].plan_description as string,
        isActive: rows[0].is_active as boolean,
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
  if (!planName || planName.trim() === "") {
    console.warn("Attempted to delete meal plan with empty plan name.");
    return;
  }
  try {
    const result = await sql`
      DELETE FROM meal_plans
      WHERE plan_name = ${planName};
    `;
    if (result.rowCount === 0) {
      console.log(`No meal plan found with name "${planName}" to delete.`);
    } else {
      console.log(`Successfully deleted meal plan with name "${planName}".`);
    }
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

export async function getActiveMealPlanFromDb(): Promise<{ planName: string; planDescription: string; mealPlanData: GenerateWeeklyMealPlanOutput } | null> {
  await ensureMealPlansTableExists();
  try {
    const { rows } = await sql`
      SELECT plan_name, plan_description, meal_plan_data FROM meal_plans
      WHERE is_active = TRUE
      LIMIT 1;
    `;
    if (rows.length > 0) {
      return {
        planName: rows[0].plan_name as string,
        planDescription: rows[0].plan_description as string,
        mealPlanData: rows[0].meal_plan_data as GenerateWeeklyMealPlanOutput,
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
  if (!planName || planName.trim() === "") {
    throw new Error("Plan name cannot be empty when setting active plan.");
  }
  try {
    // Begin transaction
    await sql.query('BEGIN');
    
    // Set all plans to inactive
    await sql`UPDATE meal_plans SET is_active = FALSE WHERE is_active = TRUE;`;
    
    // Set the specified plan to active
    const result = await sql`
      UPDATE meal_plans SET is_active = TRUE, updated_at = NOW()
      WHERE plan_name = ${planName};
    `;

    if (result.rowCount === 0) {
      await sql.query('ROLLBACK'); // Rollback if the plan name doesn't exist
      throw new Error(`Plan with name "${planName}" not found. Cannot set as active.`);
    }
    
    // Commit transaction
    await sql.query('COMMIT');
    console.log(`Successfully set plan "${planName}" as active.`);
  } catch (error) {
    await sql.query('ROLLBACK'); // Rollback on any error
    console.error(`Database error: Failed to set active plan status for "${planName}":`, error);
    throw new Error(`Failed to update active plan status for "${planName}": ${(error as Error).message}`);
  }
}
