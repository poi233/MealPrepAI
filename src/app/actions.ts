
"use server";

import { generateWeeklyMealPlan, type GenerateWeeklyMealPlanInput, type GenerateWeeklyMealPlanOutput, type DailyMealPlan } from "@/ai/flows/generate-weekly-meal-plan";
import { generateRecipeDetails, type GenerateRecipeDetailsInput, type GenerateRecipeDetailsOutput } from "@/ai/flows/generate-recipe-details";
import { suggestRecipe, type SuggestRecipeInput, type SuggestRecipeOutput } from "@/ai/flows/suggest-recipe";
import { analyzeMealPlan, type AnalyzeMealPlanInput as AnalyzeMealPlanFlowInput, type AnalyzeMealPlanOutput } from "@/ai/flows/analyze-meal-plan";
import { generateShoppingList, type GenerateShoppingListInput as GenerateShoppingListFlowInput, type GenerateShoppingListOutput } from "@/ai/flows/generate-shopping-list";

import { 
  saveMealPlanToDb as saveMealPlanToDbInternal, 
  getMealPlanByNameFromDb,
  deleteMealPlanFromDbByName, 
  getAllMealPlanNamesFromDb,
  getActiveMealPlanFromDb,
  setActivePlanInDb,
  saveShoppingListToDb,
  getShoppingListByPlanNameFromDb,
  saveMealPlanAnalysisToDb, // New DB function
  getMealPlanAnalysisFromDb, // New DB function
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
             return { error: 'AI 错误: ' + String((result as any).error) };
        }
        return { error: "生成膳食计划失败。AI返回了意外结果或没有计划。" };
    }
     if (result.weeklyMealPlan.length === 0) {
        return { error: "AI生成了一个空的膳食计划。请尝试完善您的计划描述。" };
    }

    try {
      // Saving the meal plan also clears its analysis_text column in DB.
      await saveMealPlanToDbInternal(input.planName, input.planDescription, result);
      await setActivePlanInDb(input.planName);
    } catch (dbError) {
      console.error("生成后未能保存膳食计划到数据库或设为活动计划:", dbError);
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
): Promise<{ mealPlanData: GenerateWeeklyMealPlanOutput; planDescription: string; isActive: boolean; analysisText: string | null } | null | { error: string }> {
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

export async function saveMealPlanToDb(
  planName: string, 
  planDescription: string,
  mealPlanData: GenerateWeeklyMealPlanOutput
): Promise<void> {
  if (!planName || planName.trim() === "") {
    throw new Error("保存膳食计划时计划名称不能为空。");
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
        return { error: 'AI 错误: ' + String((result as any).error) };
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
        return { error: 'AI 错误: ' + String((result as any).error) };
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

export async function getActiveMealPlanAction(): Promise<{ planName: string; planDescription: string; mealPlanData: GenerateWeeklyMealPlanOutput; analysisText: string | null } | null | { error: string }> {
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
  try {
    await setActivePlanInDb(planName);
    return { success: true };
  } catch (e) {
    console.error(`为 "${planName}" 设置活动计划状态时出错:`, e);
    const errorMessage = e instanceof Error ? e.message : `为 "${planName}" 设置活动计划状态时发生未知错误。`;
    return { success: false, error: errorMessage };
  }
}

// Action specific input type for analysis
export interface AnalyzeMealPlanActionInput extends AnalyzeMealPlanFlowInput {
  planName: string;
}

export async function analyzeMealPlanAction(
  input: AnalyzeMealPlanActionInput
): Promise<AnalyzeMealPlanOutput | { error: string }> {
  try {
    if (!input.planName || input.planName.trim() === "") {
      return { error: "分析膳食计划时计划名称不能为空。" };
    }
    if (!input.planDescription || input.planDescription.trim() === "") {
      return { error: "分析膳食计划时计划描述不能为空。" };
    }
    if (!input.weeklyMealPlan || input.weeklyMealPlan.length === 0) {
      return { error: "分析膳食计划时膳食计划数据不能为空。" };
    }
    
    // Prepare input for the AI flow (which doesn't need planName)
    const flowInput: AnalyzeMealPlanFlowInput = {
        planDescription: input.planDescription,
        weeklyMealPlan: input.weeklyMealPlan,
    };
    const result = await analyzeMealPlan(flowInput);

    if (!result || !result.analysisText) {
      if (result && (result as any).error) {
        return { error: 'AI 分析错误: ' + String((result as any).error) };
      }
      return { error: "AI未能生成膳食计划分析。" };
    }

    // Save the analysis text to the database
    try {
      await saveMealPlanAnalysisToDb(input.planName, result.analysisText);
    } catch (dbError) {
      console.error("分析后未能保存膳食计划分析到数据库:", dbError);
      // Decide if this should be a hard error for the user. 
      // For now, let's return the analysis but log the save error.
      // Optionally, add a non-blocking error message to the user or a specific error code.
    }

    return result;
  } catch (e) {
    console.error("分析膳食计划时出错:", e);
    const errorMessage = e instanceof Error ? e.message : "分析膳食计划时发生未知错误。";
    return { error: errorMessage };
  }
}

export async function getMealPlanAnalysisAction(
  planName: string
): Promise<{ analysisText: string | null } | { error: string } | null> {
  if (!planName || planName.trim() === "") {
    return null; 
  }
  try {
    const analysisData = await getMealPlanAnalysisFromDb(planName);
    if (analysisData === null) { // Plan not found or no analysis yet
      return null; 
    }
    return analysisData; // { analysisText: string | null }
  } catch (e) {
    console.error("从数据库获取膳食计划分析时出错:", e);
    const errorMessage = e instanceof Error ? e.message : "获取膳食计划分析时发生未知错误。";
    return { error: errorMessage };
  }
}


// Action specific input type for shopping list
export interface GenerateShoppingListActionInput {
  planName: string;
  weeklyMealPlan: DailyMealPlan[];
  planDescription?: string;
}

export async function generateShoppingListAction(
  input: GenerateShoppingListActionInput
): Promise<GenerateShoppingListOutput | { error: string }> {
  try {
    if (!input.planName || input.planName.trim() === "") {
      return { error: "生成购物清单时计划名称不能为空。" };
    }
    if (!input.weeklyMealPlan || input.weeklyMealPlan.length === 0) {
      return { error: "生成购物清单时膳食计划数据不能为空。" };
    }
    
    const flowInput: GenerateShoppingListFlowInput = {
      weeklyMealPlan: input.weeklyMealPlan,
      planDescription: input.planDescription,
    };
    const result = await generateShoppingList(flowInput);

    if (!result || !result.shoppingListText) {
      if (result && (result as any).error) {
        return { error: 'AI 购物清单错误: ' + String((result as any).error) };
      }
      return { error: "AI未能生成购物清单。" };
    }

    try {
      await saveShoppingListToDb(input.planName, result.shoppingListText);
    } catch (dbError) {
      console.error("生成后未能保存购物清单到数据库:", dbError);
    }

    return result;
  } catch (e) {
    console.error("生成购物清单时出错:", e);
    const errorMessage = e instanceof Error ? e.message : "生成购物清单时发生未知错误。";
    return { error: errorMessage };
  }
}

export async function getShoppingListForPlanAction(
  planName: string
): Promise<{ shoppingListText: string } | { error: string } | null> {
  if (!planName || planName.trim() === "") {
    return null; 
  }
  try {
    const shoppingListData = await getShoppingListByPlanNameFromDb(planName);
    if (shoppingListData === null) {
      return null; 
    }
    return shoppingListData; 
  } catch (e) {
    console.error("从数据库获取已保存购物清单时出错:", e);
    const errorMessage = e instanceof Error ? e.message : "获取已保存购物清单时发生未知错误。";
    return { error: errorMessage };
  }
}
