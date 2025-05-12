
/**
 * @fileOverview Defines the Zod schema and TypeScript type for a single meal.
 * This is shared across different AI flows.
 */
import { z } from 'genkit';

export const MealSchema = z.object({
  recipeName: z.string().describe('食谱名称 (例如, "牛油果吐司", "扒鸡胸沙拉")'),
  ingredients: z.array(z.string()).describe('食谱的配料列表'),
  instructions: z.string().describe('准备餐点的步骤说明'),
});
export type Meal = z.infer<typeof MealSchema>;

