# Django Backend Migration Guide

This document outlines the migration from the local Next.js API routes to the Django backend in `MealPrepAppBackend`.

## Overview

The MealPrepAI frontend has been migrated to use the Django backend instead of local API routes. This provides better scalability, proper authentication, and centralized data management.

## Migration Changes

### 1. Environment Configuration

Updated `.env` file with new environment variables:

```bash
# Backend API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_BASE_URL_PROD=https://meal-prep-app-backend.vercel.app
```

### 2. New Service Files

Created new service files that communicate with the Django backend:

- `src/lib/api-client.ts` - Base API client for Django communication
- `src/lib/django-auth.ts` - Authentication service using JWT tokens
- `src/lib/django-recipe-service.ts` - Recipe management service
- `src/lib/django-favorites.ts` - Favorites and collections service
- `src/lib/django-meal-plans.ts` - Meal plan management service
- `src/lib/django-ai-service.ts` - AI integration service

### 3. Legacy Compatibility

Updated existing service files to maintain backward compatibility:

- `src/lib/auth.ts` - Wrapper around Django auth service
- `src/lib/recipe-service.ts` - Wrapper around Django recipe service
- `src/lib/favorites.ts` - Wrapper around Django favorites service
- `src/lib/meal-plans-db.ts` - Wrapper around Django meal plans service

### 4. Authentication Changes

- **Before**: Cookie-based sessions with local user management
- **After**: JWT tokens with Django authentication
- **Storage**: Tokens stored in localStorage, managed by `DjangoAuthService`

## API Endpoint Mapping

### Authentication
| Frontend Route | Django Endpoint | Description |
|----------------|-----------------|-------------|
| `/api/auth/login` | `/api/auth/login/` | User login |
| `/api/auth/register` | `/api/auth/register/` | User registration |
| `/api/auth/logout` | `/api/auth/logout/` | User logout |
| `/api/auth/me` | `/api/auth/me/` | Get current user |
| `/api/auth/profile` | `/api/auth/profile/` | Update user profile |
| `/api/auth/change-password` | `/api/auth/change-password/` | Change password |
| `/api/auth/delete-account` | `/api/auth/delete-account/` | Delete account |

### Recipes
| Frontend Route | Django Endpoint | Description |
|----------------|-----------------|-------------|
| `/api/recipes` | `/api/recipes/` | List/create recipes |
| `/api/recipes/[id]` | `/api/recipes/{id}/` | Get/update/delete recipe |
| `/api/recipes/generate` | `/api/recipes/generate/` | Generate recipe with AI |

### Favorites
| Frontend Route | Django Endpoint | Description |
|----------------|-----------------|-------------|
| `/api/favorites` | `/api/favorites/favorites/` | List/create favorites |
| `/api/favorites/[recipeId]` | `/api/favorites/recipe/{recipe_id}/` | Add/remove favorite by recipe |

### Meal Plans
| Frontend Route | Django Endpoint | Description |
|----------------|-----------------|-------------|
| `/api/meal-plans` | `/api/meal-plans/` | List/create meal plans |
| `/api/meal-plans/[id]` | `/api/meal-plans/{id}/` | Get/update/delete meal plan |

### AI Integration
| Frontend Route | Django Endpoint | Description |
|----------------|-----------------|-------------|
| `/api/ai/generate-meal-plan` | `/api/ai/generate-meal-plan/` | Generate meal plan with AI |

## Setup Instructions

### 1. Environment Setup

1. Copy the environment variables to your `.env` file
2. Ensure the Django backend is running on the specified URL

### 2. Local Development

1. Start the Django backend:
   ```bash
   cd MealPrepAppBackend
   python manage.py runserver
   ```

2. Start the Next.js frontend:
   ```bash
   cd MealPrepAI
   npm run dev
   ```

### 3. Production Deployment

1. Deploy the Django backend to Vercel (already done)
2. Update `NEXT_PUBLIC_API_BASE_URL_PROD` if needed
3. Deploy the Next.js frontend

## Testing

Run the migration test script:

```bash
node test-django-migration.js
```

This will verify:
- Backend connectivity
- API endpoint availability
- Basic functionality

## Key Differences

### Authentication Flow

1. **Login Process**:
   - User submits credentials to Django backend
   - Django returns JWT access and refresh tokens
   - Tokens are stored in localStorage
   - Access token is sent with each API request

2. **Token Management**:
   - Access tokens expire after a set time
   - Refresh tokens are used to get new access tokens
   - Automatic token refresh when needed

### Data Models

Django models may have slightly different field names than the original Next.js types. The service wrappers handle the field mapping.

### Error Handling

Django returns structured error responses that are handled by the API client and converted to user-friendly messages.

## Migration Checklist

- [x] Environment variables configured
- [x] New service files created
- [x] Legacy service files updated for compatibility
- [x] Authentication flow migrated to JWT
- [x] API endpoint mapping complete
- [ ] Frontend components tested with new services
- [ ] Authentication flow tested end-to-end
- [ ] All CRUD operations tested
- [ ] AI features tested
- [ ] Production deployment verified

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the Django backend has proper CORS configuration for the frontend domain.

2. **Authentication Errors**: Check that JWT tokens are being sent correctly in the Authorization header.

3. **Environment Variables**: Verify that the correct API base URL is being used for the current environment.

4. **Field Mapping**: Some field names may differ between Django models and frontend types. Check the service wrappers for proper mapping.

### Debug Steps

1. Check the browser network tab for API requests and responses
2. Verify the Django backend logs for errors
3. Use the test script to verify backend connectivity
4. Check localStorage for JWT tokens

## Future Improvements

1. **API Response Caching**: Implement client-side caching for better performance
2. **Offline Support**: Add service worker for offline functionality
3. **Real-time Updates**: Consider WebSocket integration for real-time updates
4. **Performance Monitoring**: Add performance monitoring for API calls

## Support

For issues related to the migration, check:
1. Django backend logs in `MealPrepAppBackend/logs/`
2. Browser console for client-side errors
3. Network tab for API request/response details