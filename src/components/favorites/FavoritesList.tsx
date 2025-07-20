'use client';

import { useState } from 'react';
import { Heart, Clock, ChefHat, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useFavorites } from '@/contexts/FavoritesContext';
import type { Favorite } from '@/types/database.types';
import { FavoriteButton } from './FavoriteButton';

interface FavoritesListProps {
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  limit?: number;
}

export function FavoritesList({ mealType, limit }: FavoritesListProps) {
  const { favorites, getFavoritesByMeal, isLoading, error } = useFavorites();

  const displayFavorites = mealType
    ? getFavoritesByMeal(mealType)
    : favorites;

  const limitedFavorites = limit
    ? displayFavorites.slice(0, limit)
    : displayFavorites;

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (limitedFavorites.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No favorites yet
        </h3>
        <p className="text-gray-600">
          {mealType
            ? `You haven't favorited any ${mealType} recipes yet.`
            : "You haven't favorited any recipes yet. Start exploring recipes and add them to your favorites!"
          }
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {limitedFavorites.map((favorite) => (
        <FavoriteCard key={favorite.recipeId} favorite={favorite} />
      ))}
    </div>
  );
}

interface FavoriteCardProps {
  favorite: Favorite;
}

function FavoriteCard({ favorite }: FavoriteCardProps) {
  const { recipe, personalRating, personalNotes, addedAt } = favorite;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">{recipe.name}</CardTitle>
          <FavoriteButton recipeId={recipe.id} size="sm" />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Badge variant="outline" className="capitalize">
            {recipe.difficulty}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {recipe.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {recipe.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock size={16} />
            <span>{recipe.totalTime}min</span>
          </div>
          <div className="flex items-center gap-1">
            <ChefHat size={16} />
            <span>{(Number(recipe.avgRating) || 0).toFixed(1)}</span>
          </div>
          {personalRating && (
            <div className="flex items-center gap-1">
              <Star size={16} className="fill-yellow-400 text-yellow-400" />
              <span>{personalRating}/5</span>
            </div>
          )}
        </div>

        {personalNotes && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-auto p-0 text-sm text-blue-600 hover:text-blue-800"
            >
              {isExpanded ? 'Hide' : 'Show'} my notes
            </Button>
            {isExpanded && (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-700">{personalNotes}</p>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500">
          Added {new Date(addedAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}