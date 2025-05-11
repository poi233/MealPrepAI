
"use client";

import type React from 'react';
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import type { Meal } from "@/ai/flows/generate-weekly-meal-plan";
import { generateRecipeDetailsAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2 } from "lucide-react";

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
}

export default function AddRecipeDialog({
  isOpen,
  onClose,
  onSubmit,
  mealTypeTitle,
  day
}: AddRecipeDialogProps) {
  const { toast } = useToast();
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);

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
        description: "Please enter a recipe name first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingDetails(true);
    try {
      const result = await generateRecipeDetailsAction({ recipeName });
      if ("error" in result) {
        toast({
          title: "AI Generation Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        form.setValue("ingredients", result.ingredients.join("\n"));
        form.setValue("instructions", result.instructions);
        toast({
          title: "Recipe Details Generated",
          description: "Ingredients and instructions have been filled in.",
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { form.reset(); onClose();} }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add New Recipe</DialogTitle>
          <DialogDescription>
            Enter the details for your new {mealTypeTitle.toLowerCase()} recipe for {day}.
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
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input placeholder="e.g., Spicy Chicken Stir-fry" {...field} />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateDetails}
                      disabled={isGeneratingDetails || !form.watch("recipeName")}
                      className="text-xs"
                    >
                      {isGeneratingDetails ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                      )}
                      AI Fill
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
              <Button type="submit" disabled={isGeneratingDetails}>Add Recipe</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
