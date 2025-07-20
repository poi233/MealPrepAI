'use server';

import type { Meal } from '@/ai/flows/generate-weekly-meal-plan';
import type { Recipe, Ingredient, NutritionInfo } from '@/types/database.types';

/**
 * Transforms a Meal from AI generation to Recipe format
 */
export function transformMealToRecipe(
  meal: Meal, 
  createdByUserId?: string
): Omit<Recipe, 'id' | 'totalTime' | 'avgRating' | 'ratingCount' | 'createdAt' | 'updatedAt'> {
  // Parse ingredients from string array to structured format
  const ingredients: Ingredient[] = meal.ingredients.map(ingredientStr => {
    // Try to parse ingredient string like "中筋面粉 1又1/2杯"
    const parts = ingredientStr.trim().split(/\s+/);
    if (parts.length >= 2) {
      const name = parts[0];
      const amountAndUnit = parts.slice(1).join(' ');
      
      // Try to extract amount and unit
      const amountMatch = amountAndUnit.match(/^([\d又\/\.\s]+)(.*)$/);
      if (amountMatch) {
        const amountStr = amountMatch[1].trim();
        const unit = amountMatch[2].trim();
        
        // Convert Chinese fractions to decimal
        let amount = 1;
        try {
          if (amountStr.includes('又')) {
            // Handle mixed numbers like "1又1/2"
            const [whole, fraction] = amountStr.split('又');
            amount = parseInt(whole) || 0;
            if (fraction && fraction.includes('/')) {
              const [num, den] = fraction.split('/');
              amount += (parseInt(num) || 0) / (parseInt(den) || 1);
            }
          } else if (amountStr.includes('/')) {
            // Handle fractions like "1/2"
            const [num, den] = amountStr.split('/');
            amount = (parseInt(num) || 0) / (parseInt(den) || 1);
          } else {
            // Handle regular numbers
            amount = parseFloat(amountStr) || 1;
          }
        } catch (e) {
          amount = 1;
        }
        
        return {
          name,
          amount,
          unit: unit || '份',
          notes: undefined
        };
      }
    }
    
    // Fallback: treat entire string as ingredient name
    return {
      name: ingredientStr,
      amount: 1,
      unit: '份',
      notes: undefined
    };
  });

  // Extract basic nutrition info from instructions if possible
  const nutritionInfo: NutritionInfo = {};
  
  // Try to detect cuisine from recipe name (basic heuristics)
  let cuisine: string | undefined;
  const recipeName = meal.recipeName.toLowerCase();
  if (recipeName.includes('意大利') || recipeName.includes('pasta') || recipeName.includes('pizza')) {
    cuisine = '意大利菜';
  } else if (recipeName.includes('中式') || recipeName.includes('炒') || recipeName.includes('煮')) {
    cuisine = '中式';
  } else if (recipeName.includes('日式') || recipeName.includes('寿司') || recipeName.includes('拉面')) {
    cuisine = '日式';
  } else if (recipeName.includes('韩式') || recipeName.includes('泡菜') || recipeName.includes('烤肉')) {
    cuisine = '韩式';
  }

  // Estimate prep and cook times from instructions
  let prepTime = 10; // default
  let cookTime = 15; // default
  
  const instructions = meal.instructions.toLowerCase();
  
  // Look for time mentions in instructions
  const timeMatches = instructions.match(/(\d+)[-\s]*(?:分钟|分|min|minutes?)/g);
  if (timeMatches && timeMatches.length > 0) {
    const times = timeMatches.map(match => {
      const num = match.match(/\d+/);
      return num ? parseInt(num[0]) : 0;
    }).filter(t => t > 0);
    
    if (times.length >= 2) {
      prepTime = Math.min(...times);
      cookTime = Math.max(...times);
    } else if (times.length === 1) {
      cookTime = times[0];
      prepTime = Math.max(5, Math.floor(cookTime * 0.3));
    }
  }

  // Determine difficulty based on instruction complexity
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  const stepCount = (instructions.match(/\d+\./g) || []).length;
  const complexWords = ['腌制', '发酵', '烘烤', '油炸', '炖煮', '焖', '蒸'];
  const hasComplexSteps = complexWords.some(word => instructions.includes(word));
  
  if (stepCount <= 3 && !hasComplexSteps) {
    difficulty = 'easy';
  } else if (stepCount > 6 || hasComplexSteps) {
    difficulty = 'hard';
  }

  return {
    createdByUserId,
    name: meal.recipeName,
    description: `AI生成的食谱`,
    ingredients,
    instructions: meal.instructions,
    nutritionInfo,
    cuisine,
    prepTime,
    cookTime,
    difficulty,
    imageUrl: undefined,
    tags: [mealType, difficulty, ...(cuisine ? [cuisine] : [])]
  };
}

/**
 * Validates ingredient data
 */
export function validateIngredient(ingredient: Ingredient): boolean {
  return !!(
    ingredient.name && 
    ingredient.name.trim() !== '' &&
    typeof ingredient.amount === 'number' &&
    ingredient.amount > 0 &&
    ingredient.unit &&
    ingredient.unit.trim() !== ''
  );
}

/**
 * Validates nutrition info
 */
export function validateNutritionInfo(nutrition: NutritionInfo): boolean {
  const numericFields = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];
  
  for (const field of numericFields) {
    const value = nutrition[field as keyof NutritionInfo];
    if (value !== undefined && (typeof value !== 'number' || value < 0)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Sanitizes recipe data for safe database storage
 */
export function sanitizeRecipeData(recipe: Partial<Recipe>): Partial<Recipe> {
  const sanitized = { ...recipe };
  
  // Sanitize strings
  if (sanitized.name) {
    sanitized.name = sanitized.name.trim().substring(0, 255);
  }
  
  if (sanitized.description) {
    sanitized.description = sanitized.description.trim().substring(0, 1000);
  }
  
  if (sanitized.instructions) {
    sanitized.instructions = sanitized.instructions.trim();
  }
  
  if (sanitized.cuisine) {
    sanitized.cuisine = sanitized.cuisine.trim().substring(0, 100);
  }
  
  if (sanitized.imageUrl) {
    sanitized.imageUrl = sanitized.imageUrl.trim().substring(0, 500);
  }
  
  // Sanitize arrays
  if (sanitized.tags) {
    sanitized.tags = sanitized.tags
      .filter(tag => tag && tag.trim() !== '')
      .map(tag => tag.trim().substring(0, 50))
      .slice(0, 20); // Max 20 tags
  }
  
  if (sanitized.ingredients) {
    sanitized.ingredients = sanitized.ingredients
      .filter(validateIngredient)
      .map(ingredient => ({
        ...ingredient,
        name: ingredient.name.trim().substring(0, 100),
        unit: ingredient.unit.trim().substring(0, 20),
        notes: ingredient.notes ? ingredient.notes.trim().substring(0, 200) : undefined
      }));
  }
  
  // Sanitize numeric values
  if (sanitized.prepTime !== undefined) {
    sanitized.prepTime = Math.max(0, Math.min(1440, sanitized.prepTime)); // Max 24 hours
  }
  
  if (sanitized.cookTime !== undefined) {
    sanitized.cookTime = Math.max(0, Math.min(1440, sanitized.cookTime)); // Max 24 hours
  }
  
  return sanitized;
}

/**
 * Generates recipe tags based on content
 */
export function generateRecipeTags(recipe: Partial<Recipe>): string[] {
  const tags: Set<string> = new Set();
    
  // Add difficulty
  if (recipe.difficulty) {
    tags.add(recipe.difficulty);
  }
  
  // Add cuisine
  if (recipe.cuisine) {
    tags.add(recipe.cuisine);
  }
  
  // Add time-based tags
  if (recipe.prepTime !== undefined && recipe.cookTime !== undefined) {
    const totalTime = recipe.prepTime + recipe.cookTime;
    if (totalTime <= 15) {
      tags.add('快手');
    } else if (totalTime <= 30) {
      tags.add('简单');
    } else if (totalTime >= 60) {
      tags.add('慢炖');
    }
  }
  
  // Add ingredient-based tags
  if (recipe.ingredients) {
    const ingredientNames = recipe.ingredients.map(i => i.name.toLowerCase()).join(' ');
    
    if (ingredientNames.includes('鸡') || ingredientNames.includes('chicken')) {
      tags.add('鸡肉');
    }
    if (ingredientNames.includes('牛') || ingredientNames.includes('beef')) {
      tags.add('牛肉');
    }
    if (ingredientNames.includes('猪') || ingredientNames.includes('pork')) {
      tags.add('猪肉');
    }
    if (ingredientNames.includes('鱼') || ingredientNames.includes('fish')) {
      tags.add('海鲜');
    }
    if (ingredientNames.includes('蔬菜') || ingredientNames.includes('vegetable')) {
      tags.add('蔬菜');
    }
    if (ingredientNames.includes('豆腐') || ingredientNames.includes('tofu')) {
      tags.add('素食');
    }
  }
  
  // Add existing tags
  if (recipe.tags) {
    recipe.tags.forEach(tag => tags.add(tag));
  }
  
  return Array.from(tags).slice(0, 15); // Limit to 15 tags
}

/**
 * Formats recipe for display
 */
export function formatRecipeForDisplay(recipe: Recipe): Recipe & {
  formattedPrepTime: string;
  formattedCookTime: string;
  formattedTotalTime: string;
  formattedRating: string;
} {
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };
  
  return {
    ...recipe,
    formattedPrepTime: formatTime(recipe.prepTime),
    formattedCookTime: formatTime(recipe.cookTime),
    formattedTotalTime: formatTime(recipe.totalTime),
    formattedRating: (Number(recipe.avgRating) || 0).toFixed(1)
  };
}