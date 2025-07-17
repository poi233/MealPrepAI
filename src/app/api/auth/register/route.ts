import { NextRequest, NextResponse } from 'next/server';
import { registerUser, createSession } from '@/lib/auth';
import type { DietaryPreferences } from '@/types/database.types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, displayName, dietaryPreferences } = body;

    // Validate required fields
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    // Register user
    const result = await registerUser(
      username,
      email,
      password,
      displayName,
      dietaryPreferences as DietaryPreferences
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Create session for the new user
    if (result.userId) {
      await createSession(result.userId);
    }

    return NextResponse.json(
      { 
        message: 'User registered successfully',
        userId: result.userId
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}