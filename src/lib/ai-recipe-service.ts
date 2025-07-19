/**
 * @fileOverview AI recipe creation service that combines generation, validation, and error handling.
 */

import { generateCompleteRecipe, type GenerateCompleteRecipeInput } from '@/ai/flows/generate-complete-recipe';
import { validateAndSanitizeRecipe, type RecipeValidationError } from '@/lib/recipe-validation';
import type { Recipe } from '@/types/database.types';
import { v4 as uuidv4 } from 'uuid';

export interface CreateRecipeWithAIInput {
  recipeName: string;
  cuisine?: string;
  dietaryRestrictions?: string[];
  servings?: number;
  createdByUserId?: string;
}

export interface CreateRecipeWithAIResult {
  success: boolean;
  recipe?: Recipe;
  errors?: RecipeValidationError[];
  message?: string;
}

export class AIRecipeGenerationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors?: RecipeValidationError[],
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AIRecipeGenerationError';
  }
}

/**
 * Creates a complete, validated Recipe object using AI generation
 */
export async function createRecipeWithAI(
  input: CreateRecipeWithAIInput
): Promise<CreateRecipeWithAIResult> {
  try {
    // Validate input
    const inputValidation = validateInput(input);
    if (!inputValidation.isValid) {
      return {
        success: false,
        errors: inputValidation.errors,
        message: 'Invalid input parameters',
      };
    }

    // Generate recipe using AI
    const aiInput: GenerateCompleteRecipeInput = {
      recipeName: input.recipeName,
      cuisine: input.cuisine,
      dietaryRestrictions: input.dietaryRestrictions || [],
      servings: input.servings || 4,
    };

    const aiRecipe = await generateCompleteRecipe(aiInput);

    // Validate and sanitize the AI-generated recipe
    const validation = validateAndSanitizeRecipe(aiRecipe, input.createdByUserId);
    
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        message: 'AI generated invalid recipe data',
      };
    }

    // Create complete Recipe object with generated ID
    const recipe: Recipe = {
      id: uuidv4(),
      ...validation.sanitizedRecipe!,
    } as Recipe;

    return {
      success: true,
      recipe,
    };

  } catch (error) {
    console.error('Error creating recipe with AI:', error);
    
    if (error instanceof AIRecipeGenerationError) {
      return {
        success: false,
        errors: error.validationErrors,
        message: error.message,
      };
    }

    return {
      success: false,
      message: `Failed to generate recipe: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validates input parameters for recipe generation
 */
function validateInput(input: CreateRecipeWithAIInput): {
  isValid: boolean;
  errors: RecipeValidationError[];
} {
  const errors: RecipeValidationError[] = [];

  // Validate recipe name
  if (!input.recipeName || typeof input.recipeName !== 'string') {
    errors.push({ field: 'recipeName', message: 'Recipe name is required and must be a string' });
  } else if (input.recipeName.trim().length === 0) {
    errors.push({ field: 'recipeName', message: 'Recipe name cannot be empty' });
  } else if (input.recipeName.length > 200) {
    errors.push({ field: 'recipeName', message: 'Recipe name is too long (max 200 characters)' });
  }

  // Validate cuisine if provided
  if (input.cuisine && (typeof input.cuisine !== 'string' || input.cuisine.length > 50)) {
    errors.push({ field: 'cuisine', message: 'Cuisine must be a string with max 50 characters' });
  }

  // Validate dietary restrictions if provided
  if (input.dietaryRestrictions) {
    if (!Array.isArray(input.dietaryRestrictions)) {
      errors.push({ field: 'dietaryRestrictions', message: 'Dietary restrictions must be an array' });
    } else if (input.dietaryRestrictions.length > 10) {
      errors.push({ field: 'dietaryRestrictions', message: 'Too many dietary restrictions (max 10)' });
    } else {
      input.dietaryRestrictions.forEach((restriction, index) => {
        if (typeof restriction !== 'string' || restriction.trim().length === 0) {
          errors.push({ 
            field: `dietaryRestrictions[${index}]`, 
            message: 'Dietary restriction must be a non-empty string' 
          });
        }
      });
    }
  }

  // Validate servings if provided
  if (input.servings !== undefined) {
    if (typeof input.servings !== 'number' || input.servings < 1 || input.servings > 20) {
      errors.push({ field: 'servings', message: 'Servings must be a number between 1 and 20' });
    }
  }

  // Validate createdByUserId if provided
  if (input.createdByUserId && typeof input.createdByUserId !== 'string') {
    errors.push({ field: 'createdByUserId', message: 'Created by user ID must be a string' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Batch creates multiple recipes with AI
 */
export async function createMultipleRecipesWithAI(
  inputs: CreateRecipeWithAIInput[]
): Promise<CreateRecipeWithAIResult[]> {
  if (inputs.length > 10) {
    throw new AIRecipeGenerationError('Cannot generate more than 10 recipes at once');
  }

  const results = await Promise.allSettled(
    inputs.map(input => createRecipeWithAI(input))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        success: false,
        message: `Failed to generate recipe ${index + 1}: ${result.reason}`,
      };
    }
  });
}

/**
 * Retries recipe generation with fallback options
 */
export async function createRecipeWithAIRetry(
  input: CreateRecipeWithAIInput,
  maxRetries: number = 2
): Promise<CreateRecipeWithAIResult> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await createRecipeWithAI(input);
      
      if (result.success) {
        return result;
      }

      // If validation failed, try with simplified input
      if (attempt < maxRetries && result.errors) {
        const simplifiedInput = {
          ...input,
          dietaryRestrictions: input.dietaryRestrictions?.slice(0, 3), // Limit restrictions
          cuisine: undefined, // Remove cuisine constraint
        };
        
        console.warn(`Recipe generation attempt ${attempt + 1} failed, retrying with simplified input`);
        continue;
      }

      return result;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        break;
      }
      
      console.warn(`Recipe generation attempt ${attempt + 1} failed, retrying...`, error);
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return {
    success: false,
    message: `Failed to generate recipe after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`,
  };
}