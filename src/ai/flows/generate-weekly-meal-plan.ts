
'use server';

/**
 * @fileOverview Generates a 7-day meal plan tailored to user's plan description.
 *
 * - generateWeeklyMealPlan - A function that generates the meal plan.
 * - GenerateWeeklyMealPlanInput - The input type for the generateWeeklyMealPlan function.
 * - GenerateWeeklyMealPlanOutput - The return type for the generateWeeklyMealPlan function.
 * - Meal - Type definition for a single meal.
 * - DailyMealPlan - Type definition for a daily meal plan.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Meal } from '@/ai/schemas/meal'; 
import { DailyMealPlanSchema, type DailyMealPlan } from '@/ai/schemas/daily-meal-plan'; 

export type { Meal, DailyMealPlan };  

const GenerateWeeklyMealPlanInputSchema = z.object({
  planDescription: z
    .string()
    .describe(
      '要生成的膳食计划的详细描述，包括饮食偏好、目标、具体要求等。请确保AI生成的食谱名称、配料、步骤和星期都是中文。'
    ),
});
export type GenerateWeeklyMealPlanInput = z.infer<
  typeof GenerateWeeklyMealPlanInputSchema
>;

const GenerateWeeklyMealPlanOutputSchema = z.object({
  weeklyMealPlan: z.array(DailyMealPlanSchema).describe('7日膳食计划'),
});
export type GenerateWeeklyMealPlanOutput = z.infer<
  typeof GenerateWeeklyMealPlanOutputSchema
>;

export async function generateWeeklyMealPlan(
  input: GenerateWeeklyMealPlanInput
): Promise<GenerateWeeklyMealPlanOutput> {
  return generateWeeklyMealPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWeeklyMealPlanPrompt',
  input: {schema: GenerateWeeklyMealPlanInputSchema},
  output: {schema: GenerateWeeklyMealPlanOutputSchema},
  prompt: `你是一位专业的膳食计划AI。你的任务是根据用户提供的计划描述生成一个7天的膳食计划。
输出必须是有效的JSON对象。所有文本内容（星期、食谱名称、配料、步骤）都应该是中文。

用户计划描述: {{{planDescription}}}

请生成一个JSON对象，其顶层键为 "weeklyMealPlan"。
"weeklyMealPlan" 的值应该是一个包含7个对象的数组，每周的每一天（例如，“星期一”，“星期二”，...，“星期日”）一个对象。

每个每日对象必须包含以下键：
- "day": 字符串，表示星期几。
- "breakfast": 早餐膳食对象的数组。此数组可以包含1-2个食谱。如果未计划早餐，则提供一个空数组。
- "lunch": 午餐膳食对象的数组。此数组可以包含1-2个食谱。如果未计划午餐，则提供一个空数组。
- "dinner": 晚餐膳食对象的数组。此数组可以包含1-2个食谱。如果未计划晚餐，则提供一个空数组。

"breakfast"、"lunch" 或 "dinner" 数组中的每个膳食对象必须包含以下键：
- "recipeName": 字符串，食谱的名称（例如，“牛油果吐司”，“扒鸡胸沙拉”）。
- "ingredients": 字符串数组。每个字符串应为一个详细的配料，包括具体的数量和单位（例如，“中筋面粉 1杯”，“白砂糖 1/2杯”，“2个 大鸡蛋，轻微打散”，“1个 中等大小洋葱，切碎”）。
- "instructions": 详细说明全面、分步的准备说明的字符串。包括适用的烹饪时间和温度。使用Markdown格式化步骤（例如，编号列表，**粗体**高亮关键操作）。

单个膳食对象示例：
{
  "recipeName": "经典薄煎饼",
  "ingredients": [
    "中筋面粉 1又1/2杯",
    "泡打粉 3又1/2茶匙",
    "盐 1茶匙",
    "白砂糖 1汤匙",
    "牛奶 1又1/4杯",
    "鸡蛋 1个",
    "融化黄油 3汤匙"
  ],
  "instructions": "1. **准备面糊**: 在一个大碗里，将面粉、泡打粉、盐和糖筛在一起。\n2. 在中心挖一个坑，倒入牛奶、鸡蛋和融化的黄油；搅拌至顺滑，不要过度搅拌。\n3. **煎制**: 用中高火加热轻微涂油的煎锅或平底锅。当锅热时，每个薄煎饼约用1/4杯面糊倒入锅中。\n4. **翻面**: 煎约2-3分钟，直到表面出现气泡且边缘凝固。翻面再煎1-2分钟，或至两面金黄。\n5. **享用**: 趁热与您喜欢的配料（如枫糖浆、水果或奶油）一起享用。"
}

确保所有字符串值都已为JSON正确转义。例如，一天的计划可能如下所示：
{
  "day": "星期一",
  "breakfast": [
    { "recipeName": "燕麦粥加浆果", "ingredients": ["燕麦片 1/2杯", "水或牛奶 1杯", "混合浆果 1/2杯", "蜂蜜 1汤匙（可选）"], "instructions": "1. 将燕麦和水/牛奶在锅中混合。煮沸。\n2. 转小火煮3-5分钟，偶尔搅拌，直至浓稠。\n3. 如果需要，拌入浆果和蜂蜜。趁热食用。" }
  ],
  "lunch": [
    { "recipeName": "烤鸡胸肉", "ingredients": ["去骨去皮鸡胸肉 1块（约150克）", "橄榄油 1汤匙", "盐 1/2茶匙", "黑胡椒 1/4茶匙", "辣椒粉 1/4茶匙"], "instructions": "1. **预热**: 将烤架或烤盘预热至中高火。\n2. **调味**: 在鸡胸肉上涂抹橄榄油，并用盐、胡椒和辣椒粉调味。\n3. **烤制**: 每面烤6-8分钟，或直至内部温度达到165°F（74°C）。\n4. **静置**: 烤好后静置5分钟后再切片，以保持肉质鲜嫩。" },
    { "recipeName": "简易沙拉", "ingredients": ["混合生菜叶 2杯", "黄瓜 1/4根，切片", "小番茄 4-5个，对半切", "油醋汁 1汤匙"], "instructions": "1. 在碗中混合生菜叶、黄瓜片和小番茄丁。\n2. 淋上油醋汁，轻轻拌匀即可。" }
  ],
  "dinner": [
    { "recipeName": "三文鱼配烤芦笋", "ingredients": ["三文鱼柳 1块（约150克）", "芦笋 1把，修剪", "橄榄油 1汤匙", "柠檬汁 1/2个量", "盐和胡椒 适量"], "instructions": "1. **预热烤箱**: 将烤箱预热至400°F（200°C）。\n2. **准备蔬菜**: 将芦笋与1/2汤匙橄榄油、盐和胡椒拌匀。铺在烤盘上。\n3. **准备三文鱼**: 在三文鱼柳上涂抹剩余的橄榄油、柠檬汁、盐和胡椒。放在同一烤盘上。\n4. **烤制**: 烤12-15分钟，或直至三文鱼熟透，芦笋变软脆。" }
  ]
}
确保您的整个响应是一个以 { 开始并以 } 结束的JSON对象。
`,
});

const generateWeeklyMealPlanFlow = ai.defineFlow(
  {
    name: 'generateWeeklyMealPlanFlow',
    inputSchema: GenerateWeeklyMealPlanInputSchema,
    outputSchema: GenerateWeeklyMealPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    
    const processedOutput = output ? {
      ...output,
      weeklyMealPlan: output.weeklyMealPlan.map(dayPlan => ({
        ...dayPlan,
        breakfast: dayPlan.breakfast ?? [],
        lunch: dayPlan.lunch ?? [],
        dinner: dayPlan.dinner ?? [],
      }))
    } : { weeklyMealPlan: [] }; 
    
    if (processedOutput.weeklyMealPlan) {
        processedOutput.weeklyMealPlan = processedOutput.weeklyMealPlan.map(day => ({
            ...day,
            breakfast: (day.breakfast || []).filter(meal => meal && meal.recipeName && Array.isArray(meal.ingredients) && typeof meal.instructions === 'string'),
            lunch: (day.lunch || []).filter(meal => meal && meal.recipeName && Array.isArray(meal.ingredients) && typeof meal.instructions === 'string'),
            dinner: (day.dinner || []).filter(meal => meal && meal.recipeName && Array.isArray(meal.ingredients) && typeof meal.instructions === 'string'),
        }));
    }
    
    if (!processedOutput || !processedOutput.weeklyMealPlan || processedOutput.weeklyMealPlan.length !== 7) {
        console.warn("AI 生成了无效或不完整的每周膳食计划结构。", processedOutput);
         return { 
            weeklyMealPlan: ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"].map(day => ({
                day,
                breakfast: [],
                lunch: [],
                dinner: [],
            }))
        };
    }

    return processedOutput!;
  }
);
