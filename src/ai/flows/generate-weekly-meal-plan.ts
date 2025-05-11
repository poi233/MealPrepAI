
'use server';

/**
 * @fileOverview Generates a 7-day meal plan tailored to user's plan description.
 *
 * - generateWeeklyMealPlan - A function that generates the meal plan.
 * - GenerateWeeklyMealPlanInput - The input type for the generateWeeklyMealPlan function.
 * - GenerateWeeklyMealPlanOutput - The return type for the generateWeeklyMealPlan function.
 * - Meal - Type definition for a single meal.
 * - DailyMealPlan - Type definition for a daily meal plan.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { MealSchema, type Meal } from '@/ai/schemas/meal'; // Import from shared file

export type { Meal }; // Re-export Meal type for convenience

const GenerateWeeklyMealPlanInputSchema = z.object({
  planDescription: z
    .string()
    .describe(
      'Detailed description of the meal plan to be generated, including dietary preferences, goals, specific requests, etc.'
    ),
});
export type GenerateWeeklyMealPlanInput = z.infer<
  typeof GenerateWeeklyMealPlanInputSchema
>;

// MealSchema is now imported. No local definition or export of MealSchema object.

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

const prompt = ai.definePrompt({
  name: 'generateWeeklyMealPlanPrompt',
  input: {schema: GenerateWeeklyMealPlanInputSchema},
  output: {schema: GenerateWeeklyMealPlanOutputSchema},
  prompt: `You are an expert meal planning AI. Your task is to generate a 7-day meal plan based on the user's provided plan description.
The output MUST be a valid JSON object.

User's Plan Description: {{{planDescription}}}

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
    
    const processedOutput = output ? {
      ...output,
      weeklyMealPlan: output.weeklyMealPlan.map(dayPlan => ({
        ...dayPlan,
        breakfast: dayPlan.breakfast ?? [],
        lunch: dayPlan.lunch ?? [],
        dinner: dayPlan.dinner ?? [],
      }))
    } : { weeklyMealPlan: [] }; 
    
    if (processedOutput.weeklyMealPlan) {
        processedOutput.weeklyMealPlan = processedOutput.weeklyMealPlan.map(day => ({
            ...day,
            breakfast: (day.breakfast || []).filter(meal => meal && meal.recipeName && Array.isArray(meal.ingredients) && typeof meal.instructions === 'string'),
            lunch: (day.lunch || []).filter(meal => meal && meal.recipeName && Array.isArray(meal.ingredients) && typeof meal.instructions === 'string'),
            dinner: (day.dinner || []).filter(meal => meal && meal.recipeName && Array.isArray(meal.ingredients) && typeof meal.instructions === 'string'),
        }));
    }
    
    if (!processedOutput || !processedOutput.weeklyMealPlan || processedOutput.weeklyMealPlan.length !== 7) {
        console.warn("AI generated an invalid or incomplete weekly meal plan structure.", processedOutput);
        // Fallback to a default empty structure if the AI fails significantly, rather than throwing.
        // This allows the UI to show "empty" rather than a hard error if the AI response is malformed.
         return {
            weeklyMealPlan: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => ({
                day,
                breakfast: [],
                lunch: [],
                dinner: [],
            }))
        };
    }

    return processedOutput!;
  }
);

