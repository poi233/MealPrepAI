'use server';

import { sql } from '@vercel/postgres';

// This file previously contained legacy meal plan functions that used JSONB storage.
// All legacy functions have been removed in favor of the normalized database structure.
// 
// The normalized meal plan system uses the following files:
// - src/lib/meal-plans-db.ts - Meal plan operations
// - src/lib/recipes.ts - Recipe operations  
// - src/lib/auth.ts - User authentication
//
// Legacy functions that were removed:
// - saveMealPlanToDb() -> Use createMealPlan() from meal-plans-db.ts
// - getMealPlanByNameFromDb() -> Use getMealPlanById() and getMealPlansForUser()
// - deleteMealPlanFromDbByName() -> Use deleteMealPlan()
// - getAllMealPlanNamesFromDb() -> Use getMealPlansForUser()
// - getActiveMealPlanFromDb() -> Use getActiveMealPlan()
// - setActivePlanInDb() -> Use setActiveMealPlan()
// - saveShoppingListToDb() -> To be implemented in normalized system
// - getShoppingListByPlanNameFromDb() -> To be implemented in normalized system
// - saveMealPlanAnalysisToDb() -> To be implemented in normalized system
// - getMealPlanAnalysisFromDb() -> To be implemented in normalized system

// Legacy table that was removed:
// - meal_plans (with JSONB storage) -> Replaced with normalized tables

export default {};