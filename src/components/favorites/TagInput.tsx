/**
 * @fileOverview Tag input component with autocomplete functionality
 * Provides tag creation, editing, and suggestion features
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  allowCustomTags?: boolean;
  className?: string;
  disabled?: boolean;
}

// Common tag suggestions for meal favorites
const DEFAULT_SUGGESTIONS = [
  '健康', '快手', '素食', '高蛋白', '减脂', '低卡', '无糖',
  '早餐', '午餐', '晚餐', '小食', '夜宵',
  '家常菜', '下饭菜', '汤品', '凉菜', '热菜',
  '川菜', '粤菜', '湘菜', '鲁菜', '苏菜', '浙菜', '闽菜', '徽菜',
  '西式', '日式', '韩式', '泰式', '意式', '法式',
  '烘焙', '甜品', '饮品', '零食',
  '节日', '聚餐', '约会', '儿童', '老人',
  '简单', '复杂', '新手', '进阶',
  '经济', '豪华', '特色', '创新'
];

// Tag color mapping for consistent styling
const TAG_COLORS = {
  // Health & Diet
  '健康': 'bg-green-100 text-green-800 border-green-200',
  '素食': 'bg-green-100 text-green-800 border-green-200',
  '高蛋白': 'bg-blue-100 text-blue-800 border-blue-200',
  '减脂': 'bg-purple-100 text-purple-800 border-purple-200',
  '低卡': 'bg-purple-100 text-purple-800 border-purple-200',
  '无糖': 'bg-purple-100 text-purple-800 border-purple-200',
  
  // Speed & Convenience
  '快手': 'bg-orange-100 text-orange-800 border-orange-200',
  '简单': 'bg-orange-100 text-orange-800 border-orange-200',
  '新手': 'bg-orange-100 text-orange-800 border-orange-200',
  
  // Meal Types
  '早餐': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  '午餐': 'bg-amber-100 text-amber-800 border-amber-200',
  '晚餐': 'bg-red-100 text-red-800 border-red-200',
  '小食': 'bg-pink-100 text-pink-800 border-pink-200',
  '夜宵': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  
  // Cuisines
  '川菜': 'bg-red-100 text-red-800 border-red-200',
  '粤菜': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  '湘菜': 'bg-red-100 text-red-800 border-red-200',
  '西式': 'bg-slate-100 text-slate-800 border-slate-200',
  '日式': 'bg-rose-100 text-rose-800 border-rose-200',
  '韩式': 'bg-red-100 text-red-800 border-red-200',
  
  // Default
  default: 'bg-gray-100 text-gray-800 border-gray-200'
};

export function TagInput({
  tags,
  onTagsChange,
  suggestions = DEFAULT_SUGGESTIONS,
  placeholder = '添加标签...',
  maxTags = 10,
  allowCustomTags = true,
  className,
  disabled = false
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input and existing tags
  useEffect(() => {
    if (!inputValue.trim()) {
      // Show popular suggestions that aren't already added
      const availableSuggestions = suggestions.filter(s => !tags.includes(s));
      setFilteredSuggestions(availableSuggestions.slice(0, 8));
    } else {
      // Fuzzy search through suggestions
      const query = inputValue.toLowerCase();
      const filtered = suggestions.filter(suggestion => {
        const suggestionLower = suggestion.toLowerCase();
        return suggestionLower.includes(query) && !tags.includes(suggestion);
      });
      setFilteredSuggestions(filtered.slice(0, 8));
    }
  }, [inputValue, suggestions, tags]);

  const addTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    
    if (tags.includes(trimmedTag)) return;
    if (tags.length >= maxTags) return;
    
    onTagsChange([...tags, trimmedTag]);
    setInputValue('');
    setIsOpen(false);
  }, [tags, onTagsChange, maxTags]);

  const removeTag = useCallback((tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  }, [tags, onTagsChange]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        if (allowCustomTags || suggestions.includes(inputValue.trim())) {
          addTag(inputValue.trim());
        }
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const getTagColor = (tag: string): string => {
    return TAG_COLORS[tag as keyof typeof TAG_COLORS] || TAG_COLORS.default;
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Existing tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className={cn(
                'gap-1 pr-1 text-sm',
                getTagColor(tag),
                disabled && 'opacity-50'
              )}
            >
              {tag}
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTag(tag)}
                  className="h-3 w-3 p-0 hover:bg-transparent"
                >
                  <X className="h-2 w-2" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Tag input */}
      {!disabled && tags.length < maxTags && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="pr-10"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <TagIcon className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </PopoverTrigger>
          
          <PopoverContent className="w-80 p-2" align="start">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 px-2">
                标签建议
              </div>
              
              {filteredSuggestions.length > 0 ? (
                <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                  {filteredSuggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="ghost"
                      size="sm"
                      onClick={() => addTag(suggestion)}
                      className={cn(
                        'justify-start h-8 text-xs',
                        getTagColor(suggestion)
                      )}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {suggestion}
                    </Button>
                  ))}
                </div>
              ) : inputValue.trim() && allowCustomTags ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addTag(inputValue.trim())}
                  className="w-full justify-start h-8 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  创建 "{inputValue.trim()}"
                </Button>
              ) : (
                <div className="text-sm text-gray-500 px-2 py-4 text-center">
                  {inputValue.trim() ? '没有匹配的标签' : '输入关键词搜索标签'}
                </div>
              )}
              
              {tags.length > 0 && (
                <>
                  <div className="border-t pt-2">
                    <div className="text-xs text-gray-500 px-2 mb-1">
                      快捷操作
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTagsChange([])}
                      className="w-full justify-start h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-3 w-3 mr-1" />
                      清除所有标签
                    </Button>
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Tag count indicator */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{tags.length} / {maxTags} 个标签</span>
        {tags.length >= maxTags && (
          <span className="text-amber-600">已达到标签上限</span>
        )}
      </div>
    </div>
  );
}

// Utility function to get popular tags from a list of favorites
export function extractPopularTags(favorites: Array<{ tags: string[] }>): string[] {
  const tagCounts = new Map<string, number>();
  
  favorites.forEach(favorite => {
    favorite.tags.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });
  
  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, 20);
}

// Utility function to suggest tags based on meal content
export function suggestTagsForMeal(meal: {
  name: string;
  ingredients: string[];
  cuisine?: string;
  mealType?: string;
  difficulty?: string;
  cookingTime?: number;
}): string[] {
  const suggestions: string[] = [];
  
  // Add meal type
  if (meal.mealType) {
    const mealTypeMap = {
      breakfast: '早餐',
      lunch: '午餐', 
      dinner: '晚餐',
      snack: '小食'
    };
    const chineseMealType = mealTypeMap[meal.mealType as keyof typeof mealTypeMap];
    if (chineseMealType) suggestions.push(chineseMealType);
  }
  
  // Add cuisine
  if (meal.cuisine && meal.cuisine !== 'Unknown') {
    suggestions.push(meal.cuisine);
  }
  
  // Add difficulty-based tags
  if (meal.difficulty === 'easy') {
    suggestions.push('简单', '新手');
  }
  
  // Add time-based tags
  if (meal.cookingTime && meal.cookingTime <= 15) {
    suggestions.push('快手');
  }
  
  // Add ingredient-based tags
  const healthyIngredients = ['蔬菜', '水果', '鸡胸肉', '鱼', '豆腐', '燕麦'];
  const vegetarianIngredients = ['豆腐', '蔬菜', '水果', '坚果', '豆类'];
  
  const ingredientText = meal.ingredients.join(' ').toLowerCase();
  
  if (healthyIngredients.some(ing => ingredientText.includes(ing))) {
    suggestions.push('健康');
  }
  
  if (vegetarianIngredients.some(ing => ingredientText.includes(ing)) && 
      !ingredientText.includes('肉') && !ingredientText.includes('鱼')) {
    suggestions.push('素食');
  }
  
  return [...new Set(suggestions)];
}