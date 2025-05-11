
"use client";

import type React from 'react';
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Meal } from "@/ai/flows/generate-weekly-meal-plan";

const addRecipeFormSchema = z.object({
  recipeName: z.string().min(1, "Recipe name is required."),
  ingredients: z.string().min(1, "Ingredients are required."), // Will be split into array
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
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
                  <FormControl>
                    <Input placeholder="e.g., Spicy Chicken Stir-fry" {...field} />
                  </FormControl>
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
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Add Recipe</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
