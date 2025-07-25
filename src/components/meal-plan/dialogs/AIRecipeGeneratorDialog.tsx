"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2, X, Plus } from 'lucide-react';
import type { Recipe } from '@/types/database.types';
import { DjangoRecipeService } from '@/lib/django-recipe-service';
import { getErrorMessage } from '@/lib/error-utils';

const aiRecipeFormSchema = z.object({
  recipeName: z.string().min(1, 'Recipe name is required'),
  cuisine: z.string().optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  servings: z.number().min(1).max(20).optional(),
  saveToDatabase: z.boolean().default(true),
});

type AIRecipeFormValues = z.infer<typeof aiRecipeFormSchema>;

interface AIRecipeGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeGenerated: (recipe: Recipe) => void;
}

export default function AIRecipeGeneratorDialog({
  isOpen,
  onClose,
  onRecipeGenerated
}: AIRecipeGeneratorDialogProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [newRestriction, setNewRestriction] = useState('');

  const form = useForm<AIRecipeFormValues>({
    resolver: zodResolver(aiRecipeFormSchema),
    defaultValues: {
      recipeName: '',
      cuisine: '',
      dietaryRestrictions: [],
      servings: 2,
      saveToDatabase: true,
    },
  });

  const dietaryRestrictions = form.watch('dietaryRestrictions') || [];

  const addDietaryRestriction = () => {
    if (newRestriction.trim() && !dietaryRestrictions.includes(newRestriction.trim())) {
      form.setValue('dietaryRestrictions', [...dietaryRestrictions, newRestriction.trim()]);
      setNewRestriction('');
    }
  };

  const removeDietaryRestriction = (restriction: string) => {
    form.setValue(
      'dietaryRestrictions',
      dietaryRestrictions.filter(r => r !== restriction)
    );
  };

  const handleGenerate = async (values: AIRecipeFormValues) => {
    setIsGenerating(true);
    setGeneratedRecipe(null);

    try {
      const recipe = await DjangoRecipeService.generateRecipe({
        name: values.recipeName,
        dietary_restrictions: values.dietaryRestrictions,
        cuisine_preference: values.cuisine,
      });

      // Convert Django recipe format to database format with proper defaults
      const convertedRecipe: Recipe = {
        id: recipe.id || '',
        createdByUserId: recipe.created_by_user_id || '',
        name: recipe.name || values.recipeName,
        description: recipe.description || `Delicious ${values.recipeName.toLowerCase()} recipe`,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || '',
        nutritionInfo: recipe.nutrition_info || {},
        cuisine: recipe.cuisine || values.cuisine || 'International',
        prepTime: recipe.prep_time || 15,
        cookTime: recipe.cook_time || 30,
        totalTime: (recipe.prep_time || 15) + (recipe.cook_time || 30),
        difficulty: recipe.difficulty || 'medium',
        avgRating: Number(recipe.avg_rating) || 0,
        ratingCount: Number(recipe.rating_count) || 0,
        imageUrl: recipe.image_url || '',
        tags: recipe.tags || [],
        createdAt: recipe.created_at ? new Date(recipe.created_at) : new Date(),
        updatedAt: recipe.updated_at ? new Date(recipe.updated_at) : new Date()
      };

      console.log('Generated recipe from API:', JSON.stringify(recipe, null, 2));
      console.log('Converted recipe:', JSON.stringify(convertedRecipe, null, 2));
      
      setGeneratedRecipe(convertedRecipe);
      toast({
        title: 'Recipe Generated Successfully!',
        description: `"${convertedRecipe.name}" has been created with AI assistance.`,
      });
    } catch (error) {
      console.error('Error generating recipe:', error);
      toast({
        title: 'Generation Failed',
        description: getErrorMessage(error, 'Failed to generate recipe'),
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseRecipe = async () => {
    if (!generatedRecipe) return;
    
    setIsSaving(true);
    try {
      // Save the AI-generated recipe to the database
      const savedRecipe = await DjangoRecipeService.saveAIGeneratedRecipe(generatedRecipe);
      
      // Convert Django recipe format to database format
      const convertedSavedRecipe: Recipe = {
        id: savedRecipe.id,
        createdByUserId: savedRecipe.created_by_user_id,
        name: savedRecipe.name,
        description: savedRecipe.description,
        ingredients: savedRecipe.ingredients,
        instructions: savedRecipe.instructions,
        nutritionInfo: savedRecipe.nutrition_info || {},
        cuisine: savedRecipe.cuisine,
        prepTime: savedRecipe.prep_time || 0,
        cookTime: savedRecipe.cook_time || 0,
        totalTime: (savedRecipe.prep_time || 0) + (savedRecipe.cook_time || 0),
        difficulty: savedRecipe.difficulty || 'medium',
        avgRating: Number(savedRecipe.avg_rating) || 0,
        ratingCount: Number(savedRecipe.rating_count) || 0,
        imageUrl: savedRecipe.image_url,
        tags: savedRecipe.tags || [],
        createdAt: savedRecipe.created_at ? new Date(savedRecipe.created_at) : new Date(),
        updatedAt: savedRecipe.updated_at ? new Date(savedRecipe.updated_at) : new Date()
      };
      
      onRecipeGenerated(convertedSavedRecipe);
      toast({
        title: 'Recipe Saved!',
        description: `"${convertedSavedRecipe.name}" has been saved to your recipe collection.`,
      });
      handleClose();
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast({
        title: 'Save Failed',
        description: getErrorMessage(error, 'Failed to save recipe to your collection'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setGeneratedRecipe(null);
    setNewRestriction('');
    setIsSaving(false);
    onClose();
  };

  const formatIngredients = (ingredients: any[]) => {
    return ingredients.map(ing => 
      typeof ing === 'string' ? ing : `${ing.name} - ${ing.amount} ${ing.unit}${ing.notes ? ` (${ing.notes})` : ''}`
    ).join('\n');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Recipe Generator
          </DialogTitle>
          <DialogDescription>
            Generate a complete recipe with ingredients, instructions, and nutritional information using AI.
          </DialogDescription>
        </DialogHeader>

        {!generatedRecipe ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerate)} className="space-y-4">
              <FormField
                control={form.control}
                name="recipeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipe Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Chicken Stir Fry, Chocolate Chip Cookies" 
                        {...field} 
                        disabled={isGenerating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="servings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Servings</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="20" 
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 2)}
                          disabled={isGenerating}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="cuisine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuisine (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Italian, Chinese, Mexican" 
                        {...field} 
                        disabled={isGenerating}
                      />
                    </FormControl>
                    <FormDescription>
                      Leave empty to let AI choose the most appropriate cuisine.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Dietary Restrictions (Optional)</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., vegetarian, gluten-free, dairy-free"
                    value={newRestriction}
                    onChange={(e) => setNewRestriction(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDietaryRestriction())}
                    disabled={isGenerating}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDietaryRestriction}
                    disabled={isGenerating || !newRestriction.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {dietaryRestrictions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dietaryRestrictions.map((restriction) => (
                      <Badge key={restriction} variant="secondary" className="flex items-center gap-1">
                        {restriction}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeDietaryRestriction(restriction)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={isGenerating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Recipe
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">✨ Recipe Generated Successfully!</h3>
              <p className="text-green-700 text-sm">Your AI-generated recipe is ready to use.</p>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-lg">{generatedRecipe.name}</h4>
                {generatedRecipe.description && (
                  <p className="text-gray-600 mt-1">{generatedRecipe.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">{generatedRecipe.difficulty}</Badge>
                  <Badge variant="outline">{generatedRecipe.prepTime + generatedRecipe.cookTime} min total</Badge>
                  {generatedRecipe.cuisine && <Badge variant="outline">{generatedRecipe.cuisine}</Badge>}
                </div>
              </div>

              <div>
                <h5 className="font-medium mb-2">Ingredients:</h5>
                <Textarea
                  value={formatIngredients(generatedRecipe.ingredients)}
                  readOnly
                  className="min-h-[100px] bg-gray-50"
                />
              </div>

              <div>
                <h5 className="font-medium mb-2">Instructions:</h5>
                <Textarea
                  value={generatedRecipe.instructions}
                  readOnly
                  className="min-h-[120px] bg-gray-50"
                />
              </div>

              {generatedRecipe.nutritionInfo && Object.keys(generatedRecipe.nutritionInfo).length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">Nutrition (per serving):</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {generatedRecipe.nutritionInfo.calories && (
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="font-medium">{generatedRecipe.nutritionInfo.calories}</div>
                        <div className="text-gray-600">Calories</div>
                      </div>
                    )}
                    {generatedRecipe.nutritionInfo.protein && (
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="font-medium">{generatedRecipe.nutritionInfo.protein}g</div>
                        <div className="text-gray-600">Protein</div>
                      </div>
                    )}
                    {generatedRecipe.nutritionInfo.carbs && (
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="font-medium">{generatedRecipe.nutritionInfo.carbs}g</div>
                        <div className="text-gray-600">Carbs</div>
                      </div>
                    )}
                    {generatedRecipe.nutritionInfo.fat && (
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="font-medium">{generatedRecipe.nutritionInfo.fat}g</div>
                        <div className="text-gray-600">Fat</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleUseRecipe} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving Recipe...
                  </>
                ) : (
                  'Use This Recipe'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}