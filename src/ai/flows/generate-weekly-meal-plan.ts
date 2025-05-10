'use server';

/**
 * @fileOverview Generates a 7-day meal plan tailored to user's dietary preferences.
 *
 * - generateWeeklyMealPlan - A function that generates the meal plan.
 * - GenerateWeeklyMealPlanInput - The input type for the generateWeeklyMealPlan function.
 * - GenerateWeeklyMealPlanOutput - The return type for the generateWeeklyMealPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWeeklyMealPlanInputSchema = z.object({
  dietaryPreferences: z
    .string()
    .describe(
      'Dietary preferences of the user, such as allergies, vegetarian, vegan, etc.'
    ),
});
export type GenerateWeeklyMealPlanInput = z.infer<
  typeof GenerateWeeklyMealPlanInputSchema
>;

const MealSchema = z.object({
  mealName: z.string().describe('Name of the meal (e.g., breakfast, lunch, dinner)'),
  recipeName: z.string().describe('Name of the recipe for this meal'),
  ingredients: z.array(z.string()).describe('List of ingredients for the recipe'),
  instructions: z.string().describe('Instructions to prepare the meal'),
});

const DailyMealPlanSchema = z.object({
  day: z.string().describe('Day of the week (e.g., Monday, Tuesday)'),
  breakfast: MealSchema.describe('Breakfast recipe for the day'),
  lunch: MealSchema.describe('Lunch recipe for the day'),
  dinner: MealSchema.describe('Dinner recipe for the day'),
});

const GenerateWeeklyMealPlanOutputSchema = z.object({
  weeklyMealPlan: z.array(DailyMealPlanSchema).describe('7-day meal plan'),
});
export type GenerateWeeklyMealPlanOutput = z.infer<
  typeof GenerateWeeklyMealPlanOutputSchema
>;

export async function generateWeeklyMealPlan(
  input: GenerateWeeklyMealPlanInput
): Promise<GenerateWeeklyMealPlanOutput> {
  return generateWeeklyMealPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWeeklyMealPlanPrompt',
  input: {schema: GenerateWeeklyMealPlanInputSchema},
  output: {schema: GenerateWeeklyMealPlanOutputSchema},
  prompt: `You are a meal plan generator. Generate a 7-day meal plan (including breakfast, lunch and dinner) based on the dietary preferences specified by the user.

Dietary Preferences: {{{dietaryPreferences}}}

Output the meal plan in JSON format. Each day should have breakfast, lunch and dinner.

Each meal plan should contains recipe name, ingredients and instructions.

Here is the output schema: {{{outputSchema}}}`,
});

const generateWeeklyMealPlanFlow = ai.defineFlow(
  {
    name: 'generateWeeklyMealPlanFlow',
    inputSchema: GenerateWeeklyMealPlanInputSchema,
    outputSchema: GenerateWeeklyMealPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
