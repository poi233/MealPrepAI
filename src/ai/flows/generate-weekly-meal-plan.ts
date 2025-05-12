
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
- "breakfast": An array of meal objects for breakfast. This array can contain multiple recipes. If no breakfast is planned, provide an empty array.
- "lunch": An array of meal objects for lunch. This array can contain multiple recipes. If no lunch is planned, provide an empty array.
- "dinner": An array of meal objects for dinner. This array can contain multiple recipes. If no dinner is planned, provide an empty array.

Each meal object within the "breakfast", "lunch", or "dinner" arrays must have the following keys:
- "recipeName": A string, the name of the recipe (e.g., "Avocado Toast", "Grilled Chicken Salad").
- "ingredients": An array of strings. Each string should be a detailed ingredient, including quantity and any pre-preparation notes (e.g., "1 cup all-purpose flour", "1/2 cup sugar", "2 large eggs, lightly beaten", "1 medium onion, finely chopped").
- "instructions": A string detailing comprehensive, step-by-step preparation instructions. Include cooking times and temperatures where applicable. Format instructions clearly, for example, using numbered steps or distinct paragraphs for each step.

Example of a single meal object:
{
  "recipeName": "Classic Pancakes",
  "ingredients": [
    "1 1/2 cups all-purpose flour",
    "3 1/2 teaspoons baking powder",
    "1 teaspoon salt",
    "1 tablespoon white sugar",
    "1 1/4 cups milk",
    "1 egg",
    "3 tablespoons butter, melted"
  ],
  "instructions": "1. In a large bowl, sift together the flour, baking powder, salt and sugar.\\n2. Make a well in the center and pour in the milk, egg and melted butter; mix until smooth.\\n3. Heat a lightly oiled griddle or frying pan over medium high heat.\\n4. Pour or scoop the batter onto the griddle, using approximately 1/4 cup for each pancake. Brown on both sides and serve hot."
}

Ensure all string values are properly escaped for JSON. For example, a day's plan might look like:
{
  "day": "Monday",
  "breakfast": [
    { "recipeName": "Oatmeal with Berries", "ingredients": ["1/2 cup rolled oats", "1 cup water or milk", "1/2 cup mixed berries", "1 tbsp honey (optional)"], "instructions": "1. Combine oats and water/milk in a saucepan. Bring to a boil.\\n2. Reduce heat and simmer for 3-5 minutes, stirring occasionally, until thickened.\\n3. Stir in berries and honey if desired. Serve warm." }
  ],
  "lunch": [
    { "recipeName": "Grilled Chicken Breast", "ingredients": ["1 boneless, skinless chicken breast (approx 150g)", "1 tbsp olive oil", "1/2 tsp salt", "1/4 tsp black pepper", "1/4 tsp paprika"], "instructions": "1. Preheat grill or grill pan to medium-high heat.\\n2. Rub chicken breast with olive oil and season with salt, pepper, and paprika.\\n3. Grill for 6-8 minutes per side, or until internal temperature reaches 165°F (74°C).\\n4. Let rest for 5 minutes before slicing." },
    { "recipeName": "Simple Side Salad", "ingredients": ["2 cups mixed greens", "1/4 cucumber, sliced", "4-5 cherry tomatoes, halved", "1 tbsp vinaigrette dressing"], "instructions": "1. In a bowl, combine mixed greens, sliced cucumber, and halved cherry tomatoes.\\n2. Drizzle with vinaigrette dressing and toss gently to combine." }
  ],
  "dinner": [
    { "recipeName": "Salmon with Roasted Asparagus", "ingredients": ["1 salmon fillet (approx 150g)", "1 bunch asparagus, trimmed", "1 tbsp olive oil", "1/2 lemon, juiced", "Salt and pepper to taste"], "instructions": "1. Preheat oven to 400°F (200°C).\\n2. Toss asparagus with 1/2 tbsp olive oil, salt, and pepper. Spread on a baking sheet.\\n3. Rub salmon fillet with remaining olive oil, lemon juice, salt, and pepper. Place on the same baking sheet.\\n4. Roast for 12-15 minutes, or until salmon is cooked through and asparagus is tender-crisp." }
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

