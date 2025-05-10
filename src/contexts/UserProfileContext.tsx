"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { normalizePreferences } from '@/lib/utils';

interface UserProfileContextType {
  dietaryPreferences: string;
  setDietaryPreferences: (preferences: string) => void;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'mealPrepAI_userPreferences';

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [dietaryPreferences, setDietaryPreferencesState] = useState<string>('');

  useEffect(() => {
    const storedPreferences = localStorage.getItem(LOCAL_STORAGE_KEY);
    setDietaryPreferencesState(normalizePreferences(storedPreferences));
  }, []);

  const setDietaryPreferences = (preferences: string) => {
    const normalized = normalizePreferences(preferences);
    setDietaryPreferencesState(normalized);
    localStorage.setItem(LOCAL_STORAGE_KEY, normalized);
  };

  return (
    <UserProfileContext.Provider value={{ dietaryPreferences, setDietaryPreferences }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}
