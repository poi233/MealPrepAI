/**
 * @fileOverview Test component to verify favorites-meal plan integration
 * This component can be used to test the integration functionality
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddToPlanDialog } from './AddToPlanDialog';
import { QuickAddFavorites } from './QuickAddFavorites';
import type { FavoriteMeal } from '@/types/favorites.types';

// Mock favorite meal for testing
const mockFavoriteMeal: FavoriteMeal = {
  id: 'test-favorite-1',
  mealId: 'test-meal-1',
  userId: '550e8400-e29b-41d4-a716-446655440000',
  name: '测试收藏菜谱',
  description: '这是一个用于测试的收藏菜谱',
  cuisine: '中式',
  mealType: 'dinner',
  ingredients: ['测试食材1', '测试食材2', '测试食材3'],
  cookingTime: 30,
  difficulty: 'medium',
  rating: 4,
  tags: ['测试', '快手菜'],
  nutritionInfo: {
    calories: 300,
    protein: 20,
    carbs: 40,
    fat: 10
  },
  recipeData: {
    recipeName: '测试收藏菜谱',
    ingredients: ['测试食材1', '测试食材2', '测试食材3'],
    instructions: '1. 准备食材\n2. 开始烹饪\n3. 完成制作',
    servings: 2,
    prepTime: 10,
    cookTime: 20
  },
  createdAt: new Date(),
  lastUsed: new Date(),
  useCount: 5,
  isShared: false,
  collections: []
};

export function IntegrationTest() {
  const [showAddToPlanDialog, setShowAddToPlanDialog] = useState(false);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>收藏-膳食计划集成测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">测试功能:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>✅ 收藏按钮已添加到膳食计划组件</li>
              <li>✅ "添加到计划" 功能已实现</li>
              <li>✅ 膳食位置选择界面已创建</li>
              <li>✅ 快速添加收藏组件已创建</li>
              <li>✅ 数据流集成已完成</li>
            </ul>
          </div>
          
          <Button onClick={() => setShowAddToPlanDialog(true)}>
            测试添加到计划对话框
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>快速添加收藏组件</CardTitle>
        </CardHeader>
        <CardContent>
          <QuickAddFavorites maxItems={3} />
        </CardContent>
      </Card>

      {/* Test Dialog */}
      <AddToPlanDialog
        isOpen={showAddToPlanDialog}
        onClose={() => setShowAddToPlanDialog(false)}
        favoriteMeal={mockFavoriteMeal}
      />
    </div>
  );
}