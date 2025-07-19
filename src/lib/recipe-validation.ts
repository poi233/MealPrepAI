/**
 * @fileOverview Recipe validation and sanitization utilities for AI-generated content.
 */

import type { Recipe, Ingredient, NutritionInfo } from '@/types/database.types';
import type { GenerateCompleteRecipeOutput } from '@/ai/flows/generate-complete-recipe';

export interface RecipeValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface RecipeValidationResult {
  isValid: boolean;
  errors: RecipeValidationError[];
  sanitizedRecipe?: Partial<Recipe>;
}

/**
 * Validates and sanitizes AI-generated recipe data
 */
export function validateAndSanitizeRecipe(
  aiRecipe: GenerateCompleteRecipeOutput,
  createdByUserId?: string
): RecipeValidationResult {
  const errors: RecipeValidationError[] = [];
  const sanitizedRecipe: Partial<Recipe> = {};

  // Validate and sanitize name
  if (!aiRecipe.name || typeof aiRecipe.name !== 'string') {
    errors.push({ field: 'name', message: 'Recipe name is required and must be a string' });
  } else {
    sanitizedRecipe.name = sanitizeText(aiRecipe.name, 200);
  }

  // Validate and sanitize description
  if (aiRecipe.description) {
    sanitizedRecipe.description = sanitizeText(aiRecipe.description, 500);
  }

  // Validate and sanitize ingredients
  const ingredientValidation = validateIngredients(aiRecipe.ingredients);
  if (ingredientValidation.errors.length > 0) {
    errors.push(...ingredientValidation.errors);
  } else {
    sanitizedRecipe.ingredients = ingredientValidation.sanitizedIngredients;
  }

  // Validate and sanitize instructions
  if (!aiRecipe.instructions || typeof aiRecipe.instructions !== 'string') {
    errors.push({ field: 'instructions', message: 'Instructions are required and must be a string' });
  } else {
    sanitizedRecipe.instructions = sanitizeText(aiRecipe.instructions, 5000);
  }

  // Validate and sanitize nutrition info
  const nutritionValidation = validateNutritionInfo(aiRecipe.nutritionInfo);
  if (nutritionValidation.errors.length > 0) {
    errors.push(...nutritionValidation.errors);
  } else {
    sanitizedRecipe.nutritionInfo = nutritionValidation.sanitizedNutrition;
  }

  // Validate and sanitize cuisine
  if (aiRecipe.cuisine) {
    sanitizedRecipe.cuisine = sanitizeText(aiRecipe.cuisine, 50);
  }

  // Validate times
  const timeValidation = validateTimes(aiRecipe.prepTime, aiRecipe.cookTime, aiRecipe.totalTime);
  if (timeValidation.errors.length > 0) {
    errors.push(...timeValidation.errors);
  } else {
    sanitizedRecipe.prepTime = timeValidation.prepTime;
    sanitizedRecipe.cookTime = timeValidation.cookTime;
    sanitizedRecipe.totalTime = timeValidation.totalTime;
  }

  // Validate difficulty
  const validDifficulties = ['easy', 'medium', 'hard'];
  if (!validDifficulties.includes(aiRecipe.difficulty)) {
    errors.push({ 
      field: 'difficulty', 
      message: 'Invalid difficulty level', 
      value: aiRecipe.difficulty 
    });
  } else {
    sanitizedRecipe.difficulty = aiRecipe.difficulty;
  }

  // Validate and sanitize tags
  const tagValidation = validateTags(aiRecipe.tags);
  if (tagValidation.errors.length > 0) {
    errors.push(...tagValidation.errors);
  } else {
    sanitizedRecipe.tags = tagValidation.sanitizedTags;
  }

  // Set default values for new AI-generated recipes
  sanitizedRecipe.createdByUserId = createdByUserId;
  sanitizedRecipe.avgRating = 0;
  sanitizedRecipe.ratingCount = 0;
  sanitizedRecipe.createdAt = new Date();
  sanitizedRecipe.updatedAt = new Date();

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedRecipe: errors.length === 0 ? sanitizedRecipe : undefined,
  };
}

/**
 * Sanitizes text by trimming, limiting length, and removing potentially harmful content
 */
function sanitizeText(text: string, maxLength: number): string {
  return text
    .trim()
    .slice(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .trim();
}

/**
 * Validates ingredients array
 */
function validateIngredients(ingredients: unknown): {
  errors: RecipeValidationError[];
  sanitizedIngredients?: Ingredient[];
} {
  const errors: RecipeValidationError[] = [];
  
  if (!Array.isArray(ingredients)) {
    return { errors: [{ field: 'ingredients', message: 'Ingredients must be an array' }] };
  }

  if (ingredients.length === 0) {
    return { errors: [{ field: 'ingredients', message: 'At least one ingredient is required' }] };
  }

  if (ingredients.length > 50) {
    return { errors: [{ field: 'ingredients', message: 'Too many ingredients (max 50)' }] };
  }

  const sanitizedIngredients: Ingredient[] = [];

  ingredients.forEach((ingredient, index) => {
    if (!ingredient || typeof ingredient !== 'object') {
      errors.push({ 
        field: `ingredients[${index}]`, 
        message: 'Ingredient must be an object' 
      });
      return;
    }

    const ing = ingredient as any;

    // Validate name
    if (!ing.name || typeof ing.name !== 'string') {
      errors.push({ 
        field: `ingredients[${index}].name`, 
        message: 'Ingredient name is required and must be a string' 
      });
      return;
    }

    // Validate amount
    if (typeof ing.amount !== 'number' || ing.amount <= 0) {
      errors.push({ 
        field: `ingredients[${index}].amount`, 
        message: 'Ingredient amount must be a positive number' 
      });
      return;
    }

    // Validate unit
    if (!ing.unit || typeof ing.unit !== 'string') {
      errors.push({ 
        field: `ingredients[${index}].unit`, 
        message: 'Ingredient unit is required and must be a string' 
      });
      return;
    }

    sanitizedIngredients.push({
      name: sanitizeText(ing.name, 100),
      amount: Math.round(ing.amount * 100) / 100, // Round to 2 decimal places
      unit: sanitizeText(ing.unit, 20),
      notes: ing.notes ? sanitizeText(ing.notes, 200) : undefined,
    });
  });

  return { errors, sanitizedIngredients: errors.length === 0 ? sanitizedIngredients : undefined };
}

/**
 * Validates nutrition information
 */
function validateNutritionInfo(nutrition: unknown): {
  errors: RecipeValidationError[];
  sanitizedNutrition?: NutritionInfo;
} {
  const errors: RecipeValidationError[] = [];
  
  if (!nutrition || typeof nutrition !== 'object') {
    return { errors: [{ field: 'nutritionInfo', message: 'Nutrition info must be an object' }] };
  }

  const nut = nutrition as any;
  const sanitizedNutrition: NutritionInfo = {};

  // Validate optional numeric fields
  const numericFields = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];
  
  numericFields.forEach(field => {
    if (nut[field] !== undefined) {
      if (typeof nut[field] !== 'number' || nut[field] < 0) {
        errors.push({ 
          field: `nutritionInfo.${field}`, 
          message: `${field} must be a non-negative number` 
        });
      } else {
        (sanitizedNutrition as any)[field] = Math.round(nut[field] * 100) / 100;
      }
    }
  });

  return { errors, sanitizedNutrition: errors.length === 0 ? sanitizedNutrition : undefined };
}

/**
 * Validates cooking times
 */
function validateTimes(prepTime: unknown, cookTime: unknown, totalTime: unknown): {
  errors: RecipeValidationError[];
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
} {
  const errors: RecipeValidationError[] = [];

  // Validate prep time
  if (typeof prepTime !== 'number' || prepTime < 0 || prepTime > 1440) { // Max 24 hours
    errors.push({ field: 'prepTime', message: 'Prep time must be a number between 0 and 1440 minutes' });
  }

  // Validate cook time
  if (typeof cookTime !== 'number' || cookTime < 0 || cookTime > 1440) {
    errors.push({ field: 'cookTime', message: 'Cook time must be a number between 0 and 1440 minutes' });
  }

  // Validate total time
  if (typeof totalTime !== 'number' || totalTime < 0 || totalTime > 1440) {
    errors.push({ field: 'totalTime', message: 'Total time must be a number between 0 and 1440 minutes' });
  }

  // Check if total time matches prep + cook time
  if (errors.length === 0 && totalTime !== (prepTime as number) + (cookTime as number)) {
    errors.push({ field: 'totalTime', message: 'Total time must equal prep time plus cook time' });
  }

  return {
    errors,
    prepTime: errors.length === 0 ? prepTime as number : undefined,
    cookTime: errors.length === 0 ? cookTime as number : undefined,
    totalTime: errors.length === 0 ? totalTime as number : undefined,
  };
}

/**
 * Validates tags array
 */
function validateTags(tags: unknown): {
  errors: RecipeValidationError[];
  sanitizedTags?: string[];
} {
  const errors: RecipeValidationError[] = [];

  if (!Array.isArray(tags)) {
    return { errors: [{ field: 'tags', message: 'Tags must be an array' }] };
  }

  if (tags.length > 20) {
    return { errors: [{ field: 'tags', message: 'Too many tags (max 20)' }] };
  }

  const sanitizedTags: string[] = [];

  tags.forEach((tag, index) => {
    if (typeof tag !== 'string') {
      errors.push({ field: `tags[${index}]`, message: 'Tag must be a string' });
      return;
    }

    const sanitizedTag = sanitizeText(tag, 30);
    if (sanitizedTag.length === 0) {
      errors.push({ field: `tags[${index}]`, message: 'Tag cannot be empty' });
      return;
    }

    if (!sanitizedTags.includes(sanitizedTag)) {
      sanitizedTags.push(sanitizedTag);
    }
  });

  return { errors, sanitizedTags: errors.length === 0 ? sanitizedTags : undefined };
}