/**
 * @fileOverview Tag management component with analytics and bulk operations
 * Provides comprehensive tag management functionality
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { 
  Tag as TagIcon, 
  TrendingUp, 
  Edit3, 
  Trash2, 
  Plus,
  BarChart3,
  Users,
  Hash,
  Search,
  Filter,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { TagInput, extractPopularTags } from './TagInput';
import { cn } from '@/lib/utils';
import type { FavoriteMeal } from '@/types/favorites.types';

interface TagAnalytics {
  tag: string;
  count: number;
  percentage: number;
  recentlyUsed: boolean;
  associatedCuisines: string[];
  averageRating: number;
}

interface TagManagerProps {
  favorites: FavoriteMeal[];
  selectedFavorites?: string[];
  onBulkTagUpdate?: (favoriteIds: string[], tags: string[], replace?: boolean) => Promise<void>;
  onTagAnalytics?: (tag: string) => void;
  className?: string;
}

export function TagManager({
  favorites,
  selectedFavorites = [],
  onBulkTagUpdate,
  onTagAnalytics,
  className
}: TagManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [replaceMode, setReplaceMode] = useState(true); // true = replace, false = add

  // Calculate tag analytics
  const tagAnalytics = useMemo((): TagAnalytics[] => {
    const tagMap = new Map<string, {
      count: number;
      cuisines: Set<string>;
      ratings: number[];
      lastUsed: Date;
    }>();

    favorites.forEach(favorite => {
      favorite.tags.forEach(tag => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, {
            count: 0,
            cuisines: new Set(),
            ratings: [],
            lastUsed: new Date(0)
          });
        }
        
        const tagData = tagMap.get(tag)!;
        tagData.count++;
        tagData.cuisines.add(favorite.cuisine);
        tagData.ratings.push(favorite.rating);
        
        if (favorite.lastUsed > tagData.lastUsed) {
          tagData.lastUsed = favorite.lastUsed;
        }
      });
    });

    const totalFavorites = favorites.length;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return Array.from(tagMap.entries()).map(([tag, data]) => ({
      tag,
      count: data.count,
      percentage: totalFavorites > 0 ? (data.count / totalFavorites) * 100 : 0,
      recentlyUsed: data.lastUsed > thirtyDaysAgo,
      associatedCuisines: Array.from(data.cuisines),
      averageRating: data.ratings.length > 0 
        ? data.ratings.reduce((sum, rating) => sum + rating, 0) / data.ratings.length 
        : 0
    })).sort((a, b) => b.count - a.count);
  }, [favorites]);

  // Filter tags based on search
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tagAnalytics;
    
    const query = searchQuery.toLowerCase();
    return tagAnalytics.filter(tag => 
      tag.tag.toLowerCase().includes(query) ||
      tag.associatedCuisines.some(cuisine => cuisine.toLowerCase().includes(query))
    );
  }, [tagAnalytics, searchQuery]);

  // Get popular tags for suggestions
  const popularTags = useMemo(() => {
    return extractPopularTags(favorites);
  }, [favorites]);

  // Handle bulk tagging
  const handleBulkTag = useCallback(async () => {
    if (selectedFavorites.length === 0 || bulkTags.length === 0) return;
    
    try {
      await onBulkTagUpdate?.(selectedFavorites, bulkTags, replaceMode);
      setBulkTags([]);
    } catch (error) {
      console.error('Failed to apply bulk tags:', error);
    }
  }, [selectedFavorites, bulkTags, replaceMode, onBulkTagUpdate]);

  // Get tag color based on usage
  const getTagColor = (analytics: TagAnalytics) => {
    if (analytics.percentage >= 50) return 'bg-green-100 text-green-800 border-green-200';
    if (analytics.percentage >= 25) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (analytics.percentage >= 10) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TagIcon className="h-5 w-5 text-teal-600" />
          <h2 className="text-xl font-semibold">标签管理</h2>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              批量标签
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>批量添加标签</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>选中的收藏 ({selectedFavorites.length})</Label>
                <p className="text-sm text-gray-600">
                  {selectedFavorites.length === 0 
                    ? '请先在收藏列表中选择要添加标签的菜谱'
                    : `将为 ${selectedFavorites.length} 个收藏${replaceMode ? '替换' : '添加'}标签`
                  }
                </p>
              </div>

              {/* Toggle for replace/add mode */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">标签模式</Label>
                  <p className="text-xs text-gray-600">
                    {replaceMode ? '替换现有标签' : '添加到现有标签'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplaceMode(!replaceMode)}
                  className="flex items-center gap-2 h-8"
                >
                  {replaceMode ? (
                    <>
                      <ToggleRight className="h-4 w-4 text-teal-600" />
                      <span className="text-sm">替换</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">添加</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Mode explanation */}
              <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                {replaceMode ? (
                  <span>🔄 替换模式：将完全替换选中收藏的现有标签</span>
                ) : (
                  <span>➕ 添加模式：将新标签添加到选中收藏的现有标签中</span>
                )}
              </div>
              
              <div>
                <Label>标签</Label>
                <TagInput
                  tags={bulkTags}
                  onTagsChange={setBulkTags}
                  suggestions={popularTags}
                  placeholder="选择或输入标签..."
                  maxTags={5}
                />
              </div>
              
              <Button 
                onClick={handleBulkTag}
                disabled={selectedFavorites.length === 0 || bulkTags.length === 0}
                className="w-full"
              >
                {replaceMode ? '替换标签' : '添加标签'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics">标签分析</TabsTrigger>
          <TabsTrigger value="management">标签管理</TabsTrigger>
          <TabsTrigger value="suggestions">标签建议</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">总标签数</p>
                    <p className="text-2xl font-bold">{tagAnalytics.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">活跃标签</p>
                    <p className="text-2xl font-bold">
                      {tagAnalytics.filter(t => t.recentlyUsed).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">平均使用率</p>
                    <p className="text-2xl font-bold">
                      {tagAnalytics.length > 0 
                        ? Math.round(tagAnalytics.reduce((sum, t) => sum + t.percentage, 0) / tagAnalytics.length)
                        : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tag Analytics List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                标签使用统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tagAnalytics.slice(0, 10).map((analytics) => (
                  <div key={analytics.tag} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={getTagColor(analytics)}
                        >
                          {analytics.tag}
                        </Badge>
                        {analytics.recentlyUsed && (
                          <Badge variant="secondary" className="text-xs">
                            最近使用
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {analytics.count} 次 ({analytics.percentage.toFixed(1)}%)
                      </div>
                    </div>
                    
                    <Progress value={analytics.percentage} className="h-2" />
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        菜系: {analytics.associatedCuisines.slice(0, 3).join(', ')}
                        {analytics.associatedCuisines.length > 3 && '...'}
                      </span>
                      <span>平均评分: {analytics.averageRating.toFixed(1)} ⭐</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="management" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tag List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTags.map((analytics) => (
              <Card key={analytics.tag} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant="outline" 
                        className={getTagColor(analytics)}
                      >
                        {analytics.tag}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onTagAnalytics?.(analytics.tag)}
                          className="h-6 w-6"
                        >
                          <BarChart3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedTag(analytics.tag)}
                          className="h-6 w-6"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">使用次数</span>
                        <span className="font-medium">{analytics.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">使用率</span>
                        <span className="font-medium">{analytics.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">平均评分</span>
                        <span className="font-medium">{analytics.averageRating.toFixed(1)} ⭐</span>
                      </div>
                    </div>
                    
                    {analytics.associatedCuisines.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">关联菜系</p>
                        <div className="flex flex-wrap gap-1">
                          {analytics.associatedCuisines.slice(0, 3).map((cuisine) => (
                            <Badge key={cuisine} variant="secondary" className="text-xs">
                              {cuisine}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTags.length === 0 && (
            <div className="text-center py-8">
              <TagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? '没有找到匹配的标签' : '还没有标签'}
              </h3>
              <p className="text-gray-600">
                {searchQuery ? '尝试使用其他关键词搜索' : '开始为您的收藏添加标签吧'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>智能标签建议</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">热门标签</h4>
                <div className="flex flex-wrap gap-2">
                  {popularTags.slice(0, 10).map((tag) => (
                    <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-gray-50">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">建议的标签分类</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">健康饮食</h5>
                    <div className="flex flex-wrap gap-1">
                      {['健康', '低卡', '高蛋白', '减脂', '素食', '无糖'].map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs bg-green-50 text-green-700">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">制作难度</h5>
                    <div className="flex flex-wrap gap-1">
                      {['简单', '快手', '新手', '进阶', '复杂'].map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs bg-orange-50 text-orange-700">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">场合用途</h5>
                    <div className="flex flex-wrap gap-1">
                      {['聚餐', '约会', '节日', '儿童', '老人', '下酒菜'].map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs bg-purple-50 text-purple-700">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">菜品类型</h5>
                    <div className="flex flex-wrap gap-1">
                      {['汤品', '凉菜', '热菜', '甜品', '饮品', '烘焙'].map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs bg-blue-50 text-blue-700">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}