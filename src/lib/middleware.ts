import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from './auth';

// Routes that require authentication
const protectedRoutes = [
  '/profile',
  '/meal-plans',
  '/favorites',
  '/collections',
  '/api/favorites',
  '/api/meal-plans',
  '/api/collections',
  '/api/auth/profile',
  '/api/auth/change-password',
  '/api/auth/me'
];

// Routes that should redirect to home if user is already authenticated
const authRoutes = ['/login', '/register'];

// Public routes that don't require any authentication checks
const publicRoutes = [
  '/',
  '/about',
  '/contact',
  '/api/health'
];

export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public routes
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || (route !== '/' && pathname.startsWith(route))
  );
  
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Check if the route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Check if it's an auth route (login/register)
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );

  try {
    const sessionValidation = await validateSession();
    const isAuthenticated = sessionValidation.valid;

    // If user is authenticated and trying to access auth routes, redirect to home
    if (isAuthenticated && isAuthRoute) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // If user is not authenticated and trying to access protected routes, redirect to login
    if (!isAuthenticated && isProtectedRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Create response and add user info to headers for API routes
    const response = NextResponse.next();
    
    if (isAuthenticated && sessionValidation.userId) {
      // Add user ID to request headers for API routes
      response.headers.set('x-user-id', sessionValidation.userId);
      
      // Add user info for debugging (in development only)
      if (process.env.NODE_ENV === 'development' && sessionValidation.user) {
        response.headers.set('x-user-username', sessionValidation.user.username);
      }
    }

    return response;
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // If there's an error and it's a protected route, redirect to login
    if (isProtectedRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'session-error');
      return NextResponse.redirect(loginUrl);
    }
    
    return NextResponse.next();
  }
}

// Helper function to check if a route is protected
export function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route));
}

// Helper function to check if a route is an auth route
export function isAuthRoute(pathname: string): boolean {
  return authRoutes.some(route => pathname.startsWith(route));
}