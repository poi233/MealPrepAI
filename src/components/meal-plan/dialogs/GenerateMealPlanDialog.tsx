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
import { useNormalizedMealPlan } from "@/contexts/NormalizedMealPlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { normalizeStringInput } from "@/lib/utils";

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
  const { activeMealPlan, isLoading: isMealPlanLoading, error: mealPlanError, setError: setMealPlanError, createNewMealPlan, setAsActive } = useNormalizedMealPlan();
  const { user } = useAuth();

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
        // If there's an active plan and it has a description, use it
        if (activeMealPlan && activeMealPlan.description) {
          descriptionToSet = activeMealPlan.description;
        }
      }
      
      form.reset({
        planName: nameToSet,
        planDescription: descriptionToSet,
      });
    }
  }, [isOpen, currentActivePlanName, activeMealPlan, form]);

  async function onSubmit(values: MealPlanFormValues) {
    if (!user?.id) {
      toast({
        title: "认证错误",
        description: "请先登录以创建膳食计划。",
        variant: "destructive",
      });
      return;
    }

    setMealPlanError(null);
    
    const normalizedPlanName = normalizeStringInput(values.planName);

    try {
      // Create a new meal plan using the normalized system
      const newMealPlan = await createNewMealPlan({
        userId: user.id,
        name: normalizedPlanName,
        description: values.planDescription,
        weekStartDate: new Date(),
        isActive: false
      });

      // Set it as the active meal plan
      await setAsActive(user.id, newMealPlan.id);
      setActivePlanName(normalizedPlanName);

      toast({
        title: "膳食计划已创建！",
        description: `您的膳食计划 "${normalizedPlanName}" 已创建并设为活动计划。`,
      });

      if (onPlanGenerated) {
        onPlanGenerated(normalizedPlanName);
      }
      onClose(); 
    } catch (e) { 
      const errorMessage = e instanceof Error ? e.message : "发生意外错误。";
      setMealPlanError(errorMessage); 
      toast({
        title: "操作错误",
        description: errorMessage,
        variant: "destructive",
      });
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