
/**
 * @fileOverview Defines the Zod schema and TypeScript type for a single meal.
 * This is shared across different AI flows.
 */
import { z } from 'genkit';

export const MealSchema = z.object({
  recipeName: z.string().describe('Name of the recipe (e.g., "Avocado Toast", "Grilled Chicken Salad")'),
  ingredients: z.array(z.string()).describe('List of ingredients for the recipe'),
  instructions: z.string().describe('Instructions to prepare the meal'),
});
export type Meal = z.infer<typeof MealSchema>;
