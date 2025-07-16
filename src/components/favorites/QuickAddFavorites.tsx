/**
 * @fileOverview Quick-add component for frequently used favorites
 * Shows shortcuts for adding popular favorites to meal plans
 */

'use client';

import { useState, useMemo } from 'react';
import { Plus, Star, Clock, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFavorites } from '@/hooks/useFavorites';
import { AddToPlanDialog } from './AddToPlanDialog';
import type { FavoriteMeal } from '@/types/favorites.types';

interface QuickAddFavoritesProps {
  maxItems?: number;
  showTitle?: boolean;
  className?: string;
}

export function QuickAddFavorites({ 
  maxItems = 6, 
  showTitle = true, 
  className 
}: QuickAddFavoritesProps) {
  const { favorites, isLoading } = useFavorites();
  const [addToPlanDialogOpen, setAddToPlanDialogOpen] = useState(false);
  const [selectedMealForPlan, setSelectedMealForPlan] = useState<FavoriteMeal | null>(null);

  // Get frequently used favorites sorted by usage count and rating
  const frequentlyUsedFavorites = useMemo(() => {
    return favorites
      .filter(fav => fav.useCount > 0) // Only show favorites that have been used
      .sort((a, b) => {
        // Sort by usage count first, then by rating
        const usageDiff = b.useCount - a.useCount;
        if (usageDiff !== 0) return usageDiff;
        return b.rating - a.rating;
      })
      .slice(0, maxItems);
  }, [favorites, maxItems]);

  // If no frequently used favorites, show highest rated ones
  const topFavorites = useMemo(() => {
    if (frequentlyUsedFavorites.length >= 3) {
      return frequentlyUsedFavorites;
    }
    
    // Fill with highest rated favorites
    const additionalFavorites = favorites
      .filter(fav => !frequentlyUsedFavorites.some(freq => freq.id === fav.id))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, maxItems - frequentlyUsedFavorites.length);
    
    return [...frequentlyUsedFavorites, ...additionalFavorites];
  }, [favorites, frequentlyUsedFavorites, maxItems]);

  const handleQuickAdd = (favorite: FavoriteMeal) => {
    setSelectedMealForPlan(favorite);
    setAddToPlanDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              常用收藏
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="w-20 h-8 bg-gray-200 rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (topFavorites.length === 0) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              常用收藏
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <ChefHat className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">还没有收藏的菜谱</p>
            <p className="text-xs mt-1">开始收藏您喜欢的菜谱吧！</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              常用收藏
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {topFavorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {/* Meal Image/Icon */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center flex-shrink-0">
                    {favorite.imageUrl ? (
                      <img
                        src={favorite.imageUrl}
                        alt={favorite.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ChefHat className="h-6 w-6 text-teal-600" />
                    )}
                  </div>

                  {/* Meal Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 truncate">
                      {favorite.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {favorite.cookingTime}分钟
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < favorite.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      {favorite.useCount > 0 && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          {favorite.useCount}次
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Quick Add Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickAdd(favorite)}
                    className="flex-shrink-0 h-8 px-3 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    添加
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add to Plan Dialog */}
      {selectedMealForPlan && (
        <AddToPlanDialog
          isOpen={addToPlanDialogOpen}
          onClose={() => {
            setAddToPlanDialogOpen(false);
            setSelectedMealForPlan(null);
          }}
          favoriteMeal={selectedMealForPlan}
        />
      )}
    </>
  );
}

// Compact version for sidebars or smaller spaces
export function CompactQuickAddFavorites({ 
  maxItems = 3, 
  className 
}: Omit<QuickAddFavoritesProps, 'showTitle'>) {
  const { favorites, isLoading } = useFavorites();
  const [addToPlanDialogOpen, setAddToPlanDialogOpen] = useState(false);
  const [selectedMealForPlan, setSelectedMealForPlan] = useState<FavoriteMeal | null>(null);

  const topFavorites = useMemo(() => {
    return favorites
      .sort((a, b) => {
        const usageDiff = b.useCount - a.useCount;
        if (usageDiff !== 0) return usageDiff;
        return b.rating - a.rating;
      })
      .slice(0, maxItems);
  }, [favorites, maxItems]);

  const handleQuickAdd = (favorite: FavoriteMeal) => {
    setSelectedMealForPlan(favorite);
    setAddToPlanDialogOpen(true);
  };

  if (isLoading || topFavorites.length === 0) {
    return null;
  }

  return (
    <>
      <div className={`space-y-2 ${className}`}>
        <h4 className="text-sm font-medium text-gray-700 mb-3">快速添加</h4>
        {topFavorites.map((favorite) => (
          <Button
            key={favorite.id}
            variant="outline"
            size="sm"
            onClick={() => handleQuickAdd(favorite)}
            className="w-full justify-start text-left h-auto p-2"
          >
            <div className="flex items-center gap-2 w-full">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center flex-shrink-0">
                {favorite.imageUrl ? (
                  <img
                    src={favorite.imageUrl}
                    alt={favorite.name}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <ChefHat className="h-3 w-3 text-teal-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{favorite.name}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-2 w-2" />
                  {favorite.cookingTime}分钟
                </div>
              </div>
              <Plus className="h-3 w-3 flex-shrink-0" />
            </div>
          </Button>
        ))}
      </div>

      {/* Add to Plan Dialog */}
      {selectedMealForPlan && (
        <AddToPlanDialog
          isOpen={addToPlanDialogOpen}
          onClose={() => {
            setAddToPlanDialogOpen(false);
            setSelectedMealForPlan(null);
          }}
          favoriteMeal={selectedMealForPlan}
        />
      )}
    </>
  );
}