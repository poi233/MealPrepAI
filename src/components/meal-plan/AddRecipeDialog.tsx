
"use client";

import type React from 'react';
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription, 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Meal } from "@/ai/schemas/meal";
import { generateRecipeDetailsAction, suggestRecipeAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Wand2 } from "lucide-react";

const addRecipeFormSchema = z.object({
  recipeName: z.string().min(1, "食谱名称不能为空。"),
  ingredients: z.string().min(1, "配料不能为空。"), 
  instructions: z.string().min(1, "制作步骤不能为空。"),
});

type AddRecipeFormValues = z.infer<typeof addRecipeFormSchema>;

interface AddRecipeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newRecipe: Meal) => void;
  mealTypeTitle: string;
  day: string;
  planDescription: string; 
}

export default function AddRecipeDialog({
  isOpen,
  onClose,
  onSubmit,
  mealTypeTitle,
  day,
  planDescription,
}: AddRecipeDialogProps) {
  const { toast } = useToast();
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [isSuggestingRecipe, setIsSuggestingRecipe] = useState(false);

  const form = useForm<AddRecipeFormValues>({
    resolver: zodResolver(addRecipeFormSchema),
    defaultValues: {
      recipeName: "",
      ingredients: "",
      instructions: "",
    },
  });

  const handleSubmit = (values: AddRecipeFormValues) => {
    const newRecipe: Meal = {
      recipeName: values.recipeName,
      ingredients: values.ingredients.split('\n').map(ing => ing.trim()).filter(ing => ing.length > 0),
      instructions: values.instructions,
    };
    onSubmit(newRecipe);
    form.reset();
    onClose();
  };

  const handleGenerateDetails = async () => {
    const recipeName = form.getValues("recipeName");
    if (!recipeName || recipeName.trim() === "") {
      toast({
        title: "缺少食谱名称",
        description: "请先输入食谱名称以填充其详情。",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingDetails(true);
    try {
      const result = await generateRecipeDetailsAction({ recipeName });
      if ("error" in result) {
        toast({
          title: "AI详情生成错误",
          description: result.error,
          variant: "destructive",
        });
      } else {
        form.setValue("ingredients", result.ingredients.join("\n"));
        form.setValue("instructions", result.instructions);
        toast({
          title: "食谱详情已生成",
          description: "食谱的配料和步骤已填充。",
        });
      }
    } catch (error: any) {
      toast({
        title: "错误",
        description: error.message || "生成食谱详情失败。",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDetails(false);
    }
  };

  const handleSuggestRecipe = async () => {
    if (!planDescription) {
       toast({
        title: "缺少计划背景",
        description: "没有有效的膳食计划描述，无法推荐食谱。",
        variant: "destructive",
      });
      return;
    }
    setIsSuggestingRecipe(true);
    form.reset(); 
    try {
      const result = await suggestRecipeAction({ day, mealType: mealTypeTitle, planDescription });
      if ("error" in result) {
        toast({
          title: "AI推荐错误",
          description: result.error,
          variant: "destructive",
        });
      } else {
        form.setValue("recipeName", result.recipeName);
        form.setValue("ingredients", result.ingredients.join("\n"));
        form.setValue("instructions", result.instructions);
        toast({
          title: "食谱已推荐",
          description: `AI已推荐 "${result.recipeName}" 并填充了详情。`,
        });
      }
    } catch (error: any) {
      toast({
        title: "错误",
        description: error.message || "推荐食谱失败。",
        variant: "destructive",
      });
    } finally {
      setIsSuggestingRecipe(false);
    }
  };


  if (!isOpen) return null;

  // Helper function to map mealTypeTitle (English) to Chinese for DialogDescription
  const getChineseMealType = (englishMealType: string) => {
    switch (englishMealType.toLowerCase()) {
      case 'breakfast': return '早餐';
      case 'lunch': return '午餐';
      case 'dinner': return '晚餐';
      default: return englishMealType;
    }
  };
  const chineseMealType = getChineseMealType(mealTypeTitle);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { form.reset(); onClose();} }}>
      <DialogContent className="sm:max-w-[520px]"> 
        <DialogHeader>
          <DialogTitle>添加新食谱</DialogTitle>
          <DialogDescription>
            手动输入 {day} {chineseMealType} 的食谱详情，或让AI推荐食谱/填充详情。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>食谱名称</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：香辣鸡丁" {...field} disabled={isSuggestingRecipe}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex flex-col sm:flex-row gap-2 justify-end items-center"> 
              <Button
                type="button"
                variant="outline"
                onClick={handleSuggestRecipe}
                disabled={isSuggestingRecipe || isGeneratingDetails || !planDescription}
                className="h-8 px-2.5 py-1.5 text-xs w-full sm:w-auto" 
              >
                {isSuggestingRecipe ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5 mr-1" />
                )}
                AI推荐食谱
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateDetails}
                disabled={isGeneratingDetails || isSuggestingRecipe || !form.watch("recipeName")}
                className="h-8 px-2.5 py-1.5 text-xs w-full sm:w-auto" 
              >
                {isGeneratingDetails ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                )}
                AI填充详情
              </Button>
            </div>
            
            <FormField
              control={form.control}
              name="ingredients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>配料</FormLabel>
                  <FormDescription>每行输入一种配料。</FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder="鸡胸肉\n酱油\n西兰花..."
                      className="min-h-[100px]"
                      {...field}
                      disabled={isSuggestingRecipe}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>制作步骤</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="1. 将鸡肉切块。\n2. 用酱油腌制..."
                      className="min-h-[120px]"
                      {...field}
                      disabled={isSuggestingRecipe}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => { form.reset(); onClose();}}>
                  取消
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isGeneratingDetails || isSuggestingRecipe}>添加食谱</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

