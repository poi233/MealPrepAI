import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, updateUserProfile } from '@/lib/auth';
import type { DietaryPreferences } from '@/types/database.types';

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { displayName, dietaryPreferences, email } = body;

    // Update user profile
    const result = await updateUserProfile(user.id, {
      displayName,
      dietaryPreferences: dietaryPreferences as DietaryPreferences,
      email
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Profile updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}