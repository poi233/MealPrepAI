
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
  prompt: `You are a culinary assistant. Given a recipe name, provide a list of ingredients and cooking instructions.
Recipe Name: {{{recipeName}}}

Output the ingredients as an array of strings and the instructions as a single string.
Ensure the output is valid JSON conforming to the following schema:
{
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": "Step 1...\nStep 2...\nStep 3..."
}
Provide a typical, common recipe for the given name.
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
