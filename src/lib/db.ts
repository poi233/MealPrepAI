
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
    
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='meal_plans' AND column_name='is_active';
    `;
    if (result.rows.length === 0) {
      await sql`ALTER TABLE meal_plans ADD COLUMN is_active BOOLEAN DEFAULT FALSE;`;
    }
    
    const descResult = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='meal_plans' AND column_name='plan_description';
    `;
    if (descResult.rows.length === 0) {
        await sql`ALTER TABLE meal_plans ADD COLUMN plan_description TEXT NOT NULL DEFAULT 'No description provided.';`;
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
    // Index on meal_plan_name for faster lookups if not already created by UNIQUE constraint
    // await sql`CREATE INDEX IF NOT EXISTS idx_shopping_lists_meal_plan_name ON shopping_lists (meal_plan_name);`;
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
  await ensureMealPlansTableExists(); // Ensures meal_plans table is there
  await ensureShoppingListsTableExists(); // Ensures shopping_lists table is there for CASCADE to work if defined or for manual deletion
  if (!planName || planName.trim() === "") {
    console.warn("Attempted to delete meal plan with empty plan name.");
    return;
  }
  try {
    // ON DELETE CASCADE on shopping_lists table will handle deletion of associated shopping list.
    const result = await sql`
      DELETE FROM meal_plans
      WHERE plan_name = ${planName};
    `;
    if (result.rowCount === 0) {
      console.log(`No meal plan found with name "${planName}" to delete.`);
    } else {
      console.log(`Successfully deleted meal plan with name "${planName}" and its associated shopping list (if any via CASCADE).`);
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

    if (effectivePlanName !== "") {
      console.log(`Successfully set plan "${effectivePlanName}" as active.`);
    } else {
      console.log(`Successfully cleared all active plans.`);
    }

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
  if (shoppingListText === null || shoppingListText === undefined) { // Allow empty string
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
