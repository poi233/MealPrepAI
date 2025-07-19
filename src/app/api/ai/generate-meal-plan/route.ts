import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { generateWeeklyMealPlan } from '@/ai/flows/generate-weekly-meal-plan';
import type { User } from '@/types/database.types';

// POST /api/ai/generate-meal-plan - Generate AI meal plan
export const POST = withAuth(async (user: User, request: NextRequest) => {
  try {
    const body = await request.json();
    const { 
      planDescription,
      dietaryPreferences, 
      allergies, 
      dislikes, 
      calorieTarget, 
      weekStartDate,
      additionalRequirements 
    } = body;

    if (!planDescription && !weekStartDate) {
      return Response.json(
        { error: 'Plan description or week start date is required' },
        { status: 400 }
      );
    }

    // Build plan description from user preferences if not provided
    let finalPlanDescription = planDescription;
    if (!finalPlanDescription) {
      const userPrefs = user.dietaryPreferences;
      const parts = [];
      
      if (userPrefs?.dietType) {
        parts.push(`饮食类型: ${userPrefs.dietType}`);
      }
      
      if (allergies?.length || userPrefs?.allergies?.length) {
        const allAllergies = [...(allergies || []), ...(userPrefs?.allergies || [])];
        parts.push(`过敏原: ${allAllergies.join(', ')}`);
      }
      
      if (dislikes?.length || userPrefs?.dislikes?.length) {
        const allDislikes = [...(dislikes || []), ...(userPrefs?.dislikes || [])];
        parts.push(`不喜欢的食物: ${allDislikes.join(', ')}`);
      }
      
      if (calorieTarget || userPrefs?.calorieTarget) {
        parts.push(`每日卡路里目标: ${calorieTarget || userPrefs?.calorieTarget}卡路里`);
      }
      
      if (additionalRequirements) {
        parts.push(`额外要求: ${additionalRequirements}`);
      }
      
      finalPlanDescription = parts.length > 0 
        ? `请为我生成一个健康的7天膳食计划。${parts.join('。')}`
        : '请为我生成一个健康均衡的7天膳食计划';
    }

    const mealPlan = await generateWeeklyMealPlan({
      planDescription: finalPlanDescription
    });

    return Response.json(mealPlan);
  } catch (error) {
    console.error('Error generating meal plan:', error);
    return Response.json(
      { error: 'Failed to generate meal plan' },
      { status: 500 }
    );
  }
});