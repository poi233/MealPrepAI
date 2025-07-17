import { NextRequest } from 'next/server';
import { withAuth, ApiErrors } from '@/lib/api-auth';

export const GET = withAuth(async (user: any) => {
  try {
    return Response.json(
      { 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          dietaryPreferences: user.dietaryPreferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get current user API error:', error);
    return Response.json(ApiErrors.INTERNAL_ERROR, { status: 500 });
  }
});