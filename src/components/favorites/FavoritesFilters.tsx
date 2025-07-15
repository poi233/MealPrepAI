/**
 * @fileOverview Search and filtering interface for favorites
 * Provides comprehensive filtering, searching, and sorting capabilities
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  X, 
  ChevronDown,
  Star,
  Clock,
  ChefHat,
  Tag as TagIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { FavoriteFilters, FavoriteMeal } from '@/types/favorites.types';

interface FavoritesFiltersProps {
  filters: FavoriteFilters;
  onFiltersChange: (filters: Partial<FavoriteFilters>) => void;
  onClearFilters: () => void;
  availableTags: string[];
  availableCuisines: string[];
  totalCount: number;
  filteredCount: number;
  className?: string;
}

const MEAL_TYPES = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'snack', label: '小食' }
] as const;

const DIFFICULTY_LEVELS = [
  { value: 'easy', label: '简单', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: '中等', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'hard', label: '困难', color: 'bg-red-100 text-red-800' }
] as const;

const SORT_OPTIONS = [
  { value: 'date', label: '添加时间' },
  { value: 'rating', label: '评分' },
  { value: 'usage', label: '使用次数' },
  { value: 'name', label: '名称' }
] as const;

export function FavoritesFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  availableTags,
  availableCuisines,
  totalCount,
  filteredCount,
  className
}: FavoritesFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.searchQuery);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.searchQuery) {
        onFiltersChange({ searchQuery: searchInput });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, filters.searchQuery, onFiltersChange]);

  // Update search input when filters change externally
  useEffect(() => {
    setSearchInput(filters.searchQuery);
  }, [filters.searchQuery]);

  const handleTagToggle = useCallback((tag: string, checked: boolean) => {
    const newTags = checked
      ? [...filters.selectedTags, tag]
      : filters.selectedTags.filter(t => t !== tag);
    onFiltersChange({ selectedTags: newTags });
  }, [filters.selectedTags, onFiltersChange]);

  const handleCuisineToggle = useCallback((cuisine: string, checked: boolean) => {
    const newCuisines = checked
      ? [...filters.cuisineTypes, cuisine]
      : filters.cuisineTypes.filter(c => c !== cuisine);
    onFiltersChange({ cuisineTypes: newCuisines });
  }, [filters.cuisineTypes, onFiltersChange]);

  const handleMealTypeToggle = useCallback((mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', checked: boolean) => {
    const newMealTypes = checked
      ? [...filters.mealTypes, mealType]
      : filters.mealTypes.filter(m => m !== mealType);
    onFiltersChange({ mealTypes: newMealTypes });
  }, [filters.mealTypes, onFiltersChange]);

  const handleDifficultyToggle = useCallback((difficulty: 'easy' | 'medium' | 'hard', checked: boolean) => {
    const newDifficulties = checked
      ? [...filters.difficultyLevels, difficulty]
      : filters.difficultyLevels.filter(d => d !== difficulty);
    onFiltersChange({ difficultyLevels: newDifficulties });
  }, [filters.difficultyLevels, onFiltersChange]);

  const handleRatingChange = useCallback((value: number[]) => {
    onFiltersChange({ ratingRange: [value[0], value[1]] });
  }, [onFiltersChange]);

  const handleSortChange = useCallback((sortBy: string) => {
    onFiltersChange({ sortBy: sortBy as FavoriteFilters['sortBy'] });
  }, [onFiltersChange]);

  const toggleSortOrder = useCallback(() => {
    onFiltersChange({ 
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
    });
  }, [filters.sortOrder, onFiltersChange]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.selectedTags.length > 0) count++;
    if (filters.cuisineTypes.length > 0) count++;
    if (filters.mealTypes.length > 0) count++;
    if (filters.difficultyLevels.length > 0) count++;
    if (filters.ratingRange[0] > 1 || filters.ratingRange[1] < 5) count++;
    return count;
  }, [filters]);

  const clearSearch = useCallback(() => {
    setSearchInput('');
    onFiltersChange({ searchQuery: '' });
  }, [onFiltersChange]);

  return (
    <Card className={cn('border-0 shadow-sm bg-gray-50/50', className)}>
      <CardContent className="p-4 space-y-4">
        {/* Search and main controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索菜谱名称、食材或标签..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchInput && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filter toggle */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                筛选
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">筛选条件</h3>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClearFilters}
                      className="text-sm"
                    >
                      清除全部
                    </Button>
                  )}
                </div>

                <Separator />

                {/* Tags filter */}
                {availableTags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <TagIcon className="h-4 w-4" />
                      标签
                    </Label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {availableTags.map((tag) => (
                        <div key={tag} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tag-${tag}`}
                            checked={filters.selectedTags.includes(tag)}
                            onCheckedChange={(checked) => 
                              handleTagToggle(tag, checked as boolean)
                            }
                          />
                          <Label 
                            htmlFor={`tag-${tag}`} 
                            className="text-sm truncate cursor-pointer"
                          >
                            {tag}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Cuisine filter */}
                {availableCuisines.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <ChefHat className="h-4 w-4" />
                      菜系
                    </Label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {availableCuisines.map((cuisine) => (
                        <div key={cuisine} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cuisine-${cuisine}`}
                            checked={filters.cuisineTypes.includes(cuisine)}
                            onCheckedChange={(checked) => 
                              handleCuisineToggle(cuisine, checked as boolean)
                            }
                          />
                          <Label 
                            htmlFor={`cuisine-${cuisine}`} 
                            className="text-sm truncate cursor-pointer"
                          >
                            {cuisine}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Meal type filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">餐次类型</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {MEAL_TYPES.map((mealType) => (
                      <div key={mealType.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`meal-${mealType.value}`}
                          checked={filters.mealTypes.includes(mealType.value)}
                          onCheckedChange={(checked) => 
                            handleMealTypeToggle(mealType.value, checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={`meal-${mealType.value}`} 
                          className="text-sm cursor-pointer"
                        >
                          {mealType.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Difficulty filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">难度等级</Label>
                  <div className="space-y-2">
                    {DIFFICULTY_LEVELS.map((difficulty) => (
                      <div key={difficulty.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`difficulty-${difficulty.value}`}
                          checked={filters.difficultyLevels.includes(difficulty.value)}
                          onCheckedChange={(checked) => 
                            handleDifficultyToggle(difficulty.value, checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={`difficulty-${difficulty.value}`} 
                          className="text-sm cursor-pointer"
                        >
                          <Badge className={difficulty.color} variant="secondary">
                            {difficulty.label}
                          </Badge>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Rating filter */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Star className="h-4 w-4" />
                    评分范围
                  </Label>
                  <div className="px-2">
                    <Slider
                      value={filters.ratingRange}
                      onValueChange={handleRatingChange}
                      max={5}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{filters.ratingRange[0]} 星</span>
                      <span>{filters.ratingRange[1]} 星</span>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Sort controls */}
          <div className="flex items-center gap-2">
            <Select value={filters.sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortOrder}
              className="shrink-0"
            >
              {filters.sortOrder === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Active filters display */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600">已应用筛选:</span>
            
            {filters.searchQuery && (
              <Badge variant="secondary" className="gap-1">
                搜索: {filters.searchQuery}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearSearch}
                  className="h-3 w-3 p-0 hover:bg-transparent"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            )}

            {filters.selectedTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleTagToggle(tag, false)}
                  className="h-3 w-3 p-0 hover:bg-transparent"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}

            {filters.cuisineTypes.map((cuisine) => (
              <Badge key={cuisine} variant="secondary" className="gap-1">
                {cuisine}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCuisineToggle(cuisine, false)}
                  className="h-3 w-3 p-0 hover:bg-transparent"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}

            {filters.mealTypes.map((mealType) => (
              <Badge key={mealType} variant="secondary" className="gap-1">
                {MEAL_TYPES.find(m => m.value === mealType)?.label}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMealTypeToggle(mealType, false)}
                  className="h-3 w-3 p-0 hover:bg-transparent"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}

            {filters.difficultyLevels.map((difficulty) => (
              <Badge key={difficulty} variant="secondary" className="gap-1">
                {DIFFICULTY_LEVELS.find(d => d.value === difficulty)?.label}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDifficultyToggle(difficulty, false)}
                  className="h-3 w-3 p-0 hover:bg-transparent"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}

            {(filters.ratingRange[0] > 1 || filters.ratingRange[1] < 5) && (
              <Badge variant="secondary" className="gap-1">
                评分: {filters.ratingRange[0]}-{filters.ratingRange[1]} 星
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRatingChange([1, 5])}
                  className="h-3 w-3 p-0 hover:bg-transparent"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              清除全部
            </Button>
          </div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            显示 {filteredCount} / {totalCount} 个收藏
          </span>
          {activeFilterCount > 0 && filteredCount !== totalCount && (
            <span className="text-teal-600">
              已筛选 {totalCount - filteredCount} 个结果
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}