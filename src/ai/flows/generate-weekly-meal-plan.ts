'use server';

/**
 * @fileOverview Generates a 7-day meal plan tailored to user's dietary preferences.
 *
 * - generateWeeklyMealPlan - A function that generates the meal plan.
 * - GenerateWeeklyMealPlanInput - The input type for the generateWeeklyMealPlan function.
 * - GenerateWeeklyMealPlanOutput - The return type for the generateWeeklyMealPlan function.
 * - Meal - Type definition for a single meal.
 * - DailyMealPlan - Type definition for a daily meal plan.
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

// Updated MealSchema: Removed redundant 'mealName'. 'recipeName' is for the dish.
const MealSchema = z.object({
  recipeName: z.string().describe('Name of the recipe (e.g., "Avocado Toast", "Grilled Chicken Salad")'),
  ingredients: z.array(z.string()).describe('List of ingredients for the recipe'),
  instructions: z.string().describe('Instructions to prepare the meal'),
});
export type Meal = z.infer<typeof MealSchema>;

// Updated DailyMealPlanSchema: breakfast, lunch, dinner are arrays of MealSchema.
const DailyMealPlanSchema = z.object({
  day: z.string().describe('Day of the week (e.g., Monday, Tuesday)'),
  breakfast: z.array(MealSchema).describe('List of breakfast recipes. Empty array if none planned.'),
  lunch: z.array(MealSchema).describe('List of lunch recipes. Empty array if none planned.'),
  dinner: z.array(MealSchema).describe('List of dinner recipes. Empty array if none planned.'),
});
export type DailyMealPlan = z.infer<typeof DailyMealPlanSchema>;

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

// Updated prompt: More explicit JSON structure guidance, removed {{{outputSchema}}}
const prompt = ai.definePrompt({
  name: 'generateWeeklyMealPlanPrompt',
  input: {schema: GenerateWeeklyMealPlanInputSchema},
  output: {schema: GenerateWeeklyMealPlanOutputSchema},
  prompt: `You are an expert meal planning AI. Your task is to generate a 7-day meal plan based on the user's dietary preferences.
The output MUST be a valid JSON object.

User's Dietary Preferences: {{{dietaryPreferences}}}

Please generate a JSON object with a single top-level key: "weeklyMealPlan".
The "weeklyMealPlan" value should be an array of 7 objects, one for each day of the week (e.g., "Monday", "Tuesday", ..., "Sunday").

Each daily object must have the following keys:
- "day": A string for the day of the week.
- "breakfast": An array of meal objects for breakfast. If no breakfast is planned, provide an empty array.
- "lunch": An array of meal objects for lunch. If no lunch is planned, provide an empty array.
- "dinner": An array of meal objects for dinner. If no dinner is planned, provide an empty array.

Each meal object within the "breakfast", "lunch", or "dinner" arrays must have the following keys:
- "recipeName": A string, the name of the recipe (e.g., "Avocado Toast", "Grilled Chicken Salad").
- "ingredients": An array of strings, listing the ingredients for the recipe.
- "instructions": A string detailing the preparation instructions.

Ensure all string values are properly escaped for JSON. For example, a day's plan might look like:
{
  "day": "Monday",
  "breakfast": [
    { "recipeName": "Oatmeal with Berries", "ingredients": ["oats", "water", "berries"], "instructions": "Cook oats with water, top with berries." }
  ],
  "lunch": [], 
  "dinner": [
    { "recipeName": "Salmon with Roasted Vegetables", "ingredients": ["salmon fillet", "broccoli", "carrots", "olive oil"], "instructions": "Roast salmon and vegetables with olive oil." }
  ]
}
Ensure your entire response is a single JSON object starting with { and ending with }.
`,
});

const generateWeeklyMealPlanFlow = ai.defineFlow(
  {
    name: 'generateWeeklyMealPlanFlow',
    inputSchema: GenerateWeeklyMealPlanInputSchema,
    outputSchema: GenerateWeeklyMealPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Updated processedOutput: Default to empty arrays for meal slots.
    const processedOutput = output ? {
      ...output,
      weeklyMealPlan: output.weeklyMealPlan.map(dayPlan => ({
        ...dayPlan,
        breakfast: dayPlan.breakfast ?? [],
        lunch: dayPlan.lunch ?? [],
        dinner: dayPlan.dinner ?? [],
      }))
    } : { weeklyMealPlan: [] }; // Default to an empty plan if AI output is null
    
    // Further ensure each meal in the array is valid, though Zod should handle this.
    // This is more for robustness if the AI generates partial/invalid meal objects within the arrays.
    if (processedOutput.weeklyMealPlan) {
        processedOutput.weeklyMealPlan = processedOutput.weeklyMealPlan.map(day => ({
            ...day,
            breakfast: (day.breakfast || []).filter(meal => meal && meal.recipeName),
            lunch: (day.lunch || []).filter(meal => meal && meal.recipeName),
            dinner: (day.dinner || []).filter(meal => meal && meal.recipeName),
        }));
    }
    
    return processedOutput!;
  }
);

