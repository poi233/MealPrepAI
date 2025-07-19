/**
 * @fileOverview Unit tests for AI recipe generation flow
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createRecipeWithAI, createMultipleRecipesWithAI, createRecipeWithAIRetry, AIRecipeGenerationError } from '@/lib/ai-recipe-service';
import { validateAndSanitizeRecipe } from '@/lib/recipe-validation';
import { generateCompleteRecipe } from '@/ai/flows/generate-complete-recipe';
import type { GenerateCompleteRecipeOutput } from '@/ai/flows/generate-complete-recipe';
import type { Recipe } from '@/types/database.types';

// Mock the AI flow
vi.mock('@/ai/flows/generate-complete-recipe', () => ({
  generateCompleteRecipe: vi.fn(),
}));

// Mock UUID generation
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123'),
}));

const mockGenerateCompleteRecipe = generateCompleteRecipe as Mock;

// Shared test data
const validAIResponse: GenerateCompleteRecipeOutput = {
  name: 'Chicken Stir Fry',
  description: 'A delicious and healthy chicken stir fry',
  ingredients: [
    { name: 'chicken breast', amount: 1, unit: 'lb', notes: 'diced' },
    { name: 'soy sauce', amount: 2, unit: 'tbsp' },
    { name: 'vegetables', amount: 2, unit: 'cups', notes: 'mixed' },
  ],
  instructions: '1. Heat oil in pan\n2. Cook chicken\n3. Add vegetables\n4. Stir fry for 5 minutes',
  nutritionInfo: {
    calories: 350,
    protein: 30,
    carbs: 15,
    fat: 12,
    fiber: 3,
    sugar: 8,
    sodium: 800,
  },
  cuisine: 'Asian',
  mealType: 'dinner',
  prepTime: 15,
  cookTime: 10,
  totalTime: 25,
  difficulty: 'easy',
  tags: ['healthy', 'quick', 'protein-rich'],
};

describe('AI Recipe Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRecipeWithAI', () => {
    const validAIResponseLocal: GenerateCompleteRecipeOutput = {
      ...validAIResponse,
    };

    it('should successfully create a recipe with valid input', async () => {
      mockGenerateCompleteRecipe.mockResolvedValue(validAIResponseLocal);

      const result = await createRecipeWithAI({
        recipeName: 'Chicken Stir Fry',
        mealType: 'dinner',
        cuisine: 'Asian',
        servings: 4,
      });

      expect(result.success).toBe(true);
      expect(result.recipe).toBeDefined();
      expect(result.recipe?.id).toBe('test-uuid-123');
      expect(result.recipe?.name).toBe('Chicken Stir Fry');
      expect(result.recipe?.mealType).toBe('dinner');
      expect(result.recipe?.avgRating).toBe(0);
      expect(result.recipe?.ratingCount).toBe(0);
      expect(result.errors).toBeUndefined();
    });

    it('should handle invalid input parameters', async () => {
      const result = await createRecipeWithAI({
        recipeName: null as any, // Invalid type
        mealType: 'dinner',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].field).toBe('recipeName');
      expect(result.errors?.[0].message).toContain('Recipe name is required');
    });

    it('should handle AI generation failure', async () => {
      mockGenerateCompleteRecipe.mockRejectedValue(new Error('AI service unavailable'));

      const result = await createRecipeWithAI({
        recipeName: 'Test Recipe',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to generate recipe');
    });

    it('should handle invalid AI response', async () => {
      const invalidResponse = {
        ...validAIResponseLocal,
        ingredients: 'invalid', // Should be array
        prepTime: -5, // Should be positive
      };

      mockGenerateCompleteRecipe.mockResolvedValue(invalidResponse);

      const result = await createRecipeWithAI({
        recipeName: 'Test Recipe',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.message).toBe('AI generated invalid recipe data');
    });

    it('should validate meal type', async () => {
      const result = await createRecipeWithAI({
        recipeName: 'Test Recipe',
        mealType: 'invalid' as any,
      });

      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe('mealType');
    });

    it('should validate dietary restrictions', async () => {
      const result = await createRecipeWithAI({
        recipeName: 'Test Recipe',
        dietaryRestrictions: Array(15).fill('restriction'), // Too many
      });

      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe('dietaryRestrictions');
      expect(result.errors?.[0].message).toContain('Too many');
    });

    it('should validate servings range', async () => {
      const result = await createRecipeWithAI({
        recipeName: 'Test Recipe',
        servings: 25, // Too many
      });

      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe('servings');
    });

    it('should include createdByUserId when provided', async () => {
      mockGenerateCompleteRecipe.mockResolvedValue(validAIResponseLocal);

      const result = await createRecipeWithAI({
        recipeName: 'Test Recipe',
        createdByUserId: 'user-123',
      });

      expect(result.success).toBe(true);
      expect(result.recipe?.createdByUserId).toBe('user-123');
    });
  });

  describe('createMultipleRecipesWithAI', () => {
    it('should create multiple recipes successfully', async () => {
      mockGenerateCompleteRecipe.mockResolvedValue(validAIResponse);

      const inputs = [
        { recipeName: 'Recipe 1' },
        { recipeName: 'Recipe 2' },
      ];

      const results = await createMultipleRecipesWithAI(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle partial failures', async () => {
      mockGenerateCompleteRecipe
        .mockResolvedValueOnce(validAIResponse)
        .mockRejectedValueOnce(new Error('AI failure'));

      const inputs = [
        { recipeName: 'Recipe 1' },
        { recipeName: 'Recipe 2' },
      ];

      const results = await createMultipleRecipesWithAI(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('should reject too many recipes', async () => {
      const inputs = Array(15).fill({ recipeName: 'Test' });

      await expect(createMultipleRecipesWithAI(inputs)).rejects.toThrow(
        'Cannot generate more than 10 recipes at once'
      );
    });
  });

  describe('createRecipeWithAIRetry', () => {
    it('should succeed on first attempt', async () => {
      mockGenerateCompleteRecipe.mockResolvedValue(validAIResponse);

      const result = await createRecipeWithAIRetry({
        recipeName: 'Test Recipe',
      });

      expect(result.success).toBe(true);
      expect(mockGenerateCompleteRecipe).toHaveBeenCalledTimes(1);
    });

    it('should retry with simplified input on validation failure', async () => {
      const invalidResponse = { ...validAIResponse, ingredients: 'invalid' };
      
      mockGenerateCompleteRecipe
        .mockResolvedValueOnce(invalidResponse)
        .mockResolvedValueOnce(validAIResponse);

      const result = await createRecipeWithAIRetry({
        recipeName: 'Test Recipe',
        cuisine: 'Complex Cuisine',
        dietaryRestrictions: ['restriction1', 'restriction2', 'restriction3', 'restriction4'],
      });

      expect(result.success).toBe(true);
      expect(mockGenerateCompleteRecipe).toHaveBeenCalledTimes(2);
      
      // The function modifies the input internally, so we can't check the exact call parameters
      // But we can verify it was called twice, indicating retry logic worked
    });

    it('should fail after max retries', async () => {
      mockGenerateCompleteRecipe.mockRejectedValue(new Error('Persistent failure'));

      const result = await createRecipeWithAIRetry({
        recipeName: 'Test Recipe',
      }, 0); // Set maxRetries to 0 so it only tries once

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to generate recipe');
      expect(mockGenerateCompleteRecipe).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Recipe Validation', () => {
  const validAIRecipe: GenerateCompleteRecipeOutput = {
    name: 'Test Recipe',
    description: 'A test recipe',
    ingredients: [
      { name: 'flour', amount: 2, unit: 'cups' },
      { name: 'eggs', amount: 3, unit: 'pieces', notes: 'large' },
    ],
    instructions: '1. Mix ingredients\n2. Cook for 20 minutes',
    nutritionInfo: {
      calories: 300,
      protein: 15,
      carbs: 45,
      fat: 8,
    },
    cuisine: 'American',
    mealType: 'breakfast',
    prepTime: 10,
    cookTime: 20,
    totalTime: 30,
    difficulty: 'easy',
    tags: ['quick', 'breakfast'],
  };

  it('should validate a correct recipe', () => {
    const result = validateAndSanitizeRecipe(validAIRecipe);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sanitizedRecipe).toBeDefined();
    expect(result.sanitizedRecipe?.name).toBe('Test Recipe');
  });

  it('should reject recipe with missing name', () => {
    const invalidRecipe = { ...validAIRecipe, name: '' };
    const result = validateAndSanitizeRecipe(invalidRecipe);

    expect(result.isValid).toBe(false);
    expect(result.errors[0].field).toBe('name');
  });

  it('should reject recipe with invalid ingredients', () => {
    const invalidRecipe = { ...validAIRecipe, ingredients: 'not an array' as any };
    const result = validateAndSanitizeRecipe(invalidRecipe);

    expect(result.isValid).toBe(false);
    expect(result.errors[0].field).toBe('ingredients');
  });

  it('should reject recipe with negative cooking times', () => {
    const invalidRecipe = { ...validAIRecipe, prepTime: -5 };
    const result = validateAndSanitizeRecipe(invalidRecipe);

    expect(result.isValid).toBe(false);
    expect(result.errors[0].field).toBe('prepTime');
  });

  it('should reject recipe with mismatched total time', () => {
    const invalidRecipe = { ...validAIRecipe, totalTime: 100 }; // Should be 30
    const result = validateAndSanitizeRecipe(invalidRecipe);

    expect(result.isValid).toBe(false);
    expect(result.errors[0].field).toBe('totalTime');
  });

  it('should sanitize text content', () => {
    const recipeWithHtml = {
      ...validAIRecipe,
      name: '<script>alert("xss")</script>Clean Recipe Name',
      description: 'Recipe with <b>HTML</b> tags',
    };

    const result = validateAndSanitizeRecipe(recipeWithHtml);

    expect(result.isValid).toBe(true);
    expect(result.sanitizedRecipe?.name).toBe('Clean Recipe Name');
    expect(result.sanitizedRecipe?.description).toBe('Recipe with HTML tags');
  });

  it('should validate ingredient amounts', () => {
    const invalidRecipe = {
      ...validAIRecipe,
      ingredients: [
        { name: 'flour', amount: -2, unit: 'cups' }, // Negative amount
        { name: 'eggs', amount: 'three', unit: 'pieces' }, // Non-numeric amount
      ],
    };

    const result = validateAndSanitizeRecipe(invalidRecipe as any);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field.includes('amount'))).toBe(true);
  });

  it('should validate nutrition info', () => {
    const invalidRecipe = {
      ...validAIRecipe,
      nutritionInfo: {
        calories: -100, // Negative calories
        protein: 'high', // Non-numeric protein
      },
    };

    const result = validateAndSanitizeRecipe(invalidRecipe as any);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field.includes('nutritionInfo'))).toBe(true);
  });

  it('should validate tags', () => {
    const invalidRecipe = {
      ...validAIRecipe,
      tags: Array(25).fill('tag'), // Too many tags
    };

    const result = validateAndSanitizeRecipe(invalidRecipe);

    expect(result.isValid).toBe(false);
    expect(result.errors[0].field).toBe('tags');
    expect(result.errors[0].message).toContain('Too many');
  });

  it('should remove duplicate tags', () => {
    const recipeWithDuplicates = {
      ...validAIRecipe,
      tags: ['quick', 'easy', 'quick', 'breakfast', 'easy'],
    };

    const result = validateAndSanitizeRecipe(recipeWithDuplicates);

    expect(result.isValid).toBe(true);
    expect(result.sanitizedRecipe?.tags).toEqual(['quick', 'easy', 'breakfast']);
  });

  it('should set default values for new recipes', () => {
    const result = validateAndSanitizeRecipe(validAIRecipe, 'user-123');

    expect(result.isValid).toBe(true);
    expect(result.sanitizedRecipe?.createdByUserId).toBe('user-123');
    expect(result.sanitizedRecipe?.avgRating).toBe(0);
    expect(result.sanitizedRecipe?.ratingCount).toBe(0);
    expect(result.sanitizedRecipe?.createdAt).toBeInstanceOf(Date);
    expect(result.sanitizedRecipe?.updatedAt).toBeInstanceOf(Date);
  });
});