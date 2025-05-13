
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
  recipeName: z.string().describe('需要生成详情的食谱名称。'),
});
export type GenerateRecipeDetailsInput = z.infer<typeof GenerateRecipeDetailsInputSchema>;

const GenerateRecipeDetailsOutputSchema = z.object({
  ingredients: z.array(z.string()).describe('食谱的配料列表。'),
  instructions: z.string().describe('准备餐点的步骤说明。'),
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
  prompt: `你是一位烹饪助手。根据给定的食谱名称，提供详细的配料清单和全面的烹饪步骤。请用中文回答。
食谱名称: {{{recipeName}}}

关于配料，请提供具体的用量（例如，“面粉1杯”，“2个大鸡蛋，打散”，“鸡胸肉100克，切丁”）。
关于步骤，请提供清晰、分步的指导，包括适用的烹饪时间和温度。请使用Markdown进行格式化（例如，编号列表、**粗体**强调关键步骤）。

将配料输出为字符串数组，步骤输出为单个字符串。
确保输出是符合以下模式的有效JSON：
{
  "ingredients": ["详细配料1 (例如, 面粉1杯)", "详细配料2 (例如, 2个大鸡蛋，打散)", ...],
  "instructions": "1. 第一步详情...\n2. 第二步详情，包括温度和时间...\n3. 第三步..."
}
为给定的名称提供一个典型、常见且详细的食谱。
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
      throw new Error('AI未能生成食谱详情。');
    }
    return output;
  }
);

