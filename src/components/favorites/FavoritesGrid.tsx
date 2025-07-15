/**
 * @fileOverview Main favorites grid component with different view modes
 * Handles layout, selection, and bulk operations
 */

'use client';

import { useState, useMemo } from 'react';
import { Grid, List, LayoutGrid, CheckSquare, Square, Trash2, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FavoriteCard } from './FavoriteCard';
import { cn } from '@/lib/utils';
import type { FavoriteMeal } from '@/types/favorites.types';

interface FavoritesGridProps {
  favorites: FavoriteMeal[];
  onRatingChange: (favoriteId: string, rating: number) => void;
  onDelete: (favoriteId: string) => void;
  onBulkDelete: (favoriteIds: string[]) => void;
  onAddToPlan?: (favorite: FavoriteMeal) => void;
  onAddToCollection?: (favoriteId: string) => void;
  onBulkAddToCollection?: (favoriteIds: string[], collectionId: string) => void;
  onShare?: (favoriteId: string) => void;
  selectedItems?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  isLoading?: boolean;
  className?: string;
}

type ViewMode = 'grid' | 'list' | 'compact';

export function FavoritesGrid({
  favorites,
  onRatingChange,
  onDelete,
  onBulkDelete,
  onAddToPlan,
  onAddToCollection,
  onBulkAddToCollection,
  onShare,
  selectedItems: externalSelectedItems,
  onSelectionChange: externalOnSelectionChange,
  isLoading = false,
  className
}: FavoritesGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [internalSelectedItems, setInternalSelectedItems] = useState<Set<string>>(new Set());
  
  // Use external selection if provided, otherwise use internal
  const selectedItemsSet = externalSelectedItems 
    ? new Set(externalSelectedItems) 
    : internalSelectedItems;
  const showBulkActions = selectedItemsSet.size > 0;

  const handleSelectionChange = (favoriteId: string, selected: boolean) => {
    if (externalOnSelectionChange) {
      // Use external selection management
      const currentSelection = externalSelectedItems || [];
      const newSelection = selected
        ? [...currentSelection, favoriteId]
        : currentSelection.filter(id => id !== favoriteId);
      externalOnSelectionChange(newSelection);
    } else {
      // Use internal selection management
      const newSelection = new Set(internalSelectedItems);
      if (selected) {
        newSelection.add(favoriteId);
      } else {
        newSelection.delete(favoriteId);
      }
      setInternalSelectedItems(newSelection);
    }
  };

  const handleSelectAll = () => {
    if (externalOnSelectionChange) {
      // Use external selection management
      const currentSelection = externalSelectedItems || [];
      if (currentSelection.length === favorites.length) {
        externalOnSelectionChange([]);
      } else {
        externalOnSelectionChange(favorites.map(f => f.id));
      }
    } else {
      // Use internal selection management
      if (internalSelectedItems.size === favorites.length) {
        setInternalSelectedItems(new Set());
      } else {
        setInternalSelectedItems(new Set(favorites.map(f => f.id)));
      }
    }
  };

  const handleBulkDelete = () => {
    const selectedIds = Array.from(selectedItemsSet);
    if (selectedIds.length > 0) {
      onBulkDelete(selectedIds);
      
      // Clear selection
      if (externalOnSelectionChange) {
        externalOnSelectionChange([]);
      } else {
        setInternalSelectedItems(new Set());
      }
    }
  };

  const handleBulkAddToCollection = (collectionId: string) => {
    const selectedIds = Array.from(selectedItemsSet);
    if (selectedIds.length > 0 && onBulkAddToCollection) {
      onBulkAddToCollection(selectedIds, collectionId);
      
      // Clear selection
      if (externalOnSelectionChange) {
        externalOnSelectionChange([]);
      } else {
        setInternalSelectedItems(new Set());
      }
    }
  };

  const gridClasses = useMemo(() => {
    switch (viewMode) {
      case 'grid':
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
      case 'list':
        return 'space-y-4';
      case 'compact':
        return 'space-y-2';
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
    }
  }, [viewMode]);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className={gridClasses}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200" />
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Grid className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          还没有收藏的菜谱
        </h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          开始收藏您喜欢的菜谱，这样就可以轻松找到并重复使用它们了。
        </p>
        <Button variant="outline">
          浏览菜谱
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with view controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">
            我的收藏
          </h2>
          <Badge variant="secondary">
            {favorites.length} 个菜谱
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Selection controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="gap-2"
          >
            {selectedItemsSet.size === favorites.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selectedItemsSet.size > 0 ? `已选择 ${selectedItemsSet.size}` : '全选'}
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* View mode controls */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 p-0"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('compact')}
              className="h-8 w-8 p-0"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk actions bar */}
      {showBulkActions && (
        <Card className="p-4 bg-teal-50 border-teal-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-teal-600" />
              <span className="font-medium text-teal-900">
                已选择 {selectedItemsSet.size} 个菜谱
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {onBulkAddToCollection && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // This would open a collection selection dialog
                  }}
                  className="gap-2"
                >
                  <FolderPlus className="h-4 w-4" />
                  添加到收藏夹
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                删除选中
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (externalOnSelectionChange) {
                    externalOnSelectionChange([]);
                  } else {
                    setInternalSelectedItems(new Set());
                  }
                }}
              >
                取消
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Favorites grid */}
      <div className={gridClasses}>
        {favorites.map((favorite) => (
          <FavoriteCard
            key={favorite.id}
            favorite={favorite}
            onRatingChange={onRatingChange}
            onDelete={onDelete}
            onAddToPlan={onAddToPlan}
            onAddToCollection={onAddToCollection}
            onShare={onShare}
            isSelected={selectedItemsSet.has(favorite.id)}
            onSelectionChange={handleSelectionChange}
            viewMode={viewMode}
          />
        ))}
      </div>

      {/* Load more button for pagination */}
      {favorites.length > 0 && favorites.length % 12 === 0 && (
        <div className="text-center pt-8">
          <Button variant="outline" size="lg">
            加载更多
          </Button>
        </div>
      )}
    </div>
  );
}

// Empty state component
export function EmptyFavoritesState({ 
  onBrowseRecipes 
}: { 
  onBrowseRecipes?: () => void 
}) {
  return (
    <div className="text-center py-16">
      <div className="mx-auto w-32 h-32 bg-gradient-to-br from-teal-100 to-teal-200 rounded-full flex items-center justify-center mb-6">
        <Grid className="h-16 w-16 text-teal-600" />
      </div>
      <h3 className="text-2xl font-semibold text-gray-900 mb-3">
        开始收藏您喜欢的菜谱
      </h3>
      <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
        收藏您最喜欢的菜谱，这样就可以轻松找到并在未来的膳食计划中重复使用它们。
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={onBrowseRecipes} size="lg">
          浏览菜谱
        </Button>
        <Button variant="outline" size="lg">
          生成膳食计划
        </Button>
      </div>
    </div>
  );
}