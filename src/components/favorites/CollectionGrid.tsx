/**
 * @fileOverview Grid component for displaying collections
 */

'use client';

import { MoreHorizontal, Edit, Trash2, Share2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { FavoriteCollection, FavoriteMeal } from '@/types/favorites.types';

interface CollectionGridProps {
  collections: FavoriteCollection[];
  viewMode: 'grid' | 'list';
  onCollectionClick: (collection: FavoriteCollection) => void;
  onEditCollection: (collection: FavoriteCollection) => void;
  onDeleteCollection: (collectionId: string) => void;
  getCollectionMeals: (collectionId: string) => FavoriteMeal[];
  selectedCollectionId?: string;
}

export function CollectionGrid({
  collections,
  viewMode,
  onCollectionClick,
  onEditCollection,
  onDeleteCollection,
  getCollectionMeals,
  selectedCollectionId
}: CollectionGridProps) {
  const handleCardClick = (collection: FavoriteCollection, e: React.MouseEvent) => {
    // Don't trigger if clicking on dropdown menu
    if ((e.target as HTMLElement).closest('[data-dropdown-trigger]')) {
      return;
    }
    onCollectionClick(collection);
  };

  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        {collections.map((collection) => {
          const meals = getCollectionMeals(collection.id);
          const isSelected = selectedCollectionId === collection.id;
          
          return (
            <Card 
              key={collection.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-teal-500 bg-teal-50' : ''
              }`}
              onClick={(e) => handleCardClick(collection, e)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Collection Icon */}
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-medium text-lg"
                      style={{ backgroundColor: collection.color }}
                    >
                      {collection.icon.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* Collection Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{collection.name}</h3>
                        {!collection.isPublic && (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      
                      {collection.description && (
                        <p className="text-gray-600 text-sm mb-2">{collection.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
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
                  
                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild data-dropdown-trigger>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditCollection(collection)}>
                        <Edit className="h-4 w-4 mr-2" />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share2 className="h-4 w-4 mr-2" />
                        分享
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        {collection.isPublic ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            设为私有
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            设为公开
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => onDeleteCollection(collection.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Grid view
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {collections.map((collection) => {
        const meals = getCollectionMeals(collection.id);
        const isSelected = selectedCollectionId === collection.id;
        
        return (
          <Card 
            key={collection.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              isSelected ? 'ring-2 ring-teal-500 bg-teal-50' : ''
            }`}
            onClick={(e) => handleCardClick(collection, e)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: collection.color }}
                  >
                    {collection.icon.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{collection.name}</h3>
                      {!collection.isPublic && (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{meals.length} 个菜谱</p>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild data-dropdown-trigger>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditCollection(collection)}>
                      <Edit className="h-4 w-4 mr-2" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share2 className="h-4 w-4 mr-2" />
                      分享
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      {collection.isPublic ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          设为私有
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          设为公开
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => onDeleteCollection(collection.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {collection.description && (
                <p className="text-gray-600 text-sm mb-3">{collection.description}</p>
              )}
              
              {/* Preview Images */}
              {meals.length > 0 && (
                <div className="mb-3">
                  <div className="flex -space-x-2 mb-2">
                    {meals.slice(0, 4).map((meal, index) => (
                      <div
                        key={meal.id}
                        className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium"
                        style={{ zIndex: 4 - index }}
                      >
                        {meal.imageUrl ? (
                          <img 
                            src={meal.imageUrl} 
                            alt={meal.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          meal.name.charAt(0)
                        )}
                      </div>
                    ))}
                    {meals.length > 4 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-xs font-medium">
                        +{meals.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Tags */}
              {collection.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {collection.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {collection.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{collection.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Metadata */}
              <div className="text-xs text-gray-500">
                创建于 {new Date(collection.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}