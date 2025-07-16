/**
 * @fileOverview Collection Manager component for organizing favorite meals
 * Provides interface for creating, managing, and organizing collections
 */

'use client';

import { useState, useCallback } from 'react';
import { Plus, Grid3X3, List, Search, MoreHorizontal, Edit, Trash2, Share2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFavorites } from '@/hooks/useFavorites';
import type { FavoriteCollection, FavoriteMeal } from '@/types/favorites.types';
import { CollectionForm } from './CollectionForm';
import { CollectionGrid } from './CollectionGrid';
import { CollectionMealsList } from './CollectionMealsList';

interface CollectionManagerProps {
  userId?: string;
  onCollectionSelect?: (collection: FavoriteCollection) => void;
  selectedCollectionId?: string;
}

type ViewMode = 'grid' | 'list';

export function CollectionManager({ 
  userId = '550e8400-e29b-41d4-a716-446655440000',
  onCollectionSelect,
  selectedCollectionId 
}: CollectionManagerProps) {
  const { 
    collections, 
    favorites, 
    isLoading, 
    error,
    createCollection,
    deleteCollection,
    addToCollection,
    removeFromCollection,
    refreshData
  } = useFavorites(userId);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<FavoriteCollection | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [collectionMeals, setCollectionMeals] = useState<FavoriteMeal[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter collections based on search query
  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get meals for a specific collection
  const getCollectionMeals = useCallback((collectionId: string): FavoriteMeal[] => {
    return favorites.filter(favorite => favorite.collections.includes(collectionId));
  }, [favorites]);

  // Handle collection creation
  const handleCreateCollection = async (data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    tags?: string[];
  }) => {
    try {
      await createCollection(
        data.name,
        data.description,
        data.color,
        data.icon,
        data.tags
      );
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  // Handle collection selection - navigate directly to details
  const handleCollectionClick = (collection: FavoriteCollection) => {
    // Don't navigate if we're in the middle of a delete operation
    if (isDeleting) return;
    
    setSelectedCollection(collection);
    setShowDetails(true);
    onCollectionSelect?.(collection);
  };

  // Handle edit collection
  const handleEditCollection = (collection: FavoriteCollection) => {
    setSelectedCollection(collection);
    setIsEditDialogOpen(true);
  };

  // Handle delete collection
  const handleDeleteCollection = async (collectionId: string) => {
    setIsDeleting(true);
    try {
      await deleteCollection(collectionId);
      // Always ensure we're back on the collections list after deletion
      setSelectedCollection(null);
      setShowDetails(false);
    } catch (error) {
      console.error('Failed to delete collection:', error);
    } finally {
      // Use a small delay to ensure state is properly reset before allowing navigation
      setTimeout(() => {
        setIsDeleting(false);
      }, 100);
    }
  };

  // Handle back to collections list
  const handleBackToList = () => {
    setShowDetails(false);
    setSelectedCollection(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        <p>加载收藏夹时出错: {error}</p>
        <Button onClick={refreshData} variant="outline" className="mt-2">
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">收藏夹管理</h2>
          <p className="text-gray-600 mt-1">
            组织和管理您的收藏菜谱 ({collections.length} 个收藏夹)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 p-0"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Create Collection Button */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                新建收藏夹
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>创建新收藏夹</DialogTitle>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto">
                <CollectionForm
                  onSubmit={handleCreateCollection}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="搜索收藏夹..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Collections Display */}
      {!showDetails ? (
        // Collections List View
        filteredCollections.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery ? (
              <div>
                <p className="text-gray-500 mb-4">未找到匹配的收藏夹</p>
                <Button 
                  variant="outline" 
                  onClick={() => setSearchQuery('')}
                >
                  清除搜索
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-gray-500 mb-4">还没有创建任何收藏夹</p>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  创建第一个收藏夹
                </Button>
              </div>
            )}
          </div>
        ) : (
          <CollectionGrid
            collections={filteredCollections}
            viewMode={viewMode}
            onCollectionClick={handleCollectionClick}
            onEditCollection={handleEditCollection}
            onDeleteCollection={handleDeleteCollection}
            getCollectionMeals={getCollectionMeals}
            selectedCollectionId={selectedCollectionId}
          />
        )
      ) : (
        // Collection Details View
        <div className="space-y-4">
          {/* Back Button */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回收藏夹列表
            </Button>
          </div>
          
          {selectedCollection && (
            <CollectionMealsList
              collection={selectedCollection}
              meals={getCollectionMeals(selectedCollection.id)}
              onRemoveFromCollection={removeFromCollection}
              onAddToCollection={addToCollection}
              availableMeals={favorites}
            />
          )}
        </div>
      )}

      {/* Edit Collection Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑收藏夹</DialogTitle>
          </DialogHeader>
          {selectedCollection && (
            <CollectionForm
              initialData={selectedCollection}
              onSubmit={handleCreateCollection} // TODO: Implement update functionality
              onCancel={() => setIsEditDialogOpen(false)}
              isEditing
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}