import { NextRequest, NextResponse } from 'next/server';
import { loginUser, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usernameOrEmail, password } = body;

    // Validate required fields
    if (!usernameOrEmail || !password) {
      return NextResponse.json(
        { error: 'Username/email and password are required' },
        { status: 400 }
      );
    }

    // Attempt login
    const result = await loginUser(usernameOrEmail, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    // Create session for the user
    if (result.user) {
      await createSession(result.user.id);
    }

    return NextResponse.json(
      { 
        message: 'Login successful',
        user: {
          id: result.user!.id,
          username: result.user!.username,
          email: result.user!.email,
          displayName: result.user!.displayName,
          dietaryPreferences: result.user!.dietaryPreferences
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}