/**
 * @fileOverview Favorites page - displays user's favorite meals
 */

'use client';

import { useFavorites } from '@/hooks/useFavorites';
import { FavoritesGrid, EmptyFavoritesState } from '@/components/favorites/FavoritesGrid';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FavoritesPage() {
  const router = useRouter();
  const {
    favorites,
    isLoading,
    error,
    rateMeal,
    deleteFavorite,
    bulkDelete,
    refreshData
  } = useFavorites();

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
        
        <Link href="/">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            生成膳食计划
          </Button>
        </Link>
      </div>

      {/* Content */}
      {favorites.length === 0 && !isLoading ? (
        <EmptyFavoritesState 
          onBrowseRecipes={() => router.push('/')}
        />
      ) : (
        <FavoritesGrid
          favorites={favorites}
          onRatingChange={rateMeal}
          onDelete={deleteFavorite}
          onBulkDelete={bulkDelete}
          onAddToPlan={handleAddToPlan}
          onAddToCollection={handleAddToCollection}
          onShare={handleShare}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}