/**
 * @fileOverview API routes for favorites operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFavoritesByUserIdFromDb, saveFavoriteToDb, deleteFavoriteFromDb } from '@/lib/favorites-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'dev-user';
    
    const favorites = await getFavoritesByUserIdFromDb(userId);
    
    return NextResponse.json({ 
      success: true, 
      data: favorites 
    });
  } catch (error) {
    console.error('Error getting favorites:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get favorites' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = 'dev-user', meal, additionalData } = body;
    
    const favoriteData = {
      user_id: userId,
      meal_id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: meal.recipeName,
      description: `Favorite recipe: ${meal.recipeName}`,
      image_url: additionalData?.imageUrl,
      cuisine: additionalData?.cuisine || 'Unknown',
      meal_type: additionalData?.mealType || 'dinner',
      ingredients: meal.ingredients,
      cooking_time: 30, // Default cooking time
      difficulty: 'medium' as const,
      rating: additionalData?.rating || 3,
      tags: additionalData?.tags || [],
      nutrition_info: {},
      recipe_data: {
        recipeName: meal.recipeName,
        ingredients: meal.ingredients,
        instructions: meal.instructions,
        servings: 1,
        prepTime: 10,
        cookTime: 30
      },
      use_count: 0,
      is_shared: false
    };

    const favoriteId = await saveFavoriteToDb(favoriteData);
    
    return NextResponse.json({ 
      success: true, 
      data: { id: favoriteId } 
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add favorite' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const favoriteId = searchParams.get('id');
    
    if (!favoriteId) {
      return NextResponse.json(
        { success: false, error: 'Favorite ID is required' },
        { status: 400 }
      );
    }
    
    await deleteFavoriteFromDb(favoriteId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Favorite deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting favorite:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete favorite' 
      },
      { status: 500 }
    );
  }
}