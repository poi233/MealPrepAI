
/**
 * @fileOverview Defines the Zod schema and TypeScript type for a daily meal plan.
 * This is shared across different AI flows.
 */
import { z } from 'genkit';
import { MealSchema } from './meal';

export const DailyMealPlanSchema = z.object({
  day: z.string().describe('星期几 (例如：星期一, 星期二)'),
  breakfast: z.array(MealSchema).describe('早餐食谱列表。如果未计划，则为空数组。'),
  lunch: z.array(MealSchema).describe('午餐食谱列表。如果未计划，则为空数组。'),
  dinner: z.array(MealSchema).describe('晚餐食谱列表。如果未计划，则为空数组。'),
});
export type DailyMealPlan = z.infer<typeof DailyMealPlanSchema>;
