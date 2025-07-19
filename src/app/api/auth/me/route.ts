import { withAuth, ApiErrors } from '@/lib/api-auth';

import type { User } from '@/types/database.types';

export const GET = withAuth(async (user: User) => {
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