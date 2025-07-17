# Authentication System Documentation

This document describes the enhanced authentication middleware and session management system implemented for MealPrepAI.

## Overview

The authentication system provides:
- **Session Management**: Secure cookie-based sessions with automatic refresh
- **Route Protection**: Middleware-based route protection for both pages and API routes
- **React Context**: Client-side authentication state management
- **UI Components**: Ready-to-use authentication components

## Core Components

### 1. Session Management (`src/lib/auth.ts`)

Enhanced session management with automatic refresh:

```typescript
// Create a session (called after login/register)
await createSession(userId);

// Get current session with refresh check
const session = await getSession();
if (session?.needsRefresh) {
  await refreshSession(session.userId);
}

// Validate session and get user
const validation = await validateSession();
if (validation.valid) {
  console.log('User:', validation.user);
}

// Clear session (logout)
await clearSession();
```

### 2. Middleware Protection (`src/lib/middleware.ts`)

Automatic route protection with configurable routes:

```typescript
// Protected routes (require authentication)
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

// Auth routes (redirect if already authenticated)
const authRoutes = ['/login', '/register'];

// Public routes (no authentication checks)
const publicRoutes = ['/', '/about', '/contact', '/api/health'];
```

### 3. API Route Authentication (`src/lib/api-auth.ts`)

Utilities for protecting API routes:

```typescript
// Require authentication in API routes
export const GET = withAuth(async (user, request) => {
  // user is guaranteed to be authenticated
  return Response.json({ message: `Hello ${user.username}` });
});

// Optional authentication
export const GET = withOptionalAuth(async (user, request) => {
  if (user) {
    return Response.json({ message: `Hello ${user.username}` });
  } else {
    return Response.json({ message: 'Hello guest' });
  }
});

// Manual authentication check
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    return Response.json({ user });
  } catch (error) {
    return Response.json(ApiErrors.UNAUTHORIZED, { status: 401 });
  }
}
```

### 4. React Context (`src/contexts/AuthContext.tsx`)

Enhanced context with session error handling:

```typescript
function MyComponent() {
  const { 
    user, 
    isLoading, 
    isAuthenticated, 
    sessionError,
    login, 
    logout,
    clearSessionError 
  } = useAuth();

  if (sessionError) {
    return <div>Session error: {sessionError}</div>;
  }

  if (isLoading) return <div>Loading...</div>;
  
  return isAuthenticated ? (
    <div>Welcome {user?.username}!</div>
  ) : (
    <div>Please log in</div>
  );
}
```

### 5. Route Protection Hook (`src/hooks/useProtectedRoute.ts`)

Custom hook for protecting routes:

```typescript
function ProtectedPage() {
  const { isAuthenticated, isLoading, canAccess } = useProtectedRoute({
    requireAuth: true,
    redirectTo: '/login'
  });

  if (isLoading) return <div>Loading...</div>;
  if (!canAccess) return null; // Will redirect automatically

  return <div>Protected content</div>;
}

// For guest-only routes (login/register)
function LoginPage() {
  const { shouldRedirect } = useGuestRoute('/dashboard');
  
  if (shouldRedirect) return null; // Will redirect automatically
  
  return <LoginForm />;
}
```

### 6. UI Components

#### AuthGuard Component

```typescript
import { AuthGuard } from '@/components/auth';

function App() {
  return (
    <AuthGuard requireAuth={true} redirectTo="/login">
      <ProtectedContent />
    </AuthGuard>
  );
}

// With custom fallback
function App() {
  return (
    <AuthGuard 
      requireAuth={true} 
      fallback={<div>Please log in to continue</div>}
    >
      <ProtectedContent />
    </AuthGuard>
  );
}

// As HOC
const ProtectedComponent = withAuthGuard(MyComponent, {
  requireAuth: true,
  redirectTo: '/login'
});
```

#### SessionStatus Component

```typescript
import { SessionStatus, AuthStatus } from '@/components/auth';

function Header() {
  return (
    <header>
      <nav>
        {/* Full user menu with dropdown */}
        <SessionStatus />
        
        {/* Simple status indicator */}
        <AuthStatus />
      </nav>
    </header>
  );
}
```

## Usage Examples

### Protecting a Page

```typescript
// pages/profile/page.tsx
import { AuthGuard } from '@/components/auth';

export default function ProfilePage() {
  return (
    <AuthGuard>
      <div>
        <h1>User Profile</h1>
        {/* Protected content */}
      </div>
    </AuthGuard>
  );
}
```

### Protecting an API Route

```typescript
// app/api/user-data/route.ts
import { withAuth, ApiErrors } from '@/lib/api-auth';

export const GET = withAuth(async (user) => {
  try {
    const userData = await getUserData(user.id);
    return Response.json({ data: userData });
  } catch (error) {
    return Response.json(ApiErrors.INTERNAL_ERROR, { status: 500 });
  }
});
```

### Using Authentication in Components

```typescript
import { useAuth } from '@/contexts/AuthContext';

function UserProfile() {
  const { user, updateProfile, isLoading } = useAuth();

  const handleUpdateProfile = async (updates) => {
    const result = await updateProfile(updates);
    if (result.success) {
      console.log('Profile updated successfully');
    } else {
      console.error('Update failed:', result.error);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Welcome, {user?.displayName || user?.username}!</h2>
      <p>Email: {user?.email}</p>
      {/* Profile update form */}
    </div>
  );
}
```

## Security Features

1. **Secure Cookies**: HttpOnly, Secure (in production), SameSite=Lax
2. **Session Expiration**: 7-day expiration with automatic refresh
3. **Session Validation**: Validates user existence on each request
4. **CSRF Protection**: SameSite cookie attribute helps prevent CSRF
5. **Password Security**: bcrypt with 12 salt rounds
6. **Input Validation**: Comprehensive validation for all auth operations

## Error Handling

The system provides comprehensive error handling:

- **Session Errors**: Displayed to user with option to re-authenticate
- **API Errors**: Standardized error responses with proper HTTP status codes
- **Network Errors**: Graceful handling of network failures
- **Validation Errors**: Clear error messages for invalid input

## Migration Notes

- The existing `withAuth` HOC is deprecated in favor of `AuthGuard` component
- All API routes should migrate to use the new `withAuth` wrapper
- Session management is now automatic - no manual refresh needed
- Error handling is more robust with better user feedback