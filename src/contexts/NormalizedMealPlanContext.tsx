"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { MealPlan, MealPlanFilters } from '@/types/database.types';
import {
  createMealPlan,
  getMealPlanById,
  getMealPlansForUser,
  updateMealPlan,
  deleteMealPlan,
  setActiveMealPlan,
  getActiveMealPlan,
  addRecipeToMealPlan,
  removeRecipeFromMealPlan,
  updateMealPlanItem,
  getMealPlanItems,
  getMealPlanItemsForDay,
  clearMealPlan
} from '@/lib/meal-plans-db';

interface NormalizedMealPlanContextType {
  // Current active meal plan
  activeMealPlan: MealPlan | null;
  setActiveMealPlan: (plan: MealPlan | null) => void;
  
  // User's meal plans
  userMealPlans: MealPlan[];
  setUserMealPlans: (plans: MealPlan[]) => void;
  
  // Loading states
  isLoading: boolean;
  isLoadingPlans: boolean;
  
  // Error handling
  error: string | null;
  setError: (error: string | null) => void;
  
  // Actions
  createNewMealPlan: (mealPlan: Omit<MealPlan, 'id' | 'items' | 'createdAt' | 'updatedAt'>) => Promise<MealPlan>;
  loadMealPlan: (id: string) => Promise<MealPlan | null>;
  loadUserMealPlans: (filters: MealPlanFilters) => Promise<{ mealPlans: MealPlan[]; total: number }>;
  updateCurrentMealPlan: (updates: Partial<Omit<MealPlan, 'id' | 'userId' | 'items' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteCurrentMealPlan: () => Promise<void>;
  setAsActive: (userId: string, mealPlanId: string) => Promise<void>;
  loadActiveMealPlan: (userId: string) => Promise<MealPlan | null>;
  
  // Recipe assignment actions
  assignRecipe: (mealPlanId: string, recipeId: string, dayOfWeek: number, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => Promise<void>;
  removeRecipe: (mealPlanId: string, dayOfWeek: number, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => Promise<void>;
  updateRecipeAssignment: (mealPlanId: string, dayOfWeek: number, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', newRecipeId: string) => Promise<void>;
  clearAllRecipes: (mealPlanId: string) => Promise<void>;
}

const NormalizedMealPlanContext = createContext<NormalizedMealPlanContextType | undefined>(undefined);

export function NormalizedMealPlanProvider({ children }: { children: React.ReactNode }) {
  const [activeMealPlan, setActiveMealPlanState] = useState<MealPlan | null>(null);
  const [userMealPlans, setUserMealPlans] = useState<MealPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const createNewMealPlan = useCallback(async (mealPlan: Omit<MealPlan, 'id' | 'items' | 'createdAt' | 'updatedAt'>): Promise<MealPlan> => {
    setIsLoading(true);
    setError(null);
    try {
      const newPlan = await createMealPlan(mealPlan);
      return newPlan;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create meal plan';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMealPlan = useCallback(async (id: string): Promise<MealPlan | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const plan = await getMealPlanById(id);
      if (plan) {
        setActiveMealPlanState(plan);
      }
      return plan;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load meal plan';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadUserMealPlans = useCallback(async (filters: MealPlanFilters): Promise<{ mealPlans: MealPlan[]; total: number }> => {
    setIsLoadingPlans(true);
    setError(null);
    try {
      const result = await getMealPlansForUser(filters);
      setUserMealPlans(result.mealPlans);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load meal plans';
      setError(errorMessage);
      return { mealPlans: [], total: 0 };
    } finally {
      setIsLoadingPlans(false);
    }
  }, []);

  const updateCurrentMealPlan = useCallback(async (updates: Partial<Omit<MealPlan, 'id' | 'userId' | 'items' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    if (!activeMealPlan) {
      throw new Error('No active meal plan to update');
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const updatedPlan = await updateMealPlan(activeMealPlan.id, updates);
      if (updatedPlan) {
        setActiveMealPlanState(updatedPlan);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update meal plan';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [activeMealPlan]);

  const deleteCurrentMealPlan = useCallback(async (): Promise<void> => {
    if (!activeMealPlan) {
      throw new Error('No active meal plan to delete');
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const success = await deleteMealPlan(activeMealPlan.id);
      if (success) {
        setActiveMealPlanState(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete meal plan';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [activeMealPlan]);

  const setAsActive = useCallback(async (userId: string, mealPlanId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await setActiveMealPlan(userId, mealPlanId);
      // Reload the active meal plan
      const activePlan = await getActiveMealPlan(userId);
      setActiveMealPlanState(activePlan);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set active meal plan';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadActiveMealPlan = useCallback(async (userId: string): Promise<MealPlan | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const activePlan = await getActiveMealPlan(userId);
      setActiveMealPlanState(activePlan);
      return activePlan;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load active meal plan';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const assignRecipe = useCallback(async (mealPlanId: string, recipeId: string, dayOfWeek: number, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'): Promise<void> => {
    setError(null);
    try {
      await addRecipeToMealPlan(mealPlanId, recipeId, dayOfWeek, mealType);
      // Reload the meal plan to get updated data
      if (activeMealPlan && activeMealPlan.id === mealPlanId) {
        const updatedPlan = await getMealPlanById(mealPlanId);
        if (updatedPlan) {
          setActiveMealPlanState(updatedPlan);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign recipe';
      setError(errorMessage);
      throw err;
    }
  }, [activeMealPlan]);

  const removeRecipe = useCallback(async (mealPlanId: string, dayOfWeek: number, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'): Promise<void> => {
    setError(null);
    try {
      await removeRecipeFromMealPlan(mealPlanId, dayOfWeek, mealType);
      // Reload the meal plan to get updated data
      if (activeMealPlan && activeMealPlan.id === mealPlanId) {
        const updatedPlan = await getMealPlanById(mealPlanId);
        if (updatedPlan) {
          setActiveMealPlanState(updatedPlan);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove recipe';
      setError(errorMessage);
      throw err;
    }
  }, [activeMealPlan]);

  const updateRecipeAssignment = useCallback(async (mealPlanId: string, dayOfWeek: number, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', newRecipeId: string): Promise<void> => {
    setError(null);
    try {
      await updateMealPlanItem(mealPlanId, dayOfWeek, mealType, newRecipeId);
      // Reload the meal plan to get updated data
      if (activeMealPlan && activeMealPlan.id === mealPlanId) {
        const updatedPlan = await getMealPlanById(mealPlanId);
        if (updatedPlan) {
          setActiveMealPlanState(updatedPlan);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update recipe assignment';
      setError(errorMessage);
      throw err;
    }
  }, [activeMealPlan]);

  const clearAllRecipes = useCallback(async (mealPlanId: string): Promise<void> => {
    setError(null);
    try {
      await clearMealPlan(mealPlanId);
      // Reload the meal plan to get updated data
      if (activeMealPlan && activeMealPlan.id === mealPlanId) {
        const updatedPlan = await getMealPlanById(mealPlanId);
        if (updatedPlan) {
          setActiveMealPlanState(updatedPlan);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear recipes';
      setError(errorMessage);
      throw err;
    }
  }, [activeMealPlan]);

  const value: NormalizedMealPlanContextType = {
    activeMealPlan,
    setActiveMealPlan: setActiveMealPlanState,
    userMealPlans,
    setUserMealPlans,
    isLoading,
    isLoadingPlans,
    error,
    setError,
    createNewMealPlan,
    loadMealPlan,
    loadUserMealPlans,
    updateCurrentMealPlan,
    deleteCurrentMealPlan,
    setAsActive,
    loadActiveMealPlan,
    assignRecipe,
    removeRecipe,
    updateRecipeAssignment,
    clearAllRecipes
  };

  return (
    <NormalizedMealPlanContext.Provider value={value}>
      {children}
    </NormalizedMealPlanContext.Provider>
  );
}

export function useNormalizedMealPlan() {
  const context = useContext(NormalizedMealPlanContext);
  if (context === undefined) {
    throw new Error('useNormalizedMealPlan must be used within a NormalizedMealPlanProvider');
  }
  return context;
}