"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Search, Clock, ChefHat, Edit, Trash2, MoreVertical, Eye } from 'lucide-react';
import AIRecipeGeneratorDialog from '@/components/meal-plan/dialogs/AIRecipeGeneratorDialog';
import RecipeDetailsDialog from '@/components/meal-plan/dialogs/RecipeDetailsDialog';
import { DjangoRecipeService } from '@/lib/django-recipe-service';
import type { Recipe } from '@/types/database.types';

export default function RecipesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<{ id: string; name: string } | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isRecipeDetailsOpen, setIsRecipeDetailsOpen] = useState(false);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      console.log('Current user:', user);
      const response = await DjangoRecipeService.getUserRecipes({
        page_size: 50,
        ordering: '-created_at'
      });

      console.log('Raw recipes response:', response);

      // Check if response has the expected structure
      if (!response || !response.results || !Array.isArray(response.results)) {
        console.error('Invalid response structure:', response);
        setRecipes([]);
        return;
      }

      console.log('Total user recipes from API:', response.results.length);
      console.log('Current user ID:', user?.id);

      // Verify recipes are filtered correctly (debug log)
      response.results.forEach(recipe => {
        console.log(`Recipe "${recipe.name}": created_by_user_id=${recipe.created_by_user_id}, current_user=${user?.id}`);
      });

      // Convert Django recipes to database format
      const convertedRecipes: Recipe[] = response.results.map(recipe => ({
        id: recipe.id,
        createdByUserId: recipe.created_by_user_id,
        name: recipe.name,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        nutritionInfo: recipe.nutrition_info || {},
        cuisine: recipe.cuisine,
        prepTime: recipe.prep_time || 0,
        cookTime: recipe.cook_time || 0,
        totalTime: (recipe.prep_time || 0) + (recipe.cook_time || 0),
        difficulty: recipe.difficulty || 'medium',
        avgRating: Number(recipe.avg_rating) || 0,
        ratingCount: Number(recipe.rating_count) || 0,
        imageUrl: recipe.image_url,
        tags: recipe.tags || [],
        createdAt: recipe.created_at ? new Date(recipe.created_at) : new Date(),
        updatedAt: recipe.updated_at ? new Date(recipe.updated_at) : new Date()
      }));

      setRecipes(convertedRecipes);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setRecipes([]); // Set empty array on error
      toast({
        title: 'Error',
        description: 'Failed to load recipes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecipeGenerated = (newRecipe: Recipe) => {
    setRecipes(prev => [newRecipe, ...prev]);
    toast({
      title: 'Recipe Added',
      description: `"${newRecipe.name}" has been added to your recipes.`,
    });
  };

  const handleDeleteClick = (recipeId: string, recipeName: string) => {
    setRecipeToDelete({ id: recipeId, name: recipeName });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recipeToDelete) return;

    try {
      await DjangoRecipeService.deleteRecipe(recipeToDelete.id);
      setRecipes(prev => prev.filter(recipe => recipe.id !== recipeToDelete.id));
      toast({
        title: 'Recipe Deleted',
        description: `"${recipeToDelete.name}" has been deleted.`,
      });
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete recipe',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setRecipeToDelete(null);
    }
  };

  const handleEditRecipe = () => {
    // TODO: Implement edit functionality
    toast({
      title: 'Edit Recipe',
      description: 'Edit functionality coming soon!',
    });
  };

  const handleViewRecipeDetails = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsRecipeDetailsOpen(true);
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (recipe.tags && Array.isArray(recipe.tags) && recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const formatIngredientsText = (ingredients: any[]): string => {
    if (!ingredients || !Array.isArray(ingredients)) {
      return 'No ingredients listed';
    }
    return ingredients.map(ing => {
      if (typeof ing === 'string') {
        return ing;
      }
      return ing.name || 'Unknown ingredient';
    }).join('\n');
  };

  const formatInstructionsMarkdown = (instructions: string): string => {
    if (!instructions) return '';
    
    // Simple markdown-like formatting
    return instructions
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>') // H3
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>') // H2
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>') // H1
      .replace(/^\d+\.\s/gm, '<br/>$&') // Numbered lists
      .replace(/^-\s/gm, '<br/>• ') // Bullet points
      .replace(/\n/g, '<br/>'); // Line breaks
  };

  const formatNutritionInfo = (nutritionInfo: any) => {
    if (!nutritionInfo || typeof nutritionInfo !== 'object') {
      return null;
    }
    
    const nutrients = [];
    if (nutritionInfo.calories) nutrients.push(`${nutritionInfo.calories} cal`);
    if (nutritionInfo.protein) nutrients.push(`${nutritionInfo.protein}g protein`);
    if (nutritionInfo.carbs) nutrients.push(`${nutritionInfo.carbs}g carbs`);
    if (nutritionInfo.fat) nutrients.push(`${nutritionInfo.fat}g fat`);
    if (nutritionInfo.fiber) nutrients.push(`${nutritionInfo.fiber}g fiber`);
    if (nutritionInfo.sugar) nutrients.push(`${nutritionInfo.sugar}g sugar`);
    if (nutritionInfo.sodium) nutrients.push(`${nutritionInfo.sodium}mg sodium`);
    
    return nutrients;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading recipes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Recipes</h1>
          <p className="text-gray-600 mt-1">Manage your recipe collection and generate new ones with AI</p>
        </div>
        <Button onClick={() => setIsAIDialogOpen(true)} className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Generate with AI
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search recipes by name, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          <ChefHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            {searchQuery ? 'No recipes found' : 'No recipes yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Start building your recipe collection by generating recipes with AI'
            }
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsAIDialogOpen(true)} className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Your First Recipe
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map((recipe) => (
            <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{recipe.name}</CardTitle>
                    {recipe.description && (
                      <CardDescription className="mt-2">
                        {recipe.description}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewRecipeDetails(recipe)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Full Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditRecipe()}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Recipe
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(recipe.id, recipe.name)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Recipe
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-sm">
                    {recipe.difficulty}
                  </Badge>
                  {recipe.cuisine && (
                    <Badge variant="outline" className="text-sm">
                      {recipe.cuisine}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    Prep: {recipe.prepTime}min | Cook: {recipe.cookTime}min
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-2">
                  {/* Tags - Limited */}
                  {recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recipe.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {recipe.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{recipe.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Nutrition Information - Very Compact */}
                  {formatNutritionInfo(recipe.nutritionInfo) && formatNutritionInfo(recipe.nutritionInfo)!.length > 0 && (
                    <div className="grid grid-cols-2 gap-1">
                      {formatNutritionInfo(recipe.nutritionInfo)!.slice(0, 2).map((nutrient, index) => (
                        <div key={index} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          {nutrient}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recipe Metadata */}
                  <div className="pt-1 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      <span>Created: {recipe.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AIRecipeGeneratorDialog
        isOpen={isAIDialogOpen}
        onClose={() => setIsAIDialogOpen(false)}
        onRecipeGenerated={handleRecipeGenerated}
      />

      <RecipeDetailsDialog
        isOpen={isRecipeDetailsOpen}
        recipe={selectedRecipe}
        onClose={() => {
          setIsRecipeDetailsOpen(false);
          setSelectedRecipe(null);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{recipeToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Recipe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}