
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
import type { DailyMealPlan } from './generate-weekly-meal-plan'; // Import for type, not schema directly
import { DailyMealPlanSchema } from './generate-weekly-meal-plan'; // Import schema for use in input

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
    weeklyMealPlanJson: z.string(), // Expecting JSON string here for the prompt
});


const prompt = ai.definePrompt({
  name: 'analyzeMealPlanPrompt',
  input: {schema: promptInputSchemaInternal }, // Use internal schema for prompt
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

请将您的分析结果组织成清晰、易读的段落。输出应该是一个包含完整分析文本的JSON对象，键为 "analysisText"。
例如:
{
  "analysisText": "整体来看，这个膳食计划在蛋白质摄入方面做得不错，但蔬菜种类略显单一。该计划很好地遵循了您“低碳水”的偏好，但需要注意补充足够的膳食纤维。为了进一步改善，建议增加不同颜色的蔬菜，并在午餐中加入一份豆类或全谷物食品。"
}

确保输出格式为有效的JSON。
`,
});

// This flow now takes the original AnalyzeMealPlanInput but transforms it for the prompt
const analyzeMealPlanFlow = ai.defineFlow(
  {
    name: 'analyzeMealPlanFlow',
    inputSchema: promptInputSchemaInternal, // Internal flow definition uses the schema with JSON string
    outputSchema: AnalyzeMealPlanOutputSchema,
  },
  async (promptInput) => {
    const {output} = await prompt(promptInput); // Pass the transformed input
    if (!output) {
      throw new Error('AI未能生成膳食计划分析。');
    }
    return output;
  }
);

// Type for external use remains the same as AnalyzeMealPlanInput.
// The exported analyzeMealPlan function handles the transformation.
export type { DailyMealPlan }; // Re-export for convenience if needed elsewhere
`,
    </content>
  </change>
  <change>
    <file>src/app/actions.ts</file>
    <description>Add server action for meal plan analysis.</description>
    <content><![CDATA[
"use server";

import { generateWeeklyMealPlan, type GenerateWeeklyMealPlanInput, type GenerateWeeklyMealPlanOutput } from "@/ai/flows/generate-weekly-meal-plan";
import { generateRecipeDetails, type GenerateRecipeDetailsInput, type GenerateRecipeDetailsOutput } from "@/ai/flows/generate-recipe-details";
import { suggestRecipe, type SuggestRecipeInput, type SuggestRecipeOutput } from "@/ai/flows/suggest-recipe";
import { analyzeMealPlan, type AnalyzeMealPlanInput, type AnalyzeMealPlanOutput } from "@/ai/flows/analyze-meal-plan";
import { 
  saveMealPlanToDb as saveMealPlanToDbInternal, 
  getMealPlanByNameFromDb,
  deleteMealPlanFromDbByName, 
  getAllMealPlanNamesFromDb,
  getActiveMealPlanFromDb,
  setActivePlanInDb
} from "@/lib/db";

export interface GenerateMealPlanActionInput {
  planName: string;
  planDescription: string;
}

export async function generateMealPlanAction(
  input: GenerateMealPlanActionInput
): Promise<GenerateWeeklyMealPlanOutput | { error: string }> {
  try {
    if (!input.planName || input.planName.trim() === "") {
      return { error: "计划名称不能为空。" };
    }
    if (!input.planDescription || input.planDescription.trim() === "") {
      return { error: "计划描述不能为空。" };
    }
    
    const aiInput: GenerateWeeklyMealPlanInput = { planDescription: input.planDescription };
    const result = await generateWeeklyMealPlan(aiInput);

    if (!result || !result.weeklyMealPlan) {
        if (result && (result as any).error) {
             return { error: `AI 错误: ${(result as any).error}` };
        }
        return { error: "生成膳食计划失败。AI返回了意外结果或没有计划。" };
    }
     if (result.weeklyMealPlan.length === 0) {
        return { error: "AI生成了一个空的膳食计划。请尝试完善您的计划描述。" };
    }

    try {
      // Save with planName and planDescription
      await saveMealPlanToDbInternal(input.planName, input.planDescription, result);
      // After saving, set this plan as active
      await setActivePlanInDb(input.planName);
    } catch (dbError) {
      console.error("生成后未能保存膳食计划到数据库或设为活动计划:", dbError);
      // Don't return dbError to client directly, it might contain sensitive info.
      return { error: "未能保存生成的膳食计划。"};
    }

    return result;
  } catch (e) {
    console.error("生成膳食计划时出错:", e);
    const errorMessage = e instanceof Error ? e.message : "生成膳食计划时发生未知错误。";
    return { error: errorMessage };
  }
}

export async function getSavedMealPlanByNameAction(
  planName: string
): Promise<{ mealPlanData: GenerateWeeklyMealPlanOutput; planDescription: string; isActive: boolean } | null | { error: string }> {
  if (!planName || planName.trim() === "") {
    return null; 
  }
  try {
    const mealPlanData = await getMealPlanByNameFromDb(planName);
    if (mealPlanData === null) {
      return null; 
    }
    return mealPlanData; 
  } catch (e) {
    console.error("从数据库获取已保存膳食计划时出错:", e);
    const errorMessage = e instanceof Error ? e.message : "获取已保存膳食计划时发生未知错误。";
    return { error: errorMessage };
  }
}

export async function deleteMealPlanByNameAction(
  planName: string
): Promise<{ success: boolean; error?: string }> {
  if (!planName || planName.trim() === "") {
    return { success: false, error: "计划名称不能为空。" };
  }
  try {
    await deleteMealPlanFromDbByName(planName);
    return { success: true };
  } catch (e) {
    console.error("从数据库删除膳食计划时出错:", e);
    const errorMessage = e instanceof Error ? e.message : "删除膳食计划时发生未知错误。";
    return { success: false, error: errorMessage };
  }
}

// This function is for direct DB interaction, keeping planName and planDescription separate.
export async function saveMealPlanToDb(
  planName: string, 
  planDescription: string,
  mealPlanData: GenerateWeeklyMealPlanOutput
): Promise<void> {
  if (!planName || planName.trim() === "") {
    throw new Error("保存膳食计划时计划名称不能为空。");
  }
  if (!planDescription || planDescription.trim() === "") {
    // Allowing empty description for now, but might want to enforce it
    // throw new Error("Plan description cannot be empty when saving a meal plan.");
  }
  if (!mealPlanData || !mealPlanData.weeklyMealPlan) {
    throw new Error("膳食计划数据无效或为空。");
  }
  try {
    await saveMealPlanToDbInternal(planName, planDescription, mealPlanData);
  } catch (e) {
    console.error("saveMealPlanToDb操作出错:", e);
    const errorMessage = e instanceof Error ? e.message : "保存膳食计划时发生未知错误。";
    throw new Error(errorMessage); 
  }
}

export async function generateRecipeDetailsAction(
  input: GenerateRecipeDetailsInput
): Promise<GenerateRecipeDetailsOutput | { error: string }> {
  try {
    if (!input.recipeName || input.recipeName.trim() === "") {
      return { error: "食谱名称不能为空。" };
    }
    const result = await generateRecipeDetails(input);
    if (!result || !result.ingredients || !result.instructions) {
      if (result && (result as any).error) {
        return { error: `AI 错误: ${(result as any).error}` };
      }
      return { error: "生成食谱详情失败。AI返回了意外结果。" };
    }
    return result;
  } catch (e) {
    console.error("生成食谱详情时出错:", e);
    const errorMessage = e instanceof Error ? e.message : "生成食谱详情时发生未知错误。";
    return { error: errorMessage };
  }
}

export async function suggestRecipeAction(
  input: SuggestRecipeInput
): Promise<SuggestRecipeOutput | { error: string }> {
  try {
    if (!input.day || input.day.trim() === "") {
      return { error: "推荐食谱时星期不能为空。" };
    }
    if (!input.mealType || input.mealType.trim() === "") {
      return { error: "推荐食谱时膳食类型不能为空。" };
    }
    if (!input.planDescription || input.planDescription.trim() === "") {
      return { error: "推荐食谱时计划描述不能为空。" };
    }
    const result = await suggestRecipe(input);
     if (!result || !result.recipeName || !result.ingredients || !result.instructions) {
      if (result && (result as any).error) {
        return { error: `AI 错误: ${(result as any).error}` };
      }
      return { error: "推荐食谱失败。AI返回了意外结果。" };
    }
    return result;
  } catch (e) {
    console.error("推荐食谱时出错:", e);
    const errorMessage = e instanceof Error ? e.message : "推荐食谱时发生未知错误。";
    return { error: errorMessage };
  }
}


export async function getAllSavedMealPlanNamesAction(): Promise<string[] | { error: string }> {
  try {
    const names = await getAllMealPlanNamesFromDb();
    return names;
  } catch (e) {
    console.error("获取所有已保存膳食计划名称时出错:", e);
    const errorMessage = e instanceof Error ? e.message : "获取计划名称时发生未知错误。";
    return { error: errorMessage };
  }
}

export async function getActiveMealPlanAction(): Promise<{ planName: string; planDescription: string; mealPlanData: GenerateWeeklyMealPlanOutput } | null | { error: string }> {
  try {
    const activePlan = await getActiveMealPlanFromDb();
    return activePlan;
  } catch (e) {
    console.error("获取活动膳食计划时出错:", e);
    const errorMessage = e instanceof Error ? e.message : "获取活动计划时发生未知错误。";
    return { error: errorMessage };
  }
}

export async function setActivePlanAction(planName: string): Promise<{ success: boolean; error?: string }> {
  // Allow planName to be an empty string to signify clearing the active plan.
  // The UserProfileContext ensures planName is either a normalized string or "".
  try {
    await setActivePlanInDb(planName);
    return { success: true };
  } catch (e) {
    console.error(`为 "${planName}" 设置活动计划状态时出错:`, e);
    const errorMessage = e instanceof Error ? e.message : `为 "${planName}" 设置活动计划状态时发生未知错误。`;
    return { success: false, error: errorMessage };
  }
}

export async function analyzeMealPlanAction(
  input: AnalyzeMealPlanInput
): Promise<AnalyzeMealPlanOutput | { error: string }> {
  try {
    if (!input.planDescription || input.planDescription.trim() === "") {
      return { error: "分析膳食计划时计划描述不能为空。" };
    }
    if (!input.weeklyMealPlan || input.weeklyMealPlan.length === 0) {
      return { error: "分析膳食计划时膳食计划数据不能为空。" };
    }
    
    const result = await analyzeMealPlan(input);

    if (!result || !result.analysisText) {
      if (result && (result as any).error) {
        return { error: `AI 分析错误: ${(result as any).error}` };
      }
      return { error: "AI未能生成膳食计划分析。" };
    }
    return result;
  } catch (e) {
    console.error("分析膳食计划时出错:", e);
    const errorMessage = e instanceof Error ? e.message : "分析膳食计划时发生未知错误。";
    return { error: errorMessage };
  }
}
