import { NextRequest } from 'next/server';
import { withAuth, withOptionalAuth } from '@/lib/api-auth';
import { getAllRecipes, createRecipe } from '@/lib/recipes';
import type { User } from '@/types/database.types';

// GET /api/recipes - Get all recipes (public + user's private recipes)
export const GET = withOptionalAuth(async (user: User | null, request: NextRequest) => {
  try {
    const url = new URL(request.url || 'http://localhost:3000/api/recipes');
    const { searchParams } = url;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const recipes = await getAllRecipes(limit, offset);

    return Response.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return Response.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
});

// POST /api/recipes - Create new recipe (requires auth)
export const POST = withAuth(async (user: User, request: NextRequest) => {
  try {
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
      tags 
    } = body;

    if (!name || !ingredients || !instructions || !mealType) {
      return Response.json(
        { error: 'Name, ingredients, instructions, and meal type are required' },
        { status: 400 }
      );
    }

    const recipe = await createRecipe({
      createdByUserId: user.id,
      name,
      description,
      ingredients,
      instructions,
      mealType,
      prepTime: prepTime || 0,
      cookTime: cookTime || 0,
      difficulty: difficulty || 'medium',
      tags: tags || [],
      nutritionInfo: {},
      cuisine: undefined,
      imageUrl: undefined
    });

    return Response.json(recipe, { status: 201 });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return Response.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    );
  }
});