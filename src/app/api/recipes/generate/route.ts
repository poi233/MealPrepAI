import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { createRecipeWithAI } from '@/lib/ai-recipe-service';
import { createRecipe } from '@/lib/recipes';
import type { User } from '@/types/database.types';

// POST /api/recipes/generate - Generate recipe using AI
export const POST = withAuth(async (user: User, request: NextRequest) => {
  try {
    const body = await request.json();
    const { 
      recipeName, 
      mealType, 
      cuisine, 
      dietaryRestrictions, 
      servings,
      saveToDatabase = true 
    } = body;

    if (!recipeName) {
      return Response.json(
        { error: 'Recipe name is required' },
        { status: 400 }
      );
    }

    // Generate recipe using AI
    const result = await createRecipeWithAI({
      recipeName,
      cuisine,
      dietaryRestrictions,
      servings,
      createdByUserId: user.id,
    });

    if (!result.success) {
      return Response.json(
        { 
          error: result.message || 'Failed to generate recipe',
          validationErrors: result.errors 
        },
        { status: 400 }
      );
    }

    // Optionally save to database
    let savedRecipe = result.recipe;
    if (saveToDatabase && result.recipe) {
      try {
        savedRecipe = await createRecipe({
          createdByUserId: user.id,
          name: result.recipe.name,
          description: result.recipe.description,
          ingredients: result.recipe.ingredients,
          instructions: result.recipe.instructions,
          prepTime: result.recipe.prepTime,
          cookTime: result.recipe.cookTime,
          difficulty: result.recipe.difficulty,
          tags: result.recipe.tags,
          nutritionInfo: result.recipe.nutritionInfo,
          cuisine: result.recipe.cuisine,
          imageUrl: result.recipe.imageUrl,
        });
      } catch (dbError) {
        console.error('Error saving AI-generated recipe to database:', dbError);
        // Return the generated recipe even if saving fails
        return Response.json({
          ...result.recipe,
          warning: 'Recipe generated successfully but failed to save to database'
        });
      }
    }

    return Response.json(savedRecipe, { status: 201 });
  } catch (error) {
    console.error('Error generating recipe with AI:', error);
    return Response.json(
      { error: 'Failed to generate recipe with AI' },
      { status: 500 }
    );
  }
});