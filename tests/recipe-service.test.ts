import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecipeService } from '@/lib/recipe-service';
import type { Recipe } from '@/types/database.types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location for browser-specific code
Object.defineProperty(global, 'window', {
  value: {
    location: {
      origin: 'http://localhost:3000'
    }
  },
  writable: true
});

// Mock recipe data
const mockRecipe: Recipe = {
  id: '1',
  createdByUserId: 'user-1',
  name: 'Test Recipe',
  description: 'A test recipe',
  ingredients: [
    { name: 'Flour', amount: 2, unit: 'cups' },
    { name: 'Sugar', amount: 1, unit: 'cup' }
  ],
  instructions: 'Mix ingredients and bake',
  nutritionInfo: { calories: 300, protein: 10 },
  cuisine: 'American',
  mealType: 'dinner',
  prepTime: 15,
  cookTime: 30,
  totalTime: 45,
  difficulty: 'easy',
  avgRating: 4.5,
  ratingCount: 10,
  imageUrl: 'https://example.com/image.jpg',
  tags: ['easy', 'quick'],
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('RecipeService', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('getRecipe', () => {
    it('should fetch a recipe by ID successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecipe
      });

      const result = await RecipeService.getRecipe('1');

      expect(mockFetch).toHaveBeenCalledWith('/api/recipes/1');
      expect(result).toEqual(mockRecipe);
    });

    it('should throw error when recipe not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Recipe not found' })
      });

      await expect(RecipeService.getRecipe('999')).rejects.toThrow('Recipe not found');
    });
  });

  describe('updateRecipe', () => {
    const updateData = {
      name: 'Updated Recipe',
      description: 'Updated description',
      prepTime: 20
    };

    it('should update a recipe successfully', async () => {
      const updatedRecipe = { ...mockRecipe, ...updateData };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedRecipe
      });

      const result = await RecipeService.updateRecipe('1', updateData);

      expect(mockFetch).toHaveBeenCalledWith('/api/recipes/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      expect(result).toEqual(updatedRecipe);
    });

    it('should throw error when update fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Update failed' })
      });

      await expect(RecipeService.updateRecipe('1', updateData)).rejects.toThrow('Update failed');
    });
  });

  describe('deleteRecipe', () => {
    it('should delete a recipe successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Recipe deleted successfully' })
      });

      await RecipeService.deleteRecipe('1');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/recipes/1', {
        method: 'DELETE',
      });
    });

    it('should delete a recipe with removeFromMealPlans option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Recipe deleted successfully' })
      });

      await RecipeService.deleteRecipe('1', { removeFromMealPlans: true });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/recipes/1?removeFromMealPlans=true', {
        method: 'DELETE',
      });
    });

    it('should handle conflict error when recipe is used in meal plans', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ 
          error: 'Recipe is currently used in meal plans', 
          canForceDelete: true 
        })
      });

      try {
        await RecipeService.deleteRecipe('1');
      } catch (error: any) {
        expect(error.message).toBe('Recipe is currently used in meal plans');
        expect(error.canForceDelete).toBe(true);
      }
    });

    it('should throw error when delete fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Delete failed' })
      });

      await expect(RecipeService.deleteRecipe('1')).rejects.toThrow('Delete failed');
    });
  });

  describe('getUserRecipes', () => {
    it('should fetch user recipes successfully', async () => {
      const mockResponse = { recipes: [mockRecipe], total: 1 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await RecipeService.getUserRecipes(10, 0);

      expect(mockFetch).toHaveBeenCalledWith('/api/recipes?userOnly=true&limit=10&offset=0');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('canEditRecipe', () => {
    it('should return true when user owns the recipe', () => {
      const result = RecipeService.canEditRecipe(mockRecipe, 'user-1');
      expect(result).toBe(true);
    });

    it('should return false when user does not own the recipe', () => {
      const result = RecipeService.canEditRecipe(mockRecipe, 'user-2');
      expect(result).toBe(false);
    });

    it('should return false when recipe has no creator', () => {
      const recipeWithoutCreator = { ...mockRecipe, createdByUserId: undefined };
      const result = RecipeService.canEditRecipe(recipeWithoutCreator, 'user-1');
      expect(result).toBe(false);
    });

    it('should return false when no current user ID provided', () => {
      const result = RecipeService.canEditRecipe(mockRecipe, undefined);
      expect(result).toBe(false);
    });
  });

  describe('validateRecipeData', () => {
    it('should return no errors for valid data', () => {
      const validData = {
        name: 'Valid Recipe',
        ingredients: [{ name: 'Flour', amount: 1, unit: 'cup' }],
        instructions: 'Mix and bake',
        mealType: 'dinner' as const,
        difficulty: 'easy' as const,
        prepTime: 15,
        cookTime: 30
      };

      const errors = RecipeService.validateRecipeData(validData);
      expect(errors).toEqual([]);
    });

    it('should return error for empty name', () => {
      const invalidData = { name: '' };
      const errors = RecipeService.validateRecipeData(invalidData);
      expect(errors).toContain('Recipe name is required');
    });

    it('should return error for empty ingredients', () => {
      const invalidData = { ingredients: [] };
      const errors = RecipeService.validateRecipeData(invalidData);
      expect(errors).toContain('Recipe must have at least one ingredient');
    });

    it('should return error for empty instructions', () => {
      const invalidData = { instructions: '' };
      const errors = RecipeService.validateRecipeData(invalidData);
      expect(errors).toContain('Recipe instructions are required');
    });

    it('should return error for invalid meal type', () => {
      const invalidData = { mealType: 'invalid' as any };
      const errors = RecipeService.validateRecipeData(invalidData);
      expect(errors).toContain('Invalid meal type');
    });

    it('should return error for invalid difficulty', () => {
      const invalidData = { difficulty: 'invalid' as any };
      const errors = RecipeService.validateRecipeData(invalidData);
      expect(errors).toContain('Invalid difficulty level');
    });

    it('should return error for negative prep time', () => {
      const invalidData = { prepTime: -5 };
      const errors = RecipeService.validateRecipeData(invalidData);
      expect(errors).toContain('Prep time cannot be negative');
    });

    it('should return error for negative cook time', () => {
      const invalidData = { cookTime: -10 };
      const errors = RecipeService.validateRecipeData(invalidData);
      expect(errors).toContain('Cook time cannot be negative');
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const invalidData = {
        name: '',
        ingredients: [],
        instructions: '',
        prepTime: -5
      };

      const errors = RecipeService.validateRecipeData(invalidData);
      expect(errors).toHaveLength(4);
      expect(errors).toContain('Recipe name is required');
      expect(errors).toContain('Recipe must have at least one ingredient');
      expect(errors).toContain('Recipe instructions are required');
      expect(errors).toContain('Prep time cannot be negative');
    });
  });
});