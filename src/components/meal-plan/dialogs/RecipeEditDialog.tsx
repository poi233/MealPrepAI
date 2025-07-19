"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, X, Trash2 } from "lucide-react";
import { RecipeService, type RecipeUpdateData } from "@/lib/recipe-service";
import type { Recipe, Ingredient } from "@/types/database.types";

// Validation schema
const ingredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required"),
  amount: z.number().min(0, "Amount must be positive"),
  unit: z.string().min(1, "Unit is required"),
  notes: z.string().optional(),
});

const nutritionSchema = z.object({
  calories: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  fiber: z.number().min(0).optional(),
  sugar: z.number().min(0).optional(),
  sodium: z.number().min(0).optional(),
});

const recipeEditSchema = z.object({
  name: z.string().min(1, "Recipe name is required"),
  description: z.string().optional(),
  ingredients: z.array(ingredientSchema).min(1, "At least one ingredient is required"),
  instructions: z.string().min(1, "Instructions are required"),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  prepTime: z.number().min(0, "Prep time must be positive"),
  cookTime: z.number().min(0, "Cook time must be positive"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  cuisine: z.string().optional(),
  tags: z.array(z.string()).optional(),
  nutritionInfo: nutritionSchema.optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

type RecipeEditFormData = z.infer<typeof recipeEditSchema>;

interface RecipeEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
  onRecipeUpdated: (recipe: Recipe) => void;
  onRecipeDeleted: (recipeId: string) => void;
}

export default function RecipeEditDialog({
  isOpen,
  onClose,
  recipe,
  onRecipeUpdated,
  onRecipeDeleted,
}: RecipeEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [canForceDelete, setCanForceDelete] = useState(false);
  const [newTag, setNewTag] = useState("");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RecipeEditFormData>({
    resolver: zodResolver(recipeEditSchema),
    defaultValues: {
      name: "",
      description: "",
      ingredients: [{ name: "", amount: 0, unit: "", notes: "" }],
      instructions: "",
      mealType: "dinner",
      prepTime: 0,
      cookTime: 0,
      difficulty: "medium",
      cuisine: "",
      tags: [],
      nutritionInfo: {},
      imageUrl: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "ingredients",
  });

  const watchedTags = watch("tags") || [];

  // Populate form when recipe changes
  useEffect(() => {
    if (recipe && isOpen) {
      reset({
        name: recipe.name,
        description: recipe.description || "",
        ingredients: recipe.ingredients.length > 0 ? recipe.ingredients : [{ name: "", amount: 0, unit: "", notes: "" }],
        instructions: recipe.instructions,
        mealType: recipe.mealType,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        difficulty: recipe.difficulty,
        cuisine: recipe.cuisine || "",
        tags: recipe.tags || [],
        nutritionInfo: recipe.nutritionInfo || {},
        imageUrl: recipe.imageUrl || "",
      });
    }
  }, [recipe, isOpen, reset]);

  const onSubmit = async (data: RecipeEditFormData) => {
    setIsLoading(true);
    try {
      const updates: RecipeUpdateData = {
        name: data.name,
        description: data.description,
        ingredients: data.ingredients,
        instructions: data.instructions,
        mealType: data.mealType,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        difficulty: data.difficulty,
        cuisine: data.cuisine,
        tags: data.tags,
        nutritionInfo: data.nutritionInfo,
        imageUrl: data.imageUrl,
      };

      const updatedRecipe = await RecipeService.updateRecipe(recipe.id, updates);
      onRecipeUpdated(updatedRecipe);
      onClose();
    } catch (error) {
      console.error("Failed to update recipe:", error);
      // You might want to show a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (forceDelete = false) => {
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      await RecipeService.deleteRecipe(recipe.id, { 
        removeFromMealPlans: forceDelete 
      });
      onRecipeDeleted(recipe.id);
      onClose();
      setShowDeleteConfirm(false);
    } catch (error: any) {
      console.error("Failed to delete recipe:", error);
      setDeleteError(error.message);
      setCanForceDelete(error.canForceDelete || false);
    } finally {
      setIsDeleting(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !watchedTags.includes(newTag.trim())) {
      setValue("tags", [...watchedTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue("tags", watchedTags.filter(tag => tag !== tagToRemove));
  };

  const addIngredient = () => {
    append({ name: "", amount: 0, unit: "", notes: "" });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Recipe</DialogTitle>
            <DialogDescription>
              Update your recipe details below
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Recipe Name *</Label>
                    <Input
                      id="name"
                      {...register("name")}
                      placeholder="Enter recipe name"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="mealType">Meal Type *</Label>
                    <Select
                      value={watch("mealType")}
                      onValueChange={(value) => setValue("mealType", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="Brief description of the recipe"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="prepTime">Prep Time (minutes) *</Label>
                    <Input
                      id="prepTime"
                      type="number"
                      {...register("prepTime", { valueAsNumber: true })}
                      min="0"
                    />
                    {errors.prepTime && (
                      <p className="text-sm text-red-500 mt-1">{errors.prepTime.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="cookTime">Cook Time (minutes) *</Label>
                    <Input
                      id="cookTime"
                      type="number"
                      {...register("cookTime", { valueAsNumber: true })}
                      min="0"
                    />
                    {errors.cookTime && (
                      <p className="text-sm text-red-500 mt-1">{errors.cookTime.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="difficulty">Difficulty *</Label>
                    <Select
                      value={watch("difficulty")}
                      onValueChange={(value) => setValue("difficulty", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cuisine">Cuisine</Label>
                    <Input
                      id="cuisine"
                      {...register("cuisine")}
                      placeholder="e.g., Italian, Mexican, Asian"
                    />
                  </div>

                  <div>
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input
                      id="imageUrl"
                      {...register("imageUrl")}
                      placeholder="https://example.com/image.jpg"
                    />
                    {errors.imageUrl && (
                      <p className="text-sm text-red-500 mt-1">{errors.imageUrl.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ingredients */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Ingredients</CardTitle>
                  <Button type="button" onClick={addIngredient} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Ingredient
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Label htmlFor={`ingredients.${index}.name`}>Name</Label>
                      <Input
                        {...register(`ingredients.${index}.name`)}
                        placeholder="Ingredient name"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`ingredients.${index}.amount`}>Amount</Label>
                      <Input
                        type="number"
                        step="0.1"
                        {...register(`ingredients.${index}.amount`, { valueAsNumber: true })}
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`ingredients.${index}.unit`}>Unit</Label>
                      <Input
                        {...register(`ingredients.${index}.unit`)}
                        placeholder="cups, tsp, etc."
                      />
                    </div>
                    <div className="col-span-3">
                      <Label htmlFor={`ingredients.${index}.notes`}>Notes</Label>
                      <Input
                        {...register(`ingredients.${index}.notes`)}
                        placeholder="Optional notes"
                      />
                    </div>
                    <div className="col-span-1">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {errors.ingredients && (
                  <p className="text-sm text-red-500">{errors.ingredients.message}</p>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  {...register("instructions")}
                  placeholder="Step-by-step cooking instructions"
                  rows={6}
                />
                {errors.instructions && (
                  <p className="text-sm text-red-500 mt-1">{errors.instructions.message}</p>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {watchedTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Nutrition Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nutrition Information (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="calories">Calories</Label>
                    <Input
                      id="calories"
                      type="number"
                      {...register("nutritionInfo.calories", { valueAsNumber: true })}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="protein">Protein (g)</Label>
                    <Input
                      id="protein"
                      type="number"
                      step="0.1"
                      {...register("nutritionInfo.protein", { valueAsNumber: true })}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="carbs">Carbs (g)</Label>
                    <Input
                      id="carbs"
                      type="number"
                      step="0.1"
                      {...register("nutritionInfo.carbs", { valueAsNumber: true })}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fat">Fat (g)</Label>
                    <Input
                      id="fat"
                      type="number"
                      step="0.1"
                      {...register("nutritionInfo.fat", { valueAsNumber: true })}
                      min="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading || isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Recipe
              </Button>
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recipe</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{recipe?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{deleteError}</p>
              {canForceDelete && (
                <p className="text-sm text-red-500 mt-2">
                  You can force delete this recipe, which will also remove it from all meal plans.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteError(null);
                setCanForceDelete(false);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            {canForceDelete && deleteError && (
              <Button
                variant="destructive"
                onClick={() => handleDelete(true)}
                disabled={isDeleting}
              >
                {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Force Delete
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => handleDelete(false)}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}