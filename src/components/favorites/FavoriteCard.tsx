/**
 * @fileOverview Individual favorite meal card component
 * Displays meal details, rating, tags, and action buttons
 */

'use client';

import { useState } from 'react';
import { Clock, ChefHat, Users, MoreVertical, Plus, Trash2, Edit, Share } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { FavoriteButton } from './FavoriteButton';
import { InteractiveRating, CompactRating } from './RatingSystem';
import { cn } from '@/lib/utils';
import type { FavoriteMeal } from '@/types/favorites.types';
import type { Meal } from '@/ai/schemas/meal';

interface FavoriteCardProps {
  favorite: FavoriteMeal;
  onRatingChange: (favoriteId: string, rating: number) => void;
  onDelete: (favoriteId: string) => void;
  onAddToPlan?: (favorite: FavoriteMeal) => void;
  onAddToCollection?: (favoriteId: string) => void;
  onShare?: (favoriteId: string) => void;
  isSelected?: boolean;
  onSelectionChange?: (favoriteId: string, selected: boolean) => void;
  viewMode?: 'grid' | 'list' | 'compact';
  className?: string;
}

export function FavoriteCard({
  favorite,
  onRatingChange,
  onDelete,
  onAddToPlan,
  onAddToCollection,
  onShare,
  isSelected = false,
  onSelectionChange,
  viewMode = 'grid',
  className
}: FavoriteCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullIngredients, setShowFullIngredients] = useState(false);

  const handleSelectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectionChange?.(favorite.id, e.target.checked);
  };

  const handleAddToPlan = () => {
    onAddToPlan?.(favorite);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return difficulty;
    }
  };

  const getMealTypeText = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return '早餐';
      case 'lunch': return '午餐';
      case 'dinner': return '晚餐';
      case 'snack': return '小食';
      default: return mealType;
    }
  };

  // Convert FavoriteMeal to Meal for FavoriteButton
  const mealForButton: Meal = {
    recipeName: favorite.name,
    ingredients: favorite.ingredients,
    instructions: favorite.recipeData.instructions
  };

  if (viewMode === 'compact') {
    return (
      <div className={cn(
        'flex items-center gap-4 p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow',
        isSelected && 'ring-2 ring-teal-500 bg-teal-50',
        className
      )}>
        {onSelectionChange && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelectionChange}
            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 truncate">{favorite.name}</h3>
            <CompactRating rating={favorite.rating} />
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <span>{getMealTypeText(favorite.mealType)}</span>
            <span>•</span>
            <span>{favorite.cuisine}</span>
            <span>•</span>
            <span>{favorite.cookingTime}分钟</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onAddToPlan && (
            <Button size="sm" variant="outline" onClick={handleAddToPlan}>
              <Plus className="h-4 w-4 mr-1" />
              添加到计划
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onAddToCollection && (
                <DropdownMenuItem onClick={() => onAddToCollection(favorite.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加到收藏夹
                </DropdownMenuItem>
              )}
              {onShare && (
                <DropdownMenuItem onClick={() => onShare(favorite.id)}>
                  <Share className="h-4 w-4 mr-2" />
                  分享
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(favorite.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <Card className={cn(
        'hover:shadow-md transition-shadow',
        isSelected && 'ring-2 ring-teal-500 bg-teal-50',
        className
      )}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {onSelectionChange && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleSelectionChange}
                className="mt-1 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
            )}
            
            {favorite.imageUrl && (
              <img
                src={favorite.imageUrl}
                alt={favorite.name}
                className="w-20 h-20 object-cover rounded-lg"
              />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">
                    {favorite.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    {favorite.description}
                  </p>
                </div>
                
                <FavoriteButton
                  meal={mealForButton}
                  isFavorite={true}
                  onToggle={() => onDelete(favorite.id)}
                  size="sm"
                />
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {favorite.cookingTime}分钟
                </div>
                <div className="flex items-center gap-1">
                  <ChefHat className="h-4 w-4" />
                  {getDifficultyText(favorite.difficulty)}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {favorite.recipeData.servings || 1}人份
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <InteractiveRating
                    rating={favorite.rating}
                    onRatingChange={(rating) => onRatingChange(favorite.id, rating)}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  {onAddToPlan && (
                    <Button size="sm" variant="outline" onClick={handleAddToPlan}>
                      <Plus className="h-4 w-4 mr-1" />
                      添加到计划
                    </Button>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onAddToCollection && (
                        <DropdownMenuItem onClick={() => onAddToCollection(favorite.id)}>
                          <Plus className="h-4 w-4 mr-2" />
                          添加到收藏夹
                        </DropdownMenuItem>
                      )}
                      {onShare && (
                        <DropdownMenuItem onClick={() => onShare(favorite.id)}>
                          <Share className="h-4 w-4 mr-2" />
                          分享
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDelete(favorite.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view (default)
  return (
    <Card className={cn(
      'group hover:shadow-lg transition-all duration-200 overflow-hidden',
      isSelected && 'ring-2 ring-teal-500 bg-teal-50',
      className
    )}>
      <CardHeader className="relative p-0">
        {onSelectionChange && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelectionChange}
            className="absolute top-3 left-3 z-10 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
        )}
        
        <FavoriteButton
          meal={mealForButton}
          isFavorite={true}
          onToggle={() => onDelete(favorite.id)}
          className="absolute top-3 right-3 z-10 bg-white/80 backdrop-blur-sm hover:bg-white"
        />
        
        {favorite.imageUrl ? (
          <img
            src={favorite.imageUrl}
            alt={favorite.name}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center">
            <ChefHat className="h-12 w-12 text-teal-600" />
          </div>
        )}
        
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary" className="bg-white/90 text-gray-700">
              {getMealTypeText(favorite.mealType)}
            </Badge>
            <Badge className={getDifficultyColor(favorite.difficulty)}>
              {getDifficultyText(favorite.difficulty)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg text-gray-900 mb-1 line-clamp-1">
              {favorite.name}
            </h3>
            <p className="text-gray-600 text-sm line-clamp-2">
              {favorite.description}
            </p>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {favorite.cookingTime}分钟
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {favorite.recipeData.servings || 1}人份
            </div>
          </div>

          <div className="flex items-center justify-between">
            <InteractiveRating
              rating={favorite.rating}
              onRatingChange={(rating) => onRatingChange(favorite.id, rating)}
            />
            <span className="text-xs text-gray-400">
              使用 {favorite.useCount} 次
            </span>
          </div>

          {favorite.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {favorite.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {favorite.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{favorite.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {isExpanded && (
            <div className="space-y-3 pt-3 border-t">
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-2">食材</h4>
                <div className="space-y-1">
                  {(showFullIngredients ? favorite.ingredients : favorite.ingredients.slice(0, 3)).map((ingredient, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      • {ingredient}
                    </div>
                  ))}
                  {favorite.ingredients.length > 3 && (
                    <button
                      onClick={() => setShowFullIngredients(!showFullIngredients)}
                      className="text-sm text-teal-600 hover:text-teal-700"
                    >
                      {showFullIngredients ? '收起' : `查看全部 ${favorite.ingredients.length} 种食材`}
                    </button>
                  )}
                </div>
              </div>

              {favorite.nutritionInfo && (
                <div>
                  <h4 className="font-medium text-sm text-gray-900 mb-2">营养信息</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {favorite.nutritionInfo.calories && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">热量</span>
                        <span>{favorite.nutritionInfo.calories} 卡</span>
                      </div>
                    )}
                    {favorite.nutritionInfo.protein && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">蛋白质</span>
                        <span>{favorite.nutritionInfo.protein}g</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 space-y-2">
        <div className="flex gap-2 w-full">
          {onAddToPlan && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddToPlan}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-1" />
              添加到计划
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)}>
                <Edit className="h-4 w-4 mr-2" />
                {isExpanded ? '收起详情' : '查看详情'}
              </DropdownMenuItem>
              {onAddToCollection && (
                <DropdownMenuItem onClick={() => onAddToCollection(favorite.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加到收藏夹
                </DropdownMenuItem>
              )}
              {onShare && (
                <DropdownMenuItem onClick={() => onShare(favorite.id)}>
                  <Share className="h-4 w-4 mr-2" />
                  分享
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(favorite.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
}