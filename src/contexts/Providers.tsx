'use client';

import { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { UserProvider } from './UserContext';
import { NormalizedMealPlanProvider } from './NormalizedMealPlanContext';
import { UserProfileProvider } from './UserProfileContext';
import { PlanListProvider } from './PlanListContext';
import { FavoritesProvider } from './FavoritesContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <UserProvider>
        <UserProfileProvider>
          <FavoritesProvider>
            <PlanListProvider>
              <NormalizedMealPlanProvider>
                {children}
              </NormalizedMealPlanProvider>
            </PlanListProvider>
          </FavoritesProvider>
        </UserProfileProvider>
      </UserProvider>
    </AuthProvider>
  );
}