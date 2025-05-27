
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { generateMealPlanAction, getSavedMealPlanByNameAction, type GenerateMealPlanActionInput } from "@/app/actions";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { normalizeStringInput } from "@/lib/utils";
import type { GenerateWeeklyMealPlanOutput } from "@/ai/flows/generate-weekly-meal-plan";


const mealPlanFormSchema = z.object({
  planName: z.string()
    .transform(val => normalizeStringInput(val))
    .pipe(z.string().min(1, {
        message: "计划名称不能为空。",
    }).max(100, {
        message: "计划名称不能超过100个字符。",
    })),
  planDescription: z.string()
    .min(10, { 
        message: "计划描述至少需要10个字符。",
    }).max(1000, {
        message: "计划描述不能超过1000个字符。",
    }),
});

type MealPlanFormValues = z.infer<typeof mealPlanFormSchema>;

interface GenerateMealPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanGenerated?: (newlyGeneratedPlanName: string) => void; 
}

const DEFAULT_PLAN_DESCRIPTION = "一个均衡健康的每周膳食计划。请包含多种蛋白质来源、蔬菜和全谷物。避免过多的糖和加工食品。请用中文生成食谱详情。";

export default function GenerateMealPlanDialog({ isOpen, onClose, onPlanGenerated }: GenerateMealPlanDialogProps) {
  const { toast } = useToast();
  const { setActivePlanName, activePlanName: currentActivePlanName } = useUserProfile();
  const { mealPlan, setMealPlan, setIsLoading: setMealPlanLoading, setError: setMealPlanError, isLoading: isMealPlanLoading } = useMealPlan();

  const form = useForm<MealPlanFormValues>({
    resolver: zodResolver(mealPlanFormSchema),
    defaultValues: { // These are initial defaults, useEffect will override when dialog opens.
      planName: "", 
      planDescription: DEFAULT_PLAN_DESCRIPTION,
    },
  });

  useEffect(() => {
    if (isOpen) {
      let nameToSet = "";
      let descriptionToSet = DEFAULT_PLAN_DESCRIPTION;

      if (currentActivePlanName) {
        nameToSet = currentActivePlanName;
        // If there's an active plan name, and the mealPlan context has a description,
        // assume it's for the active plan and use it.
        if (mealPlan && mealPlan.planDescription) {
          descriptionToSet = mealPlan.planDescription;
        }
      }
      // If currentActivePlanName is null, nameToSet remains "" (empty)
      // and descriptionToSet remains DEFAULT_PLAN_DESCRIPTION.
      
      form.reset({
        planName: nameToSet,
        planDescription: descriptionToSet,
      });
    }
  }, [isOpen, currentActivePlanName, mealPlan, form]);

  async function onSubmit(values: MealPlanFormValues) {
    setMealPlanLoading(true);
    setMealPlanError(null);
    
    const normalizedPlanName = normalizeStringInput(values.planName);

    const actionInput: GenerateMealPlanActionInput = {
      planName: normalizedPlanName,
      planDescription: values.planDescription,
    };

    try {
      const existingPlan = await getSavedMealPlanByNameAction(normalizedPlanName);
      const isUpdate = existingPlan && !("error" in existingPlan);

      const generationResult = await generateMealPlanAction(actionInput);

      if ("error" in generationResult) {
        setMealPlanError(generationResult.error);
        toast({
          title: "生成计划出错",
          description: generationResult.error,
          variant: "destructive",
        });
        // Preserve current description in context if plan generation fails for an existing plan
        const currentContextDescription = mealPlan?.planDescription || values.planDescription;
        setMealPlan({ weeklyMealPlan: [], planDescription: currentContextDescription }); 
      } else {
        setMealPlan({ ...generationResult, planDescription: values.planDescription, analysisText: null }); // Reset analysisText on new generation/update
        setActivePlanName(normalizedPlanName); 
        toast({
          title: isUpdate ? "膳食计划已更新！" : "膳食计划已生成！",
          description: `您的个性化7天膳食计划 "${normalizedPlanName}" 已准备就绪。`,
        });
        if (onPlanGenerated) {
          onPlanGenerated(normalizedPlanName);
        }
        onClose(); 
      }
    } catch (e: any) { 
      const errorMessage = e.message || "发生意外错误。";
      setMealPlanError(errorMessage); 
      const currentContextDescription = mealPlan?.planDescription || values.planDescription;
      setMealPlan({ weeklyMealPlan: [], planDescription: currentContextDescription }); 
      toast({
        title: "操作错误",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setMealPlanLoading(false);
    }
  }
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>生成或更新膳食计划</DialogTitle>
          <DialogDescription>
            为您的计划输入名称并描述您的饮食需求。
            如果同名计划已存在，则会更新它。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="planName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">计划名称</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：我的健康周餐" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    此膳食计划的唯一名称。
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="planDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">计划描述 (供AI使用)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="例如：素食、低碳水、无坚果、高蛋白、减肥餐、快手菜... 请用中文生成食谱。"
                      className="min-h-[120px] resize-y text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    提供详细信息供AI生成您的膳食计划。
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>
                  取消
                </Button>
              </DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isMealPlanLoading}>
                <Sparkles className="mr-2 h-4 w-4" />
                {isMealPlanLoading ? "处理中..." : "生成/更新计划"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
