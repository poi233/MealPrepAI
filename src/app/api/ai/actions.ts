"use server";

import { generateRecipeDetails, type GenerateRecipeDetailsInput, type GenerateRecipeDetailsOutput } from "@/ai/flows/generate-recipe-details";
import { suggestRecipe, type SuggestRecipeInput, type SuggestRecipeOutput } from "@/ai/flows/suggest-recipe";

export async function generateRecipeDetailsAction(
  input: GenerateRecipeDetailsInput
): Promise<GenerateRecipeDetailsOutput | { error: string }> {
  try {
    if (!input.recipeName || input.recipeName.trim() === "") {
      return { error: "食谱名称不能为空。" };
    }
    const result = await generateRecipeDetails(input);
    if (!result || !result.ingredients || !result.instructions) {
      if (result && 'error' in result) {
        return { error: 'AI 错误: ' + String(result.error) };
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
      if (result && 'error' in result) {
        return { error: 'AI 错误: ' + String(result.error) };
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