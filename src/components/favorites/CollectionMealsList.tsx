/**
 * @fileOverview Component for displaying and managing meals within a collection
 */

'use client';

import { useState } from 'react';
import { Plus, X, Search, Grid3X3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import type { FavoriteCollection, FavoriteMeal } from '@/types/favorites.types';
import { FavoriteCard } from './FavoriteCard';

interface CollectionMealsListProps {
  collection: FavoriteCollection;
  meals: FavoriteMeal[];
  onRemoveFromCollection: (favoriteId: string, collectionId: string) => Promise<void>;
  onAddToCollection: (favoriteId: string, collectionId: string) => Promise<void>;
  availableMeals: FavoriteMeal[];
}

export function CollectionMealsList({
  collection,
  meals,
  onRemoveFromCollection,
  onAddToCollection,
  availableMeals
}: CollectionMealsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter meals in collection
  const filteredMeals = meals.filter(meal =>
    meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    meal.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
    meal.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get meals that can be added to this collection
  const availableToAdd = availableMeals.filter(meal => 
    !meal.collections.includes(collection.id)
  );

  const handleRemoveMeal = async (mealId: string) => {
    try {
      await onRemoveFromCollection(mealId, collection.id);
    } catch (error) {
      console.error('Failed to remove meal from collection:', error);
    }
  };

  const handleAddSelectedMeals = async () => {
    try {
      await Promise.all(
        selectedMeals.map(mealId => onAddToCollection(mealId, collection.id))
      );
      setSelectedMeals([]);
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to add meals to collection:', error);
    }
  };

  const toggleMealSelection = (mealId: string) => {
    setSelectedMeals(prev => 
      prev.includes(mealId) 
        ? prev.filter(id => id !== mealId)
        : [...prev, mealId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Collection Header */}
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg">
        <div 
          className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl"
          style={{ backgroundColor: collection.color }}
        >
          {collection.icon.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{collection.name}</h2>
          {collection.description && (
            <p className="text-gray-600 mt-1">{collection.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>{meals.length} 个菜谱</span>
            <span>创建于 {new Date(collection.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
          {collection.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {collection.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="搜索收藏夹中的菜谱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
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

          {/* Add Meals Button */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                添加菜谱
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>添加菜谱到 "{collection.name}"</DialogTitle>
              </DialogHeader>
              
              <div className="flex-1 overflow-auto">
                {availableToAdd.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    所有收藏的菜谱都已在此收藏夹中
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableToAdd.map((meal) => (
                      <div 
                        key={meal.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <Checkbox
                          checked={selectedMeals.includes(meal.id)}
                          onCheckedChange={() => toggleMealSelection(meal.id)}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{meal.name}</h4>
                          <p className="text-sm text-gray-600">{meal.cuisine} • {meal.mealType}</p>
                          {meal.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {meal.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        {meal.imageUrl && (
                          <img 
                            src={meal.imageUrl} 
                            alt={meal.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {availableToAdd.length > 0 && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    取消
                  </Button>
                  <Button 
                    onClick={handleAddSelectedMeals}
                    disabled={selectedMeals.length === 0}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    添加 {selectedMeals.length > 0 && `(${selectedMeals.length})`}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Meals Display */}
      {filteredMeals.length === 0 ? (
        <div className="text-center py-12">
          {searchQuery ? (
            <div>
              <p className="text-gray-500 mb-4">未找到匹配的菜谱</p>
              <Button 
                variant="outline" 
                onClick={() => setSearchQuery('')}
              >
                清除搜索
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-gray-500 mb-4">此收藏夹还没有菜谱</p>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加第一个菜谱
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {filteredMeals.map((meal) => (
            <div key={meal.id} className="relative group">
              <FavoriteCard 
                favorite={meal}
                viewMode={viewMode}
                onRatingChange={async (favoriteId: string, rating: number) => {
                  // This would be handled by the parent component
                  console.log('Rating change:', favoriteId, rating);
                }}
                onDelete={handleRemoveMeal}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}