/**
 * @fileOverview Favorites page - displays user's favorite meals
 */

'use client';

import { useMemo, useState } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoritesGrid, EmptyFavoritesState } from '@/components/favorites/FavoritesGrid';
import { FavoritesFilters } from '@/components/favorites/FavoritesFilters';
import { TagManager } from '@/components/favorites/TagManager';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Tag as TagIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FavoriteFilters } from '@/types/favorites.types';

export default function FavoritesPage() {
  const router = useRouter();
  const {
    favorites,
    isLoading,
    error,
    rateMeal,
    deleteFavorite,
    bulkDelete,
    bulkTag,
    refreshData,
    searchFavorites
  } = useFavorites();

  // State for selected favorites for bulk operations
  const [selectedFavorites, setSelectedFavorites] = useState<string[]>([]);

  // Local state for filters
  const [filters, setFiltersState] = useState<FavoriteFilters>({
    searchQuery: '',
    selectedTags: [],
    selectedCollections: [],
    cuisineTypes: [],
    mealTypes: [],
    ratingRange: [1, 5],
    difficultyLevels: [],
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Extract available tags and cuisines from favorites data
  const { availableTags, availableCuisines, filteredFavorites } = useMemo(() => {
    const tags = new Set<string>();
    const cuisines = new Set<string>();
    
    favorites.forEach(favorite => {
      favorite.tags.forEach(tag => tags.add(tag));
      cuisines.add(favorite.cuisine);
    });

    // Apply filters locally
    let filtered = [...favorites];

    // Apply search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(fav => 
        fav.name.toLowerCase().includes(query) ||
        fav.description.toLowerCase().includes(query) ||
        fav.ingredients.some(ing => ing.toLowerCase().includes(query)) ||
        fav.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply tag filters
    if (filters.selectedTags.length > 0) {
      filtered = filtered.filter(fav =>
        filters.selectedTags.some(tag => fav.tags.includes(tag))
      );
    }

    // Apply cuisine filter
    if (filters.cuisineTypes.length > 0) {
      filtered = filtered.filter(fav =>
        filters.cuisineTypes.includes(fav.cuisine)
      );
    }

    // Apply meal type filter
    if (filters.mealTypes.length > 0) {
      filtered = filtered.filter(fav =>
        filters.mealTypes.includes(fav.mealType)
      );
    }

    // Apply rating filter
    const [minRating, maxRating] = filters.ratingRange;
    filtered = filtered.filter(fav =>
      fav.rating >= minRating && fav.rating <= maxRating
    );

    // Apply difficulty filter
    if (filters.difficultyLevels.length > 0) {
      filtered = filtered.filter(fav =>
        filters.difficultyLevels.includes(fav.difficulty)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'usage':
          comparison = a.useCount - b.useCount;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return {
      availableTags: Array.from(tags).sort(),
      availableCuisines: Array.from(cuisines).sort(),
      filteredFavorites: filtered
    };
  }, [favorites, filters]);

  const handleFiltersChange = (newFilters: Partial<FavoriteFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFiltersState({
      searchQuery: '',
      selectedTags: [],
      selectedCollections: [],
      cuisineTypes: [],
      mealTypes: [],
      ratingRange: [1, 5],
      difficultyLevels: [],
      sortBy: 'date',
      sortOrder: 'desc'
    });
  };

  const handleAddToPlan = (favorite: any) => {
    // This would integrate with the meal plan system
    // For now, just show a toast or navigate to meal plan
    router.push('/');
  };

  const handleAddToCollection = (favoriteId: string) => {
    // This would open a collection selection dialog
  };

  const handleShare = (favoriteId: string) => {
    // This would open a sharing dialog
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">加载失败</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={refreshData}>重试</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">我的收藏</h1>
            <p className="text-gray-600 mt-1">管理您收藏的菜谱</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <TagIcon className="h-4 w-4" />
                标签管理
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>标签管理</DialogTitle>
              </DialogHeader>
              <TagManager
                favorites={favorites}
                selectedFavorites={selectedFavorites}
                onBulkTagUpdate={bulkTag}
              />
            </DialogContent>
          </Dialog>
          
          <Link href="/">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              生成膳食计划
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      {favorites.length === 0 && !isLoading ? (
        <EmptyFavoritesState 
          onBrowseRecipes={() => router.push('/')}
        />
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <FavoritesFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            availableTags={availableTags}
            availableCuisines={availableCuisines}
            totalCount={favorites.length}
            filteredCount={filteredFavorites.length}
          />

          {/* Favorites Grid */}
          <FavoritesGrid
            favorites={filteredFavorites}
            onRatingChange={rateMeal}
            onDelete={deleteFavorite}
            onBulkDelete={bulkDelete}
            onAddToPlan={handleAddToPlan}
            onAddToCollection={handleAddToCollection}
            onShare={handleShare}
            isLoading={isLoading}
            selectedItems={selectedFavorites}
            onSelectionChange={setSelectedFavorites}
          />
        </div>
      )}
    </div>
  );
}