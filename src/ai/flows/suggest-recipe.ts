
'use server';
/**
 * @fileOverview Suggests a random recipe based on the day, meal type, and overall plan description.
 *
 * - suggestRecipe - A function that suggests a recipe.
 * - SuggestRecipeInput - The input type for the suggestRecipe function.
 * - SuggestRecipeOutput - The return type for the suggestRecipe function (which is a Meal).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { MealSchema, type Meal } from '@/ai/schemas/meal'; // Import from shared file

const SuggestRecipeInputSchema = z.object({
  day: z.string().describe('The day of the week for which the recipe is being suggested (e.g., Monday).'),
  mealType: z.string().describe('The type of meal (e.g., Breakfast, Lunch, Dinner).'),
  planDescription: z.string().describe('The overall meal plan description, including dietary preferences and goals.'),
});
export type SuggestRecipeInput = z.infer<typeof SuggestRecipeInputSchema>;

// Output is a single Meal
export type SuggestRecipeOutput = Meal;

export async function suggestRecipe(
  input: SuggestRecipeInput
): Promise<SuggestRecipeOutput> {
  return suggestRecipeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRecipePrompt',
  input: {schema: SuggestRecipeInputSchema},
  output: {schema: MealSchema}, // Output a single Meal object
  prompt: `You are a creative culinary assistant.
Given the day of the week, the meal type, and the user's overall meal plan description (including dietary preferences), suggest one suitable and somewhat random recipe.
Your suggestion should include the recipe name, a detailed list of ingredients, and comprehensive preparation instructions.

Day: {{{day}}}
Meal Type: {{{mealType}}}
Plan Description: {{{planDescription}}}

For ingredients, provide specific quantities (e.g., "1 cup flour", "2 large eggs, lightly beaten", "100g chicken breast, diced").
For instructions, provide clear, step-by-step guidance, including cooking times and temperatures where applicable. Number the steps.

Provide a single, complete recipe. Ensure the output is valid JSON conforming to the Meal schema:
{
  "recipeName": "Suggested Detailed Recipe Name",
  "ingredients": ["detailed ingredient 1 (e.g., 1 cup oats)", "detailed ingredient 2 (e.g., 1/2 cup mixed berries, fresh or frozen)", ...],
  "instructions": "1. First step with details...\\n2. Second step with cooking time and temperature...\\n3. Third step..."
}
Be creative and ensure the recipe aligns with the provided plan description.
`,
});

const suggestRecipeFlow = ai.defineFlow(
  {
    name: 'suggestRecipeFlow',
    inputSchema: SuggestRecipeInputSchema,
    outputSchema: MealSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI failed to suggest a recipe.');
    }
    return output;
  }
);

