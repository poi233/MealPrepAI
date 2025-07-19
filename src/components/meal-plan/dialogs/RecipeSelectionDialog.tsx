"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Clock, Star, ChefHat } from "lucide-react";
import { getAllRecipes, getRecipesByMealType } from "@/lib/sample-recipes";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import RecipeCard from "@/components/meal-plan/cards/RecipeCard";
import type { Recipe } from "@/types/database.types";

interface RecipeSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe: (recipe: Recipe) => void;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dayName?: string;
}

export default function RecipeSelectionDialog({
  isOpen,
  onClose,
  onSelectRecipe,
  mealType,
  dayName
}: RecipeSelectionDialogProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string>(mealType || 'all');

  // Load recipes when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadRecipes();
    }
  }, [isOpen, selectedMealType]);

  // Filter recipes based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRecipes(recipes);
    } else {
      const filtered = recipes.filter(recipe =>
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.cuisine?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredRecipes(filtered);
    }
  }, [recipes, searchQuery]);

  const loadRecipes = async () => {
    setIsLoading(true);
    try {
      let loadedRecipes: Recipe[];
      if (selectedMealType === 'all') {
        loadedRecipes = await getAllRecipes();
      } else {
        loadedRecipes = await getRecipesByMealType(selectedMealType as any);
      }
      setRecipes(loadedRecipes);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    onSelectRecipe(recipe);
    onClose();
    setSearchQuery('');
  };

  const mealTypeOptions = [
    { value: 'all', label: 'All Meals' },
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snack' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Select Recipe
            {dayName && mealType && (
              <span className="text-muted-foreground font-normal">
                {' '}for {dayName} {mealType}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Choose a recipe to add to your meal plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              {mealTypeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={selectedMealType === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMealType(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Recipe List */}
          <div className="h-[400px] w-full overflow-y-auto">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredRecipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onSelect={handleSelectRecipe}
                    onRecipeUpdated={(updatedRecipe) => {
                      // Update the recipe in the local state
                      setRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
                    }}
                    onRecipeDeleted={(recipeId) => {
                      // Remove the recipe from the local state
                      setRecipes(prev => prev.filter(r => r.id !== recipeId));
                    }}
                    currentUserId={undefined} // TODO: Get current user ID from context
                    showActions={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No recipes found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}