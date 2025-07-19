import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { removeFromFavorites, updateFavorite, isFavorited } from '@/lib/favorites';
import type { User } from '@/types/database.types';

// GET /api/favorites/[recipeId] - Check if recipe is favorited
export const GET = withAuth(async (user: User, request: NextRequest, { params }: { params: { recipeId: string } }) => {
  try {
    const { recipeId } = params;
    const favorited = await isFavorited(user.id, recipeId);

    return Response.json({ favorited });
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return Response.json(
      { error: 'Failed to check favorite status' },
      { status: 500 }
    );
  }
});

// PUT /api/favorites/[recipeId] - Update favorite details
export const PUT = withAuth(async (user: User, request: NextRequest, { params }: { params: { recipeId: string } }) => {
  try {
    const { recipeId } = params;
    const body = await request.json();
    const { personalRating, personalNotes } = body;

    const favorite = await updateFavorite(user.id, recipeId, personalRating, personalNotes);

    if (!favorite) {
      return Response.json(
        { error: 'Favorite not found' },
        { status: 404 }
      );
    }

    return Response.json(favorite);
  } catch (error) {
    console.error('Error updating favorite:', error);
    return Response.json(
      { error: 'Failed to update favorite' },
      { status: 500 }
    );
  }
});

// DELETE /api/favorites/[recipeId] - Remove from favorites
export const DELETE = withAuth(async (user: User, request: NextRequest, { params }: { params: { recipeId: string } }) => {
  try {
    const { recipeId } = params;
    const success = await removeFromFavorites(user.id, recipeId);

    if (!success) {
      return Response.json(
        { error: 'Favorite not found' },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return Response.json(
      { error: 'Failed to remove from favorites' },
      { status: 500 }
    );
  }
});