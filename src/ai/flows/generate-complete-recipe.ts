'use server';
/**
 * @fileOverview Generates complete recipe objects with all required fields using AI.
 *
 * - generateCompleteRecipe - A function that generates a complete Recipe object.
 * - GenerateCompleteRecipeInput - The input type for the generateCompleteRecipe function.
 * - GenerateCompleteRecipeOutput - The return type for the generateCompleteRecipe function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Recipe, Ingredient, NutritionInfo } from '@/types/database.types';

const GenerateCompleteRecipeInputSchema = z.object({
  recipeName: z.string().describe('The name of the recipe to generate.'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional().describe('The type of meal this recipe is for.'),
  cuisine: z.string().optional().describe('The cuisine type for this recipe.'),
  dietaryRestrictions: z.array(z.string()).optional().describe('Any dietary restrictions to consider.'),
  servings: z.number().optional().default(4).describe('Number of servings this recipe should make.'),
});
export type GenerateCompleteRecipeInput = z.infer<typeof GenerateCompleteRecipeInputSchema>;

const IngredientSchema = z.object({
  name: z.string().describe('The ingredient name.'),
  amount: z.number().describe('The amount of the ingredient.'),
  unit: z.string().describe('The unit of measurement (e.g., cups, grams, pieces).'),
  notes: z.string().optional().describe('Optional notes about the ingredient.'),
});

const NutritionInfoSchema = z.object({
  calories: z.number().optional().describe('Calories per serving.'),
  protein: z.number().optional().describe('Protein in grams per serving.'),
  carbs: z.number().optional().describe('Carbohydrates in grams per serving.'),
  fat: z.number().optional().describe('Fat in grams per serving.'),
  fiber: z.number().optional().describe('Fiber in grams per serving.'),
  sugar: z.number().optional().describe('Sugar in grams per serving.'),
  sodium: z.number().optional().describe('Sodium in milligrams per serving.'),
});

const GenerateCompleteRecipeOutputSchema = z.object({
  name: z.string().describe('The recipe name.'),
  description: z.string().optional().describe('A brief description of the recipe.'),
  ingredients: z.array(IngredientSchema).describe('List of ingredients with amounts and units.'),
  instructions: z.string().describe('Step-by-step cooking instructions.'),
  nutritionInfo: NutritionInfoSchema.describe('Nutritional information per serving.'),
  cuisine: z.string().optional().describe('The cuisine type.'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).describe('The meal type.'),
  prepTime: z.number().describe('Preparation time in minutes.'),
  cookTime: z.number().describe('Cooking time in minutes.'),
  totalTime: z.number().describe('Total time in minutes (prep + cook).'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Recipe difficulty level.'),
  tags: z.array(z.string()).describe('Relevant tags for the recipe.'),
});
export type GenerateCompleteRecipeOutput = z.infer<typeof GenerateCompleteRecipeOutputSchema>;

export async function generateCompleteRecipe(
  input: GenerateCompleteRecipeInput
): Promise<GenerateCompleteRecipeOutput> {
  return generateCompleteRecipeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCompleteRecipePrompt',
  input: { schema: GenerateCompleteRecipeInputSchema },
  output: { schema: GenerateCompleteRecipeOutputSchema },
  prompt: `You are a professional chef and nutritionist. Generate a complete, detailed recipe based on the given parameters.

Recipe Name: {{{recipeName}}}
{{#if mealType}}Meal Type: {{{mealType}}}{{/if}}
{{#if cuisine}}Cuisine: {{{cuisine}}}{{/if}}
{{#if dietaryRestrictions}}Dietary Restrictions: {{{dietaryRestrictions}}}{{/if}}
Servings: {{{servings}}}

Please provide:

1. **Ingredients**: Specific amounts with proper units (e.g., "2 cups flour", "1 lb chicken breast, diced")
2. **Instructions**: Clear, step-by-step cooking directions with times and temperatures
3. **Nutrition**: Estimated nutritional information per serving
4. **Times**: Realistic prep, cook, and total times
5. **Difficulty**: Assess based on technique complexity and time required
6. **Tags**: Relevant descriptive tags (e.g., "quick", "healthy", "comfort-food")

Guidelines:
- Use common, accessible ingredients when possible
- Provide realistic cooking times and temperatures
- Consider the dietary restrictions if provided
- Make nutrition estimates reasonable and realistic
- Choose appropriate difficulty level (easy: basic techniques, medium: some skill required, hard: advanced techniques)
- Include 3-8 relevant tags
- If meal type isn't specified, infer it from the recipe name
- If cuisine isn't specified, infer it from the recipe name and ingredients

Ensure all measurements are precise and instructions are clear enough for a home cook to follow successfully.`,
});

const generateCompleteRecipeFlow = ai.defineFlow(
  {
    name: 'generateCompleteRecipeFlow',
    inputSchema: GenerateCompleteRecipeInputSchema,
    outputSchema: GenerateCompleteRecipeOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      if (!output) {
        throw new Error('AI failed to generate complete recipe.');
      }

      // Ensure totalTime is calculated correctly
      const calculatedTotalTime = output.prepTime + output.cookTime;
      if (output.totalTime !== calculatedTotalTime) {
        output.totalTime = calculatedTotalTime;
      }

      return output;
    } catch (error) {
      console.error('Error generating complete recipe:', error);
      throw new Error(`Failed to generate recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);