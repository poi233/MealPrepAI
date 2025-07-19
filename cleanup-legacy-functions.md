# Legacy Function Cleanup Guide

## Overview
This document outlines the legacy functions that can be removed now that the normalized meal plan system is implemented and integrated into the UI.

## Legacy Files to Consider for Removal/Deprecation

### 1. Legacy Database Functions (src/lib/db.ts)
The following functions in `src/lib/db.ts` are now superseded by the normalized system:

**Legacy Functions:**
- `saveMealPlanToDb()` - Replace with `createMealPlan()` from meal-plans-db.ts
- `getMealPlanByNameFromDb()` - Replace with `getMealPlanById()` and `getMealPlansForUser()`
- `deleteMealPlanFromDbByName()` - Replace with `deleteMealPlan()`
- `getAllMealPlanNamesFromDb()` - Replace with `getMealPlansForUser()`
- `getActiveMealPlanFromDb()` - Replace with `getActiveMealPlan()`
- `setActivePlanInDb()` - Replace with `setActiveMealPlan()`

**Legacy Table:**
- The old `meal_plans` table with JSONB storage can be dropped once migration is complete

### 2. Legacy Context (src/contexts/MealPlanContext.tsx)
- `MealPlanContext` - Replace with `NormalizedMealPlanContext`
- `MealPlanProvider` - Replace with `NormalizedMealPlanProvider`
- `useMealPlan()` - Replace with `useNormalizedMealPlan()`

### 3. Legacy Components
- `src/components/meal-plan/GeneratedMealPlan.tsx` - Can be deprecated in favor of `NormalizedMealPlan.tsx`
- Related legacy meal plan components that depend on JSONB structure

### 4. Legacy Actions (src/app/actions.ts)
The following server actions can be deprecated:
- Functions that work with the old JSONB meal plan structure
- Actions that use the legacy database functions

## Migration Steps

### Phase 1: Parallel Operation (Current)
- ✅ New normalized system is implemented and working
- ✅ Legacy system still available for backward compatibility
- ✅ UI provides both options via tabs

### Phase 2: Data Migration (Future)
1. Create migration script to convert existing JSONB meal plans to normalized structure
2. Migrate user data from old format to new format
3. Update all references to use new system

### Phase 3: Legacy Removal (Future)
1. Remove legacy database functions
2. Remove legacy contexts and components
3. Drop old database tables
4. Update UI to use only normalized system

## Benefits of New System

### Database Benefits
- ✅ Normalized data structure eliminates redundancy
- ✅ Individual recipe assignments can be modified without affecting entire plan
- ✅ Efficient JOINs for displaying complete meal plans with recipe details
- ✅ Better query performance with proper indexes
- ✅ Foreign key constraints ensure data integrity

### UI Benefits
- ✅ Real-time recipe selection with search and filtering
- ✅ Individual meal slot management
- ✅ Better user experience with dedicated recipe assignment dialogs
- ✅ Improved meal plan organization and visualization

### Development Benefits
- ✅ Type-safe database operations
- ✅ Modular and maintainable code structure
- ✅ Easier to extend with new features
- ✅ Better error handling and validation

## Current Status
- ✅ Task 4.2 "Build meal plan assignment and modification system" - **COMPLETED**
- ✅ New normalized meal plan system fully functional
- ✅ UI integration complete with recipe selection
- ✅ Sample recipes created for testing
- ✅ Both legacy and new systems available for comparison

## Next Steps
1. User testing of the new normalized system
2. Performance comparison between old and new systems
3. Plan data migration strategy
4. Gradual deprecation of legacy functions