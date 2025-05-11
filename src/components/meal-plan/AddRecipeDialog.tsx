
"use client";

import type React from 'react';
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription, 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Meal } from "@/ai/schemas/meal";
import { generateRecipeDetailsAction, suggestRecipeAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Wand2 } from "lucide-react";

const addRecipeFormSchema = z.object({
  recipeName: z.string().min(1, "Recipe name is required."),
  ingredients: z.string().min(1, "Ingredients are required."), 
  instructions: z.string().min(1, "Instructions are required."),
});

type AddRecipeFormValues = z.infer<typeof addRecipeFormSchema>;

interface AddRecipeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newRecipe: Meal) => void;
  mealTypeTitle: string;
  day: string;
  planDescription: string; 
}

export default function AddRecipeDialog({
  isOpen,
  onClose,
  onSubmit,
  mealTypeTitle,
  day,
  planDescription,
}: AddRecipeDialogProps) {
  const { toast } = useToast();
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [isSuggestingRecipe, setIsSuggestingRecipe] = useState(false);

  const form = useForm<AddRecipeFormValues>({
    resolver: zodResolver(addRecipeFormSchema),
    defaultValues: {
      recipeName: "",
      ingredients: "",
      instructions: "",
    },
  });

  const handleSubmit = (values: AddRecipeFormValues) => {
    const newRecipe: Meal = {
      recipeName: values.recipeName,
      ingredients: values.ingredients.split('\n').map(ing => ing.trim()).filter(ing => ing.length > 0),
      instructions: values.instructions,
    };
    onSubmit(newRecipe);
    form.reset();
    onClose();
  };

  const handleGenerateDetails = async () => {
    const recipeName = form.getValues("recipeName");
    if (!recipeName || recipeName.trim() === "") {
      toast({
        title: "Missing Recipe Name",
        description: "Please enter a recipe name first to fill its details.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingDetails(true);
    try {
      const result = await generateRecipeDetailsAction({ recipeName });
      if ("error" in result) {
        toast({
          title: "AI Detail Generation Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        form.setValue("ingredients", result.ingredients.join("\n"));
        form.setValue("instructions", result.instructions);
        toast({
          title: "Recipe Details Generated",
          description: "Ingredients and instructions have been filled in for the recipe name.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate recipe details.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDetails(false);
    }
  };

  const handleSuggestRecipe = async () => {
    if (!planDescription) {
       toast({
        title: "Missing Plan Context",
        description: "Cannot suggest a recipe without an active meal plan description.",
        variant: "destructive",
      });
      return;
    }
    setIsSuggestingRecipe(true);
    form.reset(); 
    try {
      const result = await suggestRecipeAction({ day, mealType: mealTypeTitle, planDescription });
      if ("error" in result) {
        toast({
          title: "AI Suggestion Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        form.setValue("recipeName", result.recipeName);
        form.setValue("ingredients", result.ingredients.join("\n"));
        form.setValue("instructions", result.instructions);
        toast({
          title: "Recipe Suggested",
          description: `AI has suggested "${result.recipeName}" and filled in the details.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to suggest a recipe.",
        variant: "destructive",
      });
    } finally {
      setIsSuggestingRecipe(false);
    }
  };


  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { form.reset(); onClose();} }}>
      <DialogContent className="sm:max-w-[520px]"> 
        <DialogHeader>
          <DialogTitle>Add New Recipe</DialogTitle>
          <DialogDescription>
            Manually enter details, or let AI suggest a recipe or fill details for a specific recipe name for {day}'s {mealTypeTitle.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipe Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Spicy Chicken Stir-fry" {...field} disabled={isSuggestingRecipe}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleSuggestRecipe}
                disabled={isSuggestingRecipe || isGeneratingDetails || !planDescription}
                className="h-8 px-2.5 py-1.5 text-xs w-full sm:w-auto" // Adjusted size
              >
                {isSuggestingRecipe ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5 mr-1" />
                )}
                AI Suggest Recipe
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateDetails}
                disabled={isGeneratingDetails || isSuggestingRecipe || !form.watch("recipeName")}
                className="h-8 px-2.5 py-1.5 text-xs w-full sm:w-auto" // Adjusted size
              >
                {isGeneratingDetails ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                )}
                AI Fill Details
              </Button>
            </div>
            
            <FormField
              control={form.control}
              name="ingredients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ingredients</FormLabel>
                  <FormDescription>Enter each ingredient on a new line.</FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder="Chicken breast\nSoy sauce\nBroccoli florets..."
                      className="min-h-[100px]"
                      {...field}
                      disabled={isSuggestingRecipe}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="1. Cut chicken into cubes.\n2. Marinate with soy sauce..."
                      className="min-h-[120px]"
                      {...field}
                      disabled={isSuggestingRecipe}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => { form.reset(); onClose();}}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isGeneratingDetails || isSuggestingRecipe}>Add Recipe</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

