import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getUserFavorites, addToFavorites } from '@/lib/favorites';
import type { User } from '@/types/database.types';

// GET /api/favorites - Get user's favorites
export const GET = withAuth(async (user: User, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await getUserFavorites(user.id, limit, offset);

    return Response.json(result);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return Response.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
});

// POST /api/favorites - Add recipe to favorites
export const POST = withAuth(async (user: User, request: NextRequest) => {
  try {
    const body = await request.json();
    const { recipeId, personalRating, personalNotes } = body;

    if (!recipeId) {
      return Response.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }

    const favorite = await addToFavorites(user.id, recipeId, personalRating, personalNotes);

    return Response.json(favorite, { status: 201 });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return Response.json(
      { error: 'Failed to add to favorites' },
      { status: 500 }
    );
  }
});