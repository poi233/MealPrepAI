
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
import { MealSchema, type Meal } from '@/ai/schemas/meal'; 

const SuggestRecipeInputSchema = z.object({
  day: z.string().describe('建议食谱的星期几（例如：星期一）。'),
  mealType: z.string().describe('膳食类型（例如：早餐、午餐、晚餐）。'), // Note: this input mealType might be Chinese already from UI
  planDescription: z.string().describe('整体膳食计划描述，包括饮食偏好和目标。'),
});
export type SuggestRecipeInput = z.infer<typeof SuggestRecipeInputSchema>;

export type SuggestRecipeOutput = Meal;

export async function suggestRecipe(
  input: SuggestRecipeInput
): Promise<SuggestRecipeOutput> {
  return suggestRecipeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRecipePrompt',
  input: {schema: SuggestRecipeInputSchema},
  output: {schema: MealSchema}, 
  prompt: `你是一位富有创意的烹饪助手。
根据星期几、膳食类型和用户的整体膳食计划描述（包括饮食偏好），推荐一个合适且略带随机性的食谱。
你的推荐应包括食谱名称、详细的配料清单和全面的准备步骤。请用中文回答所有内容。

星期: {{{day}}}
膳食类型: {{{mealType}}}
计划描述: {{{planDescription}}}

关于配料，请提供具体的用量（例如，“面粉1杯”，“2个大鸡蛋，打散”，“鸡胸肉100克，切丁”）。
关于步骤，请提供清晰、分步的指导，包括适用的烹饪时间和温度。请给步骤编号。

提供一个完整的食谱。确保输出是符合Meal模式的有效JSON：
{
  "recipeName": "推荐的详细食谱名称（中文）",
  "ingredients": ["详细配料1 (例如, 燕麦1杯)", "详细配料2 (例如, 混合浆果1/2杯，新鲜或冷冻的)", ...],
  "instructions": "1. 第一步详细说明...\n2. 第二步说明烹饪时间和温度...\n3. 第三步..."
}
要有创意，并确保食谱符合提供的计划描述。
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
      throw new Error('AI未能推荐食谱。');
    }
    return output;
  }
);

