import { NextRequest } from 'next/server';
import { validateSession, getCurrentUser } from './auth';
import type { User } from '@/types/database.types';

/**
 * Extract user ID from request headers (set by middleware)
 */
export function getUserIdFromHeaders(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

/**
 * Get authenticated user from request
 * This function should be used in API routes that require authentication
 */
export async function getAuthenticatedUser(request?: NextRequest): Promise<User | null> {
  // Try to get user ID from headers first (more efficient)
  if (request) {
    const userId = getUserIdFromHeaders(request);
    if (userId) {
      // We could cache this or get user details from headers in the future
      return await getCurrentUser();
    }
  }

  // Fallback to session validation
  const sessionValidation = await validateSession();
  return sessionValidation.valid ? sessionValidation.user || null : null;
}

/**
 * Require authentication in API routes
 * Throws an error if user is not authenticated
 */
export async function requireAuthenticatedUser(request?: NextRequest): Promise<User> {
  const user = await getAuthenticatedUser(request);
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Create standardized API error responses
 */
export const ApiErrors = {
  UNAUTHORIZED: {
    error: 'Authentication required',
    code: 'UNAUTHORIZED'
  },
  FORBIDDEN: {
    error: 'Access denied',
    code: 'FORBIDDEN'
  },
  NOT_FOUND: {
    error: 'Resource not found',
    code: 'NOT_FOUND'
  },
  VALIDATION_ERROR: (message: string) => ({
    error: message,
    code: 'VALIDATION_ERROR'
  }),
  INTERNAL_ERROR: {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  }
} as const;

/**
 * Wrapper for API route handlers that require authentication
 */
export function withAuth<T extends unknown[]>(
  handler: (user: User, request: NextRequest, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    try {
      const user = await requireAuthenticatedUser(request);
      return await handler(user, request, ...args);
    } catch (error) {
      console.error('API Auth error:', error);
      return Response.json(ApiErrors.UNAUTHORIZED, { status: 401 });
    }
  };
}

/**
 * Wrapper for API route handlers with optional authentication
 */
export function withOptionalAuth<T extends unknown[]>(
  handler: (user: User | null, request: NextRequest, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    try {
      const user = await getAuthenticatedUser(request);
      return await handler(user, request, ...args);
    } catch (error) {
      console.error('API Auth error:', error);
      return await handler(null, request, ...args);
    }
  };
}