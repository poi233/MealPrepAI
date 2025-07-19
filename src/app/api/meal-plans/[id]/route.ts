import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getMealPlanById, updateMealPlan, deleteMealPlan } from '@/lib/meal-plans-db';
import type { User } from '@/types/database.types';

interface RouteParams {
  params: { id: string };
}

// GET /api/meal-plans/[id] - Get specific meal plan
export const GET = withAuth(async (user: User, request: NextRequest, { params }: RouteParams) => {
  try {
    const mealPlan = await getMealPlanById(params.id);
    
    if (!mealPlan) {
      return Response.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      );
    }

    // Check if user owns this meal plan
    if (mealPlan.userId !== user.id) {
      return Response.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return Response.json(mealPlan);
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    return Response.json(
      { error: 'Failed to fetch meal plan' },
      { status: 500 }
    );
  }
});

// PUT /api/meal-plans/[id] - Update meal plan
export const PUT = withAuth(async (user: User, request: NextRequest, { params }: RouteParams) => {
  try {
    const body = await request.json();
    const { name, description, isActive } = body;

    // First check if meal plan exists and user owns it
    const existingPlan = await getMealPlanById(params.id);
    if (!existingPlan) {
      return Response.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      );
    }

    if (existingPlan.userId !== user.id) {
      return Response.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const updatedMealPlan = await updateMealPlan(params.id, {
      name,
      description,
      isActive
    });

    if (!updatedMealPlan) {
      return Response.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      );
    }

    return Response.json(updatedMealPlan);
  } catch (error) {
    console.error('Error updating meal plan:', error);
    return Response.json(
      { error: 'Failed to update meal plan' },
      { status: 500 }
    );
  }
});

// DELETE /api/meal-plans/[id] - Delete meal plan
export const DELETE = withAuth(async (user: User, request: NextRequest, { params }: RouteParams) => {
  try {
    // First check if meal plan exists and user owns it
    const existingPlan = await getMealPlanById(params.id);
    if (!existingPlan) {
      return Response.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      );
    }

    if (existingPlan.userId !== user.id) {
      return Response.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const success = await deleteMealPlan(params.id);
    
    if (!success) {
      return Response.json(
        { error: 'Failed to delete meal plan' },
        { status: 500 }
      );
    }

    return Response.json({ message: 'Meal plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting meal plan:', error);
    return Response.json(
      { error: 'Failed to delete meal plan' },
      { status: 500 }
    );
  }
});