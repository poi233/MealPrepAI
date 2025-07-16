/**
 * @fileOverview Dialog for selecting meal slots when adding favorites to meal plan
 */

'use client';

import { useState } from 'react';
import { Calendar, Clock, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { useToast } from '@/hooks/use-toast';
import type { FavoriteMeal } from '@/types/favorites.types';
import type { Meal, DailyMealPlan } from '@/ai/flows/generate-weekly-meal-plan';
import { saveMealPlanToDb } from '@/app/actions';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { favoritesService } from '@/services/favoritesService';

interface AddToPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  favoriteMeal: FavoriteMeal;
}

type MealTypeKey = keyof Pick<DailyMealPlan, 'breakfast' | 'lunch' | 'dinner'>;

const DAYS_OF_WEEK = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];
const MEAL_TYPES: Array<{ key: MealTypeKey; title: string }> = [
  { key: 'breakfast', title: '早餐' },
  { key: 'lunch', title: '午餐' },
  { key: 'dinner', title: '晚餐' },
];

export function AddToPlanDialog({ isOpen, onClose, favoriteMeal }: AddToPlanDialogProps) {
  const { mealPlan, setMealPlan } = useMealPlan();
  const { activePlanName } = useUserProfile();
  const { toast } = useToast();
  const [selectedSlots, setSelectedSlots] = useState<Array<{ day: string; mealType: MealTypeKey }>>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Convert FavoriteMeal to Meal format
  const convertToMeal = (favorite: FavoriteMeal): Meal => ({
    recipeName: favorite.name,
    ingredients: favorite.ingredients,
    instructions: favorite.recipeData.instructions || '制作步骤请参考原始食谱。'
  });

  const handleSlotToggle = (day: string, mealType: MealTypeKey) => {
    setSelectedSlots(prev => {
      const slotKey = `${day}-${mealType}`;
      const existingIndex = prev.findIndex(slot => `${slot.day}-${slot.mealType}` === slotKey);
      
      if (existingIndex >= 0) {
        // Remove slot
        return prev.filter((_, index) => index !== existingIndex);
      } else {
        // Add slot
        return [...prev, { day, mealType }];
      }
    });
  };

  const isSlotSelected = (day: string, mealType: MealTypeKey) => {
    return selectedSlots.some(slot => slot.day === day && slot.mealType === mealType);
  };

  const getMealCount = (day: string, mealType: MealTypeKey) => {
    if (!mealPlan?.weeklyMealPlan) return 0;
    const dailyPlan = mealPlan.weeklyMealPlan.find(dp => dp.day === day);
    return dailyPlan?.[mealType]?.length || 0;
  };

  const handleAddToPlan = async () => {
    if (!mealPlan || !activePlanName || selectedSlots.length === 0) {
      toast({
        title: "无法添加到计划",
        description: "请选择至少一个餐位或确保有活动的膳食计划。",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);

    try {
      const mealToAdd = convertToMeal(favoriteMeal);
      
      // Update meal plan with selected slots
      const updatedWeeklyMealPlan = mealPlan.weeklyMealPlan.map(daily => {
        const slotsForDay = selectedSlots.filter(slot => slot.day === daily.day);
        
        if (slotsForDay.length === 0) return daily;

        const updatedDaily = { ...daily };
        
        slotsForDay.forEach(slot => {
          const currentMeals = updatedDaily[slot.mealType] || [];
          updatedDaily[slot.mealType] = [...currentMeals, mealToAdd];
        });

        return updatedDaily;
      });

      // Update local state
      const newMealPlanState = { ...mealPlan, weeklyMealPlan: updatedWeeklyMealPlan };
      setMealPlan(newMealPlanState);

      // Save to database
      await saveMealPlanToDb(activePlanName, mealPlan.planDescription, { weeklyMealPlan: updatedWeeklyMealPlan });

      // Update favorite usage count
      try {
        await favoritesService.incrementUsageCount(favoriteMeal.id, favoriteMeal.userId);
      } catch (error) {
        console.warn('Failed to update usage count:', error);
        // Don't fail the whole operation for this
      }

      toast({
        title: "已添加到膳食计划",
        description: `${favoriteMeal.name} 已添加到 ${selectedSlots.length} 个餐位`,
      });

      onClose();
      setSelectedSlots([]);
    } catch (error) {
      console.error('Error adding to meal plan:', error);
      toast({
        title: "添加失败",
        description: "无法将收藏添加到膳食计划，请重试。",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  if (!mealPlan?.weeklyMealPlan) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>无活动膳食计划</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">
              请先创建或选择一个膳食计划，然后再添加收藏的菜谱。
            </p>
            <Button onClick={onClose}>关闭</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            添加到膳食计划: {favoriteMeal.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Meal Preview */}
          <Card className="bg-gradient-to-r from-teal-50 to-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {favoriteMeal.imageUrl && (
                  <img 
                    src={favoriteMeal.imageUrl} 
                    alt={favoriteMeal.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{favoriteMeal.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <span>{favoriteMeal.cuisine}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {favoriteMeal.cookingTime} 分钟
                    </span>
                    <Badge variant="outline">{favoriteMeal.difficulty}</Badge>
                  </div>
                  {favoriteMeal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {favoriteMeal.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meal Slot Selection */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              选择餐位 (可选择多个)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {DAYS_OF_WEEK.map(day => (
                <Card key={day} className="border-2">
                  <CardContent className="p-3">
                    <h5 className="font-medium text-center mb-3 text-primary">{day}</h5>
                    <div className="space-y-2">
                      {MEAL_TYPES.map(({ key, title }) => {
                        const isSelected = isSlotSelected(day, key);
                        const mealCount = getMealCount(day, key);
                        
                        return (
                          <Button
                            key={`${day}-${key}`}
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSlotToggle(day, key)}
                            className={`w-full justify-between ${
                              isSelected ? 'bg-teal-600 hover:bg-teal-700' : ''
                            }`}
                          >
                            <span>{title}</span>
                            <Badge variant={isSelected ? "secondary" : "outline"} className="text-xs">
                              {mealCount}
                            </Badge>
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Selected Slots Summary */}
          {selectedSlots.length > 0 && (
            <Card className="bg-teal-50 border-teal-200">
              <CardContent className="p-4">
                <h5 className="font-medium mb-2">已选择的餐位:</h5>
                <div className="flex flex-wrap gap-2">
                  {selectedSlots.map((slot, index) => {
                    const mealTypeTitle = MEAL_TYPES.find(mt => mt.key === slot.mealType)?.title;
                    return (
                      <Badge key={index} variant="default" className="bg-teal-600">
                        {slot.day} {mealTypeTitle}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isAdding}>
            取消
          </Button>
          <Button 
            onClick={handleAddToPlan}
            disabled={selectedSlots.length === 0 || isAdding}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                添加中...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                添加到计划 ({selectedSlots.length})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}