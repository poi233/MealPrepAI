// Legacy meal plans service - migrated to Django backend
// This file is kept for backward compatibility

export { DjangoMealPlansService } from './django-meal-plans';

// Re-export types with legacy names for compatibility
export type {
  MealPlan,
  MealPlanItem,
  MealPlanCreateData,
  MealPlanUpdateData,
  MealPlanItemCreateData,
  MealPlanItemUpdateData,
  GenerateMealPlanRequest,
  AnalyzeMealPlanRequest,
  ShoppingListItem
} from './django-meal-plans';

// Legacy functions for backward compatibility
import { DjangoMealPlansService } from './django-meal-plans';
import type { MealPlan } from '@/types/database.types';

// Helper function to convert Django meal plan to database format
function convertDjangoMealPlanToDatabase(djangoPlan: any): MealPlan {
  return {
    id: djangoPlan.id,
    userId: djangoPlan.user_id || 'current-user', // Django doesn't return user_id in response
    name: djangoPlan.name,
    description: djangoPlan.description,
    weekStartDate: new Date(djangoPlan.week_start_date),
    isActive: djangoPlan.is_active,
    items: (djangoPlan.items || []).map((item: any) => ({
      id: item.id,
      mealPlanId: djangoPlan.id,
      recipeId: item.recipe.id,
      dayOfWeek: item.day_of_week,
      mealType: item.meal_type,
      servings: item.servings || 1,
      notes: item.notes,
      position: item.position || 0,
      recipe: {
        id: item.recipe.id,
        createdByUserId: item.recipe.created_by_user_id,
        name: item.recipe.name,
        description: item.recipe.description,
        ingredients: item.recipe.ingredients || [],
        instructions: item.recipe.instructions || '',
        nutritionInfo: item.recipe.nutrition_info || {},
        cuisine: item.recipe.cuisine,
        prepTime: item.recipe.prep_time || 0,
        cookTime: item.recipe.cook_time || 0,
        totalTime: (item.recipe.prep_time || 0) + (item.recipe.cook_time || 0),
        difficulty: item.recipe.difficulty || 'medium',
        avgRating: Number(item.recipe.avg_rating) || 0,
        ratingCount: Number(item.recipe.rating_count) || 0,
        imageUrl: item.recipe.image_url,
        tags: item.recipe.tags || [],
        createdAt: item.recipe.created_at ? new Date(item.recipe.created_at) : new Date(),
        updatedAt: item.recipe.updated_at ? new Date(item.recipe.updated_at) : new Date()
      },
      createdAt: item.created_at ? new Date(item.created_at) : new Date(),
      updatedAt: item.updated_at ? new Date(item.updated_at) : new Date()
    })),
    createdAt: new Date(djangoPlan.created_at),
    updatedAt: new Date(djangoPlan.updated_at)
  };
}

export async function getMealPlansForUser(filters: any) {
  const response = await DjangoMealPlansService.getMealPlans({
    page: Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1,
    page_size: filters.limit || 20,
    is_active: filters.isActive,
    ordering: filters.sortBy === 'name' ? (filters.sortOrder === 'asc' ? 'name' : '-name') : 
              filters.sortBy === 'week_start_date' ? (filters.sortOrder === 'asc' ? 'week_start_date' : '-week_start_date') :
              (filters.sortOrder === 'asc' ? 'created_at' : '-created_at')
  });
  
  return {
    mealPlans: response.results.map(convertDjangoMealPlanToDatabase),
    total: response.count
  };
}

export async function getMealPlanById(id: string) {
  const djangoPlan = await DjangoMealPlansService.getMealPlan(id);
  return convertDjangoMealPlanToDatabase(djangoPlan);
}

export async function createMealPlan(data: any) {
  const djangoPlan = await DjangoMealPlansService.createMealPlan({
    name: data.name,
    description: data.description,
    week_start_date: data.weekStartDate?.toISOString()?.split('T')[0] || new Date().toISOString().split('T')[0]
  });
  return convertDjangoMealPlanToDatabase(djangoPlan);
}

export async function updateMealPlan(id: string, updates: any) {
  const djangoPlan = await DjangoMealPlansService.updateMealPlan(id, {
    name: updates.name,
    description: updates.description,
    week_start_date: updates.weekStartDate?.toISOString()?.split('T')[0],
    is_active: updates.isActive
  });
  return convertDjangoMealPlanToDatabase(djangoPlan);
}

export async function deleteMealPlan(id: string) {
  await DjangoMealPlansService.deleteMealPlan(id);
  return true;
}

export async function getActiveMealPlan(userId: string) {
  const djangoPlan = await DjangoMealPlansService.getActiveMealPlan();
  return djangoPlan ? convertDjangoMealPlanToDatabase(djangoPlan) : null;
}

export async function setActiveMealPlan(userId: string, mealPlanId: string) {
  await DjangoMealPlansService.activateMealPlan(mealPlanId);
}

export async function addRecipeToMealPlan(
  mealPlanId: string, 
  recipeId: string, 
  dayOfWeek: number, 
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
) {
  return DjangoMealPlansService.addMealPlanItem(mealPlanId, {
    day_of_week: dayOfWeek,
    meal_type: mealType,
    recipe_id: recipeId,
    servings: 1
  });
}

export async function removeRecipeFromMealPlan(
  mealPlanId: string, 
  dayOfWeek: number, 
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
) {
  await DjangoMealPlansService.removeMealPlanItem(mealPlanId, dayOfWeek, mealType);
  return true;
}

export async function updateMealPlanItem(
  mealPlanId: string, 
  dayOfWeek: number, 
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  newRecipeId: string
) {
  return DjangoMealPlansService.updateMealPlanItem(mealPlanId, dayOfWeek, mealType, {
    recipe_id: newRecipeId
  });
}

export async function getMealPlanItems(mealPlanId: string) {
  return DjangoMealPlansService.getMealPlanItems(mealPlanId);
}

export async function getMealPlanItemsForDay(mealPlanId: string, dayOfWeek: number) {
  const allItems = await DjangoMealPlansService.getMealPlanItems(mealPlanId);
  return allItems.filter(item => item.day_of_week === dayOfWeek);
}

export async function clearMealPlan(mealPlanId: string) {
  // This would need to be implemented by removing all items individually
  const items = await DjangoMealPlansService.getMealPlanItems(mealPlanId);
  for (const item of items) {
    await DjangoMealPlansService.removeMealPlanItem(mealPlanId, item.day_of_week, item.meal_type);
  }
}

export async function createMockUser(userId: string) {
  // No-op for Django backend (users are managed by Django auth)
}