
'use server';
/**
 * @fileOverview Generates a shopping list based on a weekly meal plan.
 *
 * - generateShoppingList - A function that generates the shopping list.
 * - GenerateShoppingListInput - The input type for the generateShoppingList function.
 * - GenerateShoppingListOutput - The return type for the generateShoppingList function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { DailyMealPlanSchema } from '@/ai/schemas/daily-meal-plan';

const GenerateShoppingListInputSchema = z.object({
  weeklyMealPlan: z.array(DailyMealPlanSchema).describe('需要为其生成购物清单的7日膳食计划数据。'),
  planDescription: z.string().optional().describe('用户的原始膳食计划描述，可能包含一些通用偏好，供AI参考。'),
});
export type GenerateShoppingListInput = z.infer<typeof GenerateShoppingListInputSchema>;

const GenerateShoppingListOutputSchema = z.object({
  shoppingListText: z.string().describe('格式化为Markdown的购物清单文本，按类别组织并汇总数量（中文）。'),
});
export type GenerateShoppingListOutput = z.infer<typeof GenerateShoppingListOutputSchema>;

export async function generateShoppingList(
  input: GenerateShoppingListInput
): Promise<GenerateShoppingListOutput> {
  // Serialize weeklyMealPlan to JSON string for the prompt
  const weeklyMealPlanJson = JSON.stringify(input.weeklyMealPlan, null, 2);
  return generateShoppingListFlow({ ...input, weeklyMealPlanJson });
}

const promptInputSchemaInternal = z.object({
    weeklyMealPlanJson: z.string(),
    planDescription: z.string().optional(),
});

const prompt = ai.definePrompt({
  name: 'generateShoppingListPrompt',
  input: {schema: promptInputSchemaInternal },
  output: {schema: GenerateShoppingListOutputSchema},
  prompt: `你是一位专业的购物清单助手。
你的任务是根据用户提供的7天膳食计划数据（JSON格式）生成一份详细的、分类的购物清单。
请用中文提供清单。清单应汇总相似的食材并尽可能提供估计的总量。

膳食计划描述 (参考): {{{planDescription}}}

每周膳食计划数据 (JSON格式):
\`\`\`json
{{{weeklyMealPlanJson}}}
\`\`\`

请遵循以下步骤生成购物清单：
1.  **提取所有配料**: 遍历膳食计划中的每一天、每一餐（早餐、午餐、晚餐）以及每一餐中的每一个食谱。提取所有列出的配料及其数量。
2.  **汇总配料**: 将相同的配料进行汇总。例如，如果计划中多次出现“鸡蛋”，请计算总共需要多少个鸡蛋。如果数量单位不同（例如“克”和“个”），请尽量智能处理或分别列出。
3.  **分类**: 将汇总后的配料按常见类别进行组织，例如：
    *   蔬菜 (例如: 西红柿, 生菜, 胡萝卜)
    *   水果 (例如: 苹果, 香蕉)
    *   肉类和禽类 (例如: 鸡胸肉, 牛肉, 猪肉)
    *   鱼类和海鲜 (例如: 三文鱼, 虾)
    *   乳制品和蛋类 (例如: 牛奶, 鸡蛋, 酸奶, 奶酪)
    *   谷物和主食 (例如: 米饭, 面条, 面包, 燕麦)
    *   豆类和豆制品 (例如: 豆腐, 扁豆)
    *   调味品和香料 (例如: 盐, 胡椒, 酱油, 橄榄油)
    *   其他 (例如: 坚果, 零食)
4.  **格式化输出**: 使用Markdown格式化购物清单，每个类别作为二级标题 (##)，类别下的配料作为无序列表项 (-)。
    例如:
    ## 蔬菜
    - 西红柿 (约500克)
    - 生菜 (1棵)
    ## 肉类和禽类
    - 鸡胸肉 (共3块, 约450克)

请注意，如果原始配料中没有提供精确数量，例如“适量”，请在清单中也注明“适量”，或根据常识给出建议用量。
确保输出是一个包含完整购物清单文本（Markdown格式）的JSON对象，键为 "shoppingListText"。

例如:
{
  "shoppingListText": "## 蔬菜\\n- 西兰花 (约300克)\\n- 胡萝卜 (2根)\\n\\n## 肉类和禽类\\n- 鸡胸肉 (总计2块，约300克)\\n\\n## 调味品和香料\\n- 盐 (适量)\\n- 橄榄油 (约50毫升)"
}

确保输出格式为有效的JSON，并且Markdown中的换行符表示为 \\n。
`,
});

const generateShoppingListFlow = ai.defineFlow(
  {
    name: 'generateShoppingListFlow',
    inputSchema: promptInputSchemaInternal,
    outputSchema: GenerateShoppingListOutputSchema,
  },
  async (promptInput) => {
    const {output} = await prompt(promptInput);
    if (!output) {
      throw new Error('AI未能生成购物清单。');
    }
    return output;
  }
);

