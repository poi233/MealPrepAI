import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  updateRecipeFixed, 
  getRecipesByUserId, 
  deleteRecipe, 
  isRecipeUsedInMealPlans,
  removeRecipeFromMealPlans 
} from '@/lib/recipes';
import type { Recipe } from '@/types/database.types';

// Mock the @vercel/postgres module
vi.mock('@vercel/postgres', () => ({
  sql: vi.fn()
}));

// Mock the getRecipeById function
vi.mock('@/lib/recipes', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    getRecipeById: vi.fn()
  };
});

import { sql } from '@vercel/postgres';
import { getRecipeById } from '@/lib/recipes';

const mockSql = sql as any;
const mockGetRecipeById = getRecipeById as any;

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

const mockRecipeRecord = {
  id: '1',
  created_by_user_id: 'user-1',
  name: 'Test Recipe',
  description: 'A test recipe',
  ingredients: [
    { name: 'Flour', amount: 2, unit: 'cups' },
    { name: 'Sugar', amount: 1, unit: 'cup' }
  ],
  instructions: 'Mix ingredients and bake',
  nutrition_info: { calories: 300, protein: 10 },
  cuisine: 'American',
  meal_type: 'dinner',
  prep_time: 15,
  cook_time: 30,
  total_time: 45,
  difficulty: 'easy',
  avg_rating: 4.5,
  rating_count: 10,
  image_url: 'https://example.com/image.jpg',
  tags: ['easy', 'quick'],
  created_at: new Date(),
  updated_at: new Date()
};

describe('Recipe CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateRecipeFixed', () => {
    it('should update a recipe successfully', async () => {
      mockGetRecipeById.mockResolvedValue(mockRecipe);
      mockSql.mockResolvedValue({
        rows: [mockRecipeRecord]
      });

      const updates = { name: 'Updated Recipe', prepTime: 20 };
      const result = await updateRecipeFixed('1', updates);

      expect(mockGetRecipeById).toHaveBeenCalledWith('1');
      expect(result.name).toBe('Test Recipe'); // From mock record
      expect(result.id).toBe('1');
    });

    it('should throw error when recipe not found', async () => {
      mockGetRecipeById.mockResolvedValue(null);

      await expect(updateRecipeFixed('999', { name: 'Updated' })).rejects.toThrow('Recipe not found');
    });

    it('should throw error when no recipe ID provided', async () => {
      await expect(updateRecipeFixed('', { name: 'Updated' })).rejects.toThrow('Recipe ID is required');
    });

    it('should throw error when no fields to update', async () => {
      mockGetRecipeById.mockResolvedValue(mockRecipe);

      await expect(updateRecipeFixed('1', {})).rejects.toThrow('No fields to update');
    });

    it('should handle database errors gracefully', async () => {
      mockGetRecipeById.mockResolvedValue(mockRecipe);
      mockSql.mockRejectedValue(new Error('Database connection failed'));

      await expect(updateRecipeFixed('1', { name: 'Updated' })).rejects.toThrow('Failed to update recipe');
    });
  });

  describe('getRecipesByUserId', () => {
    it('should fetch user recipes successfully', async () => {
      mockSql
        .mockResolvedValueOnce({ rows: [{ total: '2' }] }) // Count query
        .mockResolvedValueOnce({ rows: [mockRecipeRecord, mockRecipeRecord] }); // Data query

      const result = await getRecipesByUserId('user-1', 10, 0);

      expect(result.total).toBe(2);
      expect(result.recipes).toHaveLength(2);
      expect(result.recipes[0].id).toBe('1');
    });

    it('should throw error when no user ID provided', async () => {
      await expect(getRecipesByUserId('', 10, 0)).rejects.toThrow('User ID is required');
    });

    it('should handle database errors gracefully', async () => {
      mockSql.mockRejectedValue(new Error('Database connection failed'));

      await expect(getRecipesByUserId('user-1')).rejects.toThrow('Failed to retrieve recipes for user');
    });
  });

  describe('isRecipeUsedInMealPlans', () => {
    it('should return true when recipe is used in meal plans', async () => {
      mockSql.mockResolvedValue({ rows: [{ count: '3' }] });

      const result = await isRecipeUsedInMealPlans('1');

      expect(result).toBe(true);
    });

    it('should return false when recipe is not used in meal plans', async () => {
      mockSql.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await isRecipeUsedInMealPlans('1');

      expect(result).toBe(false);
    });

    it('should return false when no recipe ID provided', async () => {
      const result = await isRecipeUsedInMealPlans('');

      expect(result).toBe(false);
    });

    it('should return true on database error (safe default)', async () => {
      mockSql.mockRejectedValue(new Error('Database error'));

      const result = await isRecipeUsedInMealPlans('1');

      expect(result).toBe(true);
    });
  });

  describe('removeRecipeFromMealPlans', () => {
    it('should remove recipe from meal plans successfully', async () => {
      mockSql.mockResolvedValue({ rowCount: 2 });

      await removeRecipeFromMealPlans('1');

      expect(mockSql).toHaveBeenCalledWith(expect.anything());
    });

    it('should handle empty recipe ID gracefully', async () => {
      await removeRecipeFromMealPlans('');

      expect(mockSql).not.toHaveBeenCalled();
    });

    it('should throw error on database failure', async () => {
      mockSql.mockRejectedValue(new Error('Database error'));

      await expect(removeRecipeFromMealPlans('1')).rejects.toThrow('Failed to remove recipe from meal plans');
    });
  });

  describe('deleteRecipe', () => {
    beforeEach(() => {
      // Mock the functions that deleteRecipe depends on
      vi.mocked(isRecipeUsedInMealPlans).mockResolvedValue(false);
      vi.mocked(removeRecipeFromMealPlans).mockResolvedValue();
    });

    it('should delete a recipe successfully when not used in meal plans', async () => {
      mockSql.mockResolvedValueOnce({ rows: [mockRecipeRecord] }); // Recipe exists check
      mockSql.mockResolvedValueOnce({ rowCount: 1 }); // Delete query

      await deleteRecipe('1');

      expect(mockSql).toHaveBeenCalledTimes(2);
    });

    it('should throw error when recipe not found', async () => {
      mockSql.mockResolvedValue({ rows: [] });

      await expect(deleteRecipe('999')).rejects.toThrow('Recipe not found');
    });

    it('should throw error when no recipe ID provided', async () => {
      await expect(deleteRecipe('')).rejects.toThrow('Recipe ID is required');
    });

    it('should throw error when recipe is used in meal plans without force option', async () => {
      mockSql.mockResolvedValueOnce({ rows: [mockRecipeRecord] }); // Recipe exists
      vi.mocked(isRecipeUsedInMealPlans).mockResolvedValue(true);

      await expect(deleteRecipe('1')).rejects.toThrow('Recipe is currently used in meal plans');
    });

    it('should delete recipe and remove from meal plans when force option is used', async () => {
      mockSql.mockResolvedValueOnce({ rows: [mockRecipeRecord] }); // Recipe exists
      mockSql.mockResolvedValueOnce({ rowCount: 1 }); // Delete query
      vi.mocked(isRecipeUsedInMealPlans).mockResolvedValue(true);

      await deleteRecipe('1', { removeFromMealPlans: true });

      expect(removeRecipeFromMealPlans).toHaveBeenCalledWith('1');
    });

    it('should handle database errors gracefully', async () => {
      mockSql.mockResolvedValueOnce({ rows: [mockRecipeRecord] }); // Recipe exists
      mockSql.mockRejectedValueOnce(new Error('Database error')); // Delete fails

      await expect(deleteRecipe('1')).rejects.toThrow('Failed to delete recipe');
    });
  });
});