import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  isFavorited,
  getFavoriteStatusForRecipes,
  updateFavorite,
  getFavoritesByMealType,
  getFavoritesCount
} from '../src/lib/favorites';
import type { Recipe } from '../src/types/database.types';

// Mock the @vercel/postgres module
vi.mock('@vercel/postgres', () => {
  const mockSql = vi.fn();
  Object.assign(mockSql, {
    query: vi.fn()
  });
  return {
    sql: mockSql
  };
});

// Import after mocking
const { sql } = await import('@vercel/postgres');

describe('Favorites Service', () => {
  const mockUserId = 'user-123';
  const mockRecipeId = 'recipe-456';
  
  const mockRecipe: Recipe = {
    id: mockRecipeId,
    name: 'Test Recipe',
    description: 'A test recipe',
    ingredients: [{ name: 'Test Ingredient', amount: 1, unit: 'cup' }],
    instructions: 'Test instructions',
    nutritionInfo: { calories: 200 },
    mealType: 'lunch',
    prepTime: 15,
    cookTime: 30,
    totalTime: 45,
    difficulty: 'medium',
    avgRating: 4.5,
    ratingCount: 10,
    tags: ['test'],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockFavoriteRecord = {
    user_id: mockUserId,
    recipe_id: mockRecipeId,
    personal_rating: 5,
    personal_notes: 'Great recipe!',
    added_at: new Date(),
    // Recipe fields
    id: mockRecipeId,
    created_by_user_id: null,
    name: 'Test Recipe',
    description: 'A test recipe',
    ingredients: [{ name: 'Test Ingredient', amount: 1, unit: 'cup' }],
    instructions: 'Test instructions',
    nutrition_info: { calories: 200 },
    cuisine: null,
    meal_type: 'lunch',
    prep_time: 15,
    cook_time: 30,
    total_time: 45,
    difficulty: 'medium',
    avg_rating: 4.5,
    rating_count: 10,
    image_url: null,
    tags: ['test'],
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful table creation
    vi.mocked(sql).mockResolvedValue({ rows: [], rowCount: 0 });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('addToFavorites', () => {
    it('should add a recipe to favorites successfully', async () => {
      // Mock table creation calls
      vi.mocked(sql)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // ALTER TABLE (constraint)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [mockFavoriteRecord], rowCount: 1 }); // SELECT

      const result = await addToFavorites(mockUserId, mockRecipeId, 5, 'Great recipe!');

      expect(result).toEqual({
        userId: mockUserId,
        recipeId: mockRecipeId,
        recipe: expect.objectContaining({
          id: mockRecipeId,
          name: 'Test Recipe'
        }),
        personalRating: 5,
        personalNotes: 'Great recipe!',
        addedAt: expect.any(Date)
      });
    });

    it('should throw error for empty user ID', async () => {
      await expect(addToFavorites('', mockRecipeId)).rejects.toThrow('User ID is required');
    });

    it('should throw error for empty recipe ID', async () => {
      await expect(addToFavorites(mockUserId, '')).rejects.toThrow('Recipe ID is required');
    });

    it('should throw error for invalid rating', async () => {
      await expect(addToFavorites(mockUserId, mockRecipeId, 6)).rejects.toThrow('Personal rating must be between 1 and 5');
    });
  });

  describe('removeFromFavorites', () => {
    it('should remove a recipe from favorites successfully', async () => {
      // Mock table creation calls
      vi.mocked(sql)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // ALTER TABLE (constraint)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // DELETE

      const result = await removeFromFavorites(mockUserId, mockRecipeId);

      expect(result).toBe(true);
    });

    it('should return false when favorite does not exist', async () => {
      // Mock table creation calls
      vi.mocked(sql)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // ALTER TABLE (constraint)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // DELETE

      const result = await removeFromFavorites(mockUserId, mockRecipeId);

      expect(result).toBe(false);
    });

    it('should throw error for empty user ID', async () => {
      await expect(removeFromFavorites('', mockRecipeId)).rejects.toThrow('User ID is required');
    });

    it('should throw error for empty recipe ID', async () => {
      await expect(removeFromFavorites(mockUserId, '')).rejects.toThrow('Recipe ID is required');
    });
  });

  describe('getUserFavorites', () => {
    it('should get user favorites with pagination', async () => {
      // Mock table creation calls
      vi.mocked(sql)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // ALTER TABLE (constraint)
        .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 }) // COUNT
        .mockResolvedValueOnce({ rows: [mockFavoriteRecord], rowCount: 1 }); // SELECT

      const result = await getUserFavorites(mockUserId, 10, 0);

      expect(result).toEqual({
        favorites: [expect.objectContaining({
          userId: mockUserId,
          recipeId: mockRecipeId,
          recipe: expect.objectContaining({
            id: mockRecipeId,
            name: 'Test Recipe'
          })
        })],
        total: 1
      });
    });

    it('should throw error for empty user ID', async () => {
      await expect(getUserFavorites('')).rejects.toThrow('User ID is required');
    });
  });

  describe('isFavorited', () => {
    it('should return true when recipe is favorited', async () => {
      // Mock table creation calls
      vi.mocked(sql)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // ALTER TABLE (constraint)
        .mockResolvedValueOnce({ rows: [{ exists: 1 }], rowCount: 1 }); // SELECT

      const result = await isFavorited(mockUserId, mockRecipeId);

      expect(result).toBe(true);
    });

    it('should return false when recipe is not favorited', async () => {
      // Mock table creation calls
      vi.mocked(sql)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // ALTER TABLE (constraint)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // SELECT

      const result = await isFavorited(mockUserId, mockRecipeId);

      expect(result).toBe(false);
    });

    it('should return false for empty user ID', async () => {
      const result = await isFavorited('', mockRecipeId);
      expect(result).toBe(false);
    });

    it('should return false for empty recipe ID', async () => {
      const result = await isFavorited(mockUserId, '');
      expect(result).toBe(false);
    });
  });

  describe('getFavoriteStatusForRecipes', () => {
    it('should return favorite status for multiple recipes', async () => {
      const recipeIds = ['recipe-1', 'recipe-2', 'recipe-3'];
      
      // Mock table creation calls
      vi.mocked(sql)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ALTER TABLE (constraint)

      // Mock the query method for the IN clause
      vi.mocked(sql.query).mockResolvedValueOnce({
        rows: [{ recipe_id: 'recipe-1' }, { recipe_id: 'recipe-3' }],
        rowCount: 2
      });

      const result = await getFavoriteStatusForRecipes(mockUserId, recipeIds);

      expect(result).toEqual({
        'recipe-1': true,
        'recipe-2': false,
        'recipe-3': true
      });
    });

    it('should return empty object for empty user ID', async () => {
      const result = await getFavoriteStatusForRecipes('', ['recipe-1']);
      expect(result).toEqual({});
    });

    it('should return empty object for empty recipe IDs', async () => {
      const result = await getFavoriteStatusForRecipes(mockUserId, []);
      expect(result).toEqual({});
    });
  });

  describe('updateFavorite', () => {
    it('should update favorite details successfully', async () => {
      // Mock table creation calls
      vi.mocked(sql)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // ALTER TABLE (constraint)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [mockFavoriteRecord], rowCount: 1 }); // SELECT

      const result = await updateFavorite(mockUserId, mockRecipeId, 4, 'Updated notes');

      expect(result).toEqual(expect.objectContaining({
        userId: mockUserId,
        recipeId: mockRecipeId,
        personalRating: 5, // From mock record
        personalNotes: 'Great recipe!' // From mock record
      }));
    });

    it('should return null when favorite does not exist', async () => {
      // Mock table creation calls
      vi.mocked(sql)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // ALTER TABLE (constraint)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // UPDATE

      const result = await updateFavorite(mockUserId, mockRecipeId, 4, 'Updated notes');

      expect(result).toBeNull();
    });

    it('should throw error for invalid rating', async () => {
      await expect(updateFavorite(mockUserId, mockRecipeId, 6)).rejects.toThrow('Personal rating must be between 1 and 5');
    });
  });

  describe('getFavoritesByMealType', () => {
    it('should get favorites filtered by meal type', async () => {
      // Mock table creation calls
      vi.mocked(sql)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // ALTER TABLE (constraint)
        .mockResolvedValueOnce({ rows: [mockFavoriteRecord], rowCount: 1 }); // SELECT

      const result = await getFavoritesByMealType(mockUserId, 'lunch');

      expect(result).toEqual([expect.objectContaining({
        userId: mockUserId,
        recipeId: mockRecipeId,
        recipe: expect.objectContaining({
          mealType: 'lunch'
        })
      })]);
    });

    it('should throw error for invalid meal type', async () => {
      await expect(getFavoritesByMealType(mockUserId, 'invalid' as any)).rejects.toThrow('Invalid meal type');
    });
  });

  describe('getFavoritesCount', () => {
    it('should return favorites count for user', async () => {
      // Mock table creation calls
      vi.mocked(sql)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // ALTER TABLE (constraint)
        .mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 }); // SELECT COUNT

      const result = await getFavoritesCount(mockUserId);

      expect(result).toBe(5);
    });

    it('should return 0 for empty user ID', async () => {
      const result = await getFavoritesCount('');
      expect(result).toBe(0);
    });

    it('should return 0 on database error', async () => {
      // Mock table creation calls
      vi.mocked(sql)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE INDEX
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // ALTER TABLE (constraint)
        .mockRejectedValueOnce(new Error('Database error')); // SELECT COUNT

      const result = await getFavoritesCount(mockUserId);

      expect(result).toBe(0);
    });
  });
});