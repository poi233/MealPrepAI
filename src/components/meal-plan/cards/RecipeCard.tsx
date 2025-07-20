"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Star, 
  ChefHat, 
  Edit3, 
  Trash2, 
  MoreVertical,
  User
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import RecipeEditDialog from "@/components/meal-plan/dialogs/RecipeEditDialog";
import type { Recipe } from "@/types/database.types";

interface RecipeCardProps {
  recipe: Recipe;
  onSelect?: (recipe: Recipe) => void;
  onRecipeUpdated?: (recipe: Recipe) => void;
  onRecipeDeleted?: (recipeId: string) => void;
  currentUserId?: string;
  showActions?: boolean;
  className?: string;
}

export default function RecipeCard({
  recipe,
  onSelect,
  onRecipeUpdated,
  onRecipeDeleted,
  currentUserId,
  showActions = true,
  className = "",
}: RecipeCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const canEdit = recipe.createdByUserId && currentUserId && recipe.createdByUserId === currentUserId;
  const isUserCreated = !!recipe.createdByUserId;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(recipe);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditDialog(true);
  };

  const handleRecipeUpdated = (updatedRecipe: Recipe) => {
    if (onRecipeUpdated) {
      onRecipeUpdated(updatedRecipe);
    }
    setShowEditDialog(false);
  };

  const handleRecipeDeleted = (recipeId: string) => {
    if (onRecipeDeleted) {
      onRecipeDeleted(recipeId);
    }
    setShowEditDialog(false);
  };

  return (
    <>
      <Card
        className={`cursor-pointer hover:bg-muted/50 transition-colors ${className}`}
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base truncate">{recipe.name}</CardTitle>
                {isUserCreated && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <User className="h-3 w-3" />
                    My Recipe
                  </Badge>
                )}
              </div>
              {recipe.description && (
                <CardDescription className="text-sm line-clamp-2">
                  {recipe.description}
                </CardDescription>
              )}
            </div>
            
            <div className="flex items-center gap-1 ml-2">
              <div onClick={(e) => e.stopPropagation()}>
                <FavoriteButton recipeId={recipe.id} size="sm" />
              </div>
              
              {showActions && canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Recipe
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEditDialog(true);
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Recipe
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{recipe.totalTime}min</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                <span>{(Number(recipe.avgRating) || 0).toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <ChefHat className="h-3 w-3" />
                <span className="capitalize">{recipe.difficulty}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              {recipe.mealType}
            </Badge>
            {recipe.cuisine && (
              <Badge variant="outline" className="text-xs">
                {recipe.cuisine}
              </Badge>
            )}
            {recipe.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {recipe.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{recipe.tags.length - 2} more
              </Badge>
            )}
          </div>

          {recipe.nutritionInfo.calories && (
            <div className="text-xs text-muted-foreground">
              {recipe.nutritionInfo.calories} cal
              {recipe.nutritionInfo.protein && ` • ${recipe.nutritionInfo.protein}g protein`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {showEditDialog && canEdit && (
        <RecipeEditDialog
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          recipe={recipe}
          onRecipeUpdated={handleRecipeUpdated}
          onRecipeDeleted={handleRecipeDeleted}
        />
      )}
    </>
  );
}