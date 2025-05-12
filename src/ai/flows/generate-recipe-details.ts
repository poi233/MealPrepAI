
'use server';
/**
 * @fileOverview Generates recipe ingredients and instructions based on a recipe name.
 *
 * - generateRecipeDetails - A function that generates recipe details.
 * - GenerateRecipeDetailsInput - The input type for the generateRecipeDetails function.
 * - GenerateRecipeDetailsOutput - The return type for the generateRecipeDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRecipeDetailsInputSchema = z.object({
  recipeName: z.string().describe('The name of the recipe for which to generate details.'),
});
export type GenerateRecipeDetailsInput = z.infer<typeof GenerateRecipeDetailsInputSchema>;

const GenerateRecipeDetailsOutputSchema = z.object({
  ingredients: z.array(z.string()).describe('List of ingredients for the recipe.'),
  instructions: z.string().describe('Instructions to prepare the meal.'),
});
export type GenerateRecipeDetailsOutput = z.infer<typeof GenerateRecipeDetailsOutputSchema>;

export async function generateRecipeDetails(
  input: GenerateRecipeDetailsInput
): Promise<GenerateRecipeDetailsOutput> {
  return generateRecipeDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRecipeDetailsPrompt',
  input: {schema: GenerateRecipeDetailsInputSchema},
  output: {schema: GenerateRecipeDetailsOutputSchema},
  prompt: `You are a culinary assistant. Given a recipe name, provide a detailed list of ingredients and comprehensive cooking instructions.
Recipe Name: {{{recipeName}}}

For ingredients, provide specific quantities (e.g., "1 cup flour", "2 large eggs, lightly beaten", "100g chicken breast, diced").
For instructions, provide clear, step-by-step guidance, including cooking times and temperatures where applicable. Number the steps.

Output the ingredients as an array of strings and the instructions as a single string.
Ensure the output is valid JSON conforming to the following schema:
{
  "ingredients": ["detailed ingredient 1 (e.g., 1 cup flour)", "detailed ingredient 2 (e.g., 2 large eggs, beaten)", ...],
  "instructions": "1. First step details...\\n2. Second step details including temperature and time...\\n3. Third step..."
}
Provide a typical, common, and well-detailed recipe for the given name.
`,
});

const generateRecipeDetailsFlow = ai.defineFlow(
  {
    name: 'generateRecipeDetailsFlow',
    inputSchema: GenerateRecipeDetailsInputSchema,
    outputSchema: GenerateRecipeDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate recipe details.');
    }
    return output;
  }
);

