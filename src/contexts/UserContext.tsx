'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { User, DietaryPreferences } from '@/types/database.types';

interface UserContextType {
  userPreferences: DietaryPreferences;
  updatePreferences: (preferences: Partial<DietaryPreferences>) => Promise<void>;
  isUpdatingPreferences: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, updateProfile } = useAuth();
  const [userPreferences, setUserPreferences] = useState<DietaryPreferences>({});
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);

  // Update preferences when user changes
  useEffect(() => {
    if (user?.dietaryPreferences) {
      setUserPreferences(user.dietaryPreferences);
    } else {
      setUserPreferences({});
    }
  }, [user]);

  const updatePreferences = async (preferences: Partial<DietaryPreferences>) => {
    if (!user) return;

    setIsUpdatingPreferences(true);
    try {
      const updatedPreferences = { ...userPreferences, ...preferences };
      
      const result = await updateProfile({
        dietaryPreferences: updatedPreferences
      });

      if (result.success) {
        setUserPreferences(updatedPreferences);
      } else {
        throw new Error(result.error || 'Failed to update preferences');
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  const value: UserContextType = {
    userPreferences,
    updatePreferences,
    isUpdatingPreferences,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Hook for getting user dietary preferences with defaults
export function useDietaryPreferences() {
  const { userPreferences } = useUser();
  
  return {
    allergies: userPreferences.allergies || [],
    dietType: userPreferences.dietType,
    dislikes: userPreferences.dislikes || [],
    calorieTarget: userPreferences.calorieTarget,
    hasAllergies: (userPreferences.allergies?.length || 0) > 0,
    hasDislikes: (userPreferences.dislikes?.length || 0) > 0,
    hasCalorieTarget: !!userPreferences.calorieTarget,
    hasDietType: !!userPreferences.dietType,
  };
}