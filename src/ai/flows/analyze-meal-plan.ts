
'use server';
/**
 * @fileOverview Analyzes a weekly meal plan based on user's plan description and meal data.
 *
 * - analyzeMealPlan - A function that analyzes the meal plan.
 * - AnalyzeMealPlanInput - The input type for the analyzeMealPlan function.
 * - AnalyzeMealPlanOutput - The return type for the analyzeMealPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { DailyMealPlanSchema, type DailyMealPlan } from '@/ai/schemas/daily-meal-plan'; 

const AnalyzeMealPlanInputSchema = z.object({
  planDescription: z
    .string()
    .describe(
      '用户的膳食计划描述，包括饮食偏好、目标、过敏原等。'
    ),
  weeklyMealPlan: z.array(DailyMealPlanSchema).describe('需要分析的7日膳食计划数据。'),
});
export type AnalyzeMealPlanInput = z.infer<typeof AnalyzeMealPlanInputSchema>;

const AnalyzeMealPlanOutputSchema = z.object({
  analysisText: z.string().describe('对膳食计划的全面分析，包括营养平衡、多样性、对偏好的遵守情况以及改进建议。'),
});
export type AnalyzeMealPlanOutput = z.infer<typeof AnalyzeMealPlanOutputSchema>;

export async function analyzeMealPlan(
  input: AnalyzeMealPlanInput
): Promise<AnalyzeMealPlanOutput> {
  // Serialize weeklyMealPlan to JSON string for the prompt
  const weeklyMealPlanJson = JSON.stringify(input.weeklyMealPlan, null, 2);
  return analyzeMealPlanFlow({ ...input, weeklyMealPlanJson });
}


const promptInputSchemaInternal = z.object({
    planDescription: z.string(),
    weeklyMealPlanJson: z.string(), 
});


const prompt = ai.definePrompt({
  name: 'analyzeMealPlanPrompt',
  input: {schema: promptInputSchemaInternal }, 
  output: {schema: AnalyzeMealPlanOutputSchema},
  prompt: `你是一位专业的营养师和膳食规划顾问。
你的任务是根据用户提供的7天膳食计划数据（JSON格式）和他们的计划描述（包括饮食偏好、目标等）来进行全面的分析。
请用中文提供分析结果。分析应具有建设性并提供可操作的建议。

用户计划描述: {{{planDescription}}}

每周膳食计划数据 (JSON格式):
\`\`\`json
{{{weeklyMealPlanJson}}}
\`\`\`

请分析以下方面：
1.  **营养均衡性**: 评估计划是否大致包含主要营养素（蛋白质、碳水化合物、脂肪）的均衡来源。提及食物多样性（蔬菜、水果、全谷物、瘦肉蛋白等）。
2.  **与计划描述的符合程度**: 评估计划是否符合用户在 \`planDescription\` 中提出的偏好（例如，素食、低碳水、避免特定过敏原等）。明确指出符合和不符合的地方。
3.  **多样性和趣味性**: 评价计划中的食谱是否足够多样，以避免饮食单调。
4.  **可改进的建议**: 提供1-3条具体的、可操作的建议来改进这个膳食计划，使其更健康或更符合用户目标。建议应该清晰且易于执行。

请将您的分析结果组织成清晰、易读的段落。您可以使用Markdown格式来增强可读性，例如使用**粗体**、*斜体*或项目符号列表来突出建议。
输出应该是一个包含完整分析文本的JSON对象，键为 "analysisText"。
例如:
{
  "analysisText": "整体来看，这个膳食计划在蛋白质摄入方面做得不错，但蔬菜种类略显单一。\n\n该计划很好地遵循了您“低碳水”的偏好，但需要注意补充足够的膳食纤维。\n\n为了进一步改善，建议：\n* 增加不同颜色的蔬菜。\n* 在午餐中加入一份豆类或全谷物食品。"
}

确保输出格式为有效的JSON。
`,
});

const analyzeMealPlanFlow = ai.defineFlow(
  {
    name: 'analyzeMealPlanFlow',
    inputSchema: promptInputSchemaInternal, 
    outputSchema: AnalyzeMealPlanOutputSchema,
  },
  async (promptInput) => {
    const {output} = await prompt(promptInput); 
    if (!output) {
      throw new Error('AI未能生成膳食计划分析。');
    }
    return output;
  }
);

export type { DailyMealPlan };
