# Recommended Next.js App Router Structure for MealPrepAI

## Current Issues
1. Mixed API and page routes causing confusion
2. No route groups for logical organization
3. Missing shared layouts for related pages
4. API routes not well organized

## Recommended Structure

```
src/app/
├── (auth)/                          # Route Group - Auth pages
│   ├── layout.tsx                   # Shared layout for auth pages
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   └── forgot-password/
│       └── page.tsx
│
├── (dashboard)/                     # Route Group - Main app pages
│   ├── layout.tsx                   # Dashboard layout with navigation
│   ├── page.tsx                     # Dashboard home (meal plans)
│   ├── profile/
│   │   ├── page.tsx
│   │   └── loading.tsx
│   ├── meal-plans/
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   └── edit/
│   │   │       └── page.tsx
│   │   └── new/
│   │       └── page.tsx
│   ├── recipes/
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   └── new/
│   │       └── page.tsx
│   └── shopping-lists/
│       ├── page.tsx
│       └── [id]/
│           └── page.tsx
│
├── api/                             # API Routes
│   ├── auth/
│   │   ├── login/
│   │   │   └── route.ts
│   │   ├── register/
│   │   │   └── route.ts
│   │   ├── logout/
│   │   │   └── route.ts
│   │   ├── me/
│   │   │   └── route.ts
│   │   ├── change-password/
│   │   │   └── route.ts
│   │   └── delete-account/
│   │       └── route.ts
│   ├── meal-plans/
│   │   ├── route.ts                 # GET /api/meal-plans, POST /api/meal-plans
│   │   └── [id]/
│   │       ├── route.ts             # GET, PUT, DELETE /api/meal-plans/[id]
│   │       └── items/
│   │           └── route.ts         # Meal plan items
│   ├── recipes/
│   │   ├── route.ts                 # GET /api/recipes, POST /api/recipes
│   │   ├── [id]/
│   │   │   └── route.ts             # GET, PUT, DELETE /api/recipes/[id]
│   │   ├── generate/
│   │   │   └── route.ts             # AI recipe generation
│   │   └── suggest/
│   │       └── route.ts             # AI recipe suggestions
│   ├── ai/
│   │   ├── generate-meal-plan/
│   │   │   └── route.ts
│   │   ├── analyze-meal-plan/
│   │   │   └── route.ts
│   │   └── shopping-list/
│   │       └── route.ts
│   └── user/
│       ├── profile/
│       │   └── route.ts
│       └── preferences/
│           └── route.ts
│
├── globals.css
├── layout.tsx                       # Root layout
├── loading.tsx                      # Global loading
├── not-found.tsx                    # 404 page
├── error.tsx                        # Error boundary
└── page.tsx                         # Landing page
```

## Key Improvements

### 1. Route Groups
- `(auth)`: Groups authentication-related pages
- `(dashboard)`: Groups main application pages
- URLs remain clean: `/login`, `/register`, `/profile`, etc.

### 2. Shared Layouts
- Auth pages share a centered, minimal layout
- Dashboard pages share navigation and sidebar
- Each route group can have its own layout

### 3. Organized API Routes
- Clear separation by feature area
- RESTful naming conventions
- Logical nesting for related endpoints

### 4. Dynamic Routes
- `[id]` for individual resources
- Nested routes for related actions

### 5. Special Files
- `loading.tsx` for loading states
- `error.tsx` for error boundaries
- `not-found.tsx` for 404 handling

## Benefits

1. **Clear Separation**: Pages vs API routes
2. **Logical Grouping**: Related functionality together
3. **Shared Layouts**: Consistent UI across sections
4. **Scalable**: Easy to add new features
5. **SEO Friendly**: Clean URLs
6. **Developer Experience**: Easy to navigate codebase