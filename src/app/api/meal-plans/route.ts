import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getMealPlansForUser, createMealPlan } from '@/lib/meal-plans-db';
import type { User } from '@/types/database.types';

// GET /api/meal-plans - Get user's meal plans
export const GET = withAuth(async (user: User, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const isActive = searchParams.get('active') === 'true' ? true : undefined;

    const result = await getMealPlansForUser({
      userId: user.id,
      isActive,
      limit,
      offset
    });

    return Response.json(result);
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    return Response.json(
      { error: 'Failed to fetch meal plans' },
      { status: 500 }
    );
  }
});

// POST /api/meal-plans - Create new meal plan
export const POST = withAuth(async (user: User, request: NextRequest) => {
  try {
    const body = await request.json();
    const { name, description, weekStartDate } = body;

    if (!name || !weekStartDate) {
      return Response.json(
        { error: 'Name and week start date are required' },
        { status: 400 }
      );
    }

    const mealPlan = await createMealPlan({
      userId: user.id,
      name,
      description,
      weekStartDate: new Date(weekStartDate),
      isActive: false
    });

    return Response.json(mealPlan, { status: 201 });
  } catch (error) {
    console.error('Error creating meal plan:', error);
    return Response.json(
      { error: 'Failed to create meal plan' },
      { status: 500 }
    );
  }
});