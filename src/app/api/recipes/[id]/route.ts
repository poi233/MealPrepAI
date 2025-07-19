import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getRecipeById, updateRecipeFixed, deleteRecipe } from '@/lib/recipes';
import type { User } from '@/types/database.types';

// GET /api/recipes/[id] - Get recipe by ID (public)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recipe = await getRecipeById(params.id);
    
    if (!recipe) {
      return Response.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    return Response.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return Response.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    );
  }
}

// PUT /api/recipes/[id] - Update recipe (requires auth and ownership)
export const PUT = withAuth(async (user: User, request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    // First check if recipe exists and user owns it
    const existingRecipe = await getRecipeById(params.id);
    if (!existingRecipe) {
      return Response.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Check ownership - only recipe creator can update
    if (existingRecipe.createdByUserId !== user.id) {
      return Response.json(
        { error: 'You can only edit recipes you created' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      ingredients, 
      instructions, 
      mealType, 
      prepTime, 
      cookTime,
      difficulty,
      cuisine,
      tags,
      nutritionInfo,
      imageUrl
    } = body;

    // Validate required fields if provided
    if (name !== undefined && (!name || name.trim() === '')) {
      return Response.json(
        { error: 'Recipe name cannot be empty' },
        { status: 400 }
      );
    }

    if (ingredients !== undefined && (!Array.isArray(ingredients) || ingredients.length === 0)) {
      return Response.json(
        { error: 'Recipe must have at least one ingredient' },
        { status: 400 }
      );
    }

    if (instructions !== undefined && (!instructions || instructions.trim() === '')) {
      return Response.json(
        { error: 'Recipe instructions cannot be empty' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (ingredients !== undefined) updates.ingredients = ingredients;
    if (instructions !== undefined) updates.instructions = instructions;
    if (mealType !== undefined) updates.mealType = mealType;
    if (prepTime !== undefined) updates.prepTime = prepTime;
    if (cookTime !== undefined) updates.cookTime = cookTime;
    if (difficulty !== undefined) updates.difficulty = difficulty;
    if (cuisine !== undefined) updates.cuisine = cuisine;
    if (tags !== undefined) updates.tags = tags;
    if (nutritionInfo !== undefined) updates.nutritionInfo = nutritionInfo;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;

    const updatedRecipe = await updateRecipeFixed(params.id, updates);

    return Response.json(updatedRecipe);
  } catch (error) {
    console.error('Error updating recipe:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to update recipe' },
      { status: 500 }
    );
  }
});

// DELETE /api/recipes/[id] - Delete recipe (requires auth and ownership)
export const DELETE = withAuth(async (user: User, request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    // First check if recipe exists and user owns it
    const existingRecipe = await getRecipeById(params.id);
    if (!existingRecipe) {
      return Response.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Check ownership - only recipe creator can delete
    if (existingRecipe.createdByUserId !== user.id) {
      return Response.json(
        { error: 'You can only delete recipes you created' },
        { status: 403 }
      );
    }

    // Check query parameter for removing from meal plans
    const url = new URL(request.url);
    const removeFromMealPlans = url.searchParams.get('removeFromMealPlans') === 'true';

    await deleteRecipe(params.id, { removeFromMealPlans });

    return Response.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    
    if (error instanceof Error && error.message.includes('meal plans')) {
      return Response.json(
        { 
          error: error.message,
          canForceDelete: true 
        },
        { status: 409 } // Conflict status for recipes used in meal plans
      );
    }
    
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to delete recipe' },
      { status: 500 }
    );
  }
});