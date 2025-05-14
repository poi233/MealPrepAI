
"use client";

import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, ListChecks, ClipboardCopy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateShoppingListAction } from '@/app/actions';
import type { GenerateShoppingListInput } from '@/ai/flows/generate-shopping-list';
import type { MealPlanData } from '@/contexts/MealPlanContext';
import { Alert, AlertTitle, AlertDescription as AlertDesc } from '@/components/ui/alert';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ShoppingListGeneratorProps {
  currentMealPlan: MealPlanData | null;
}

export default function ShoppingListGenerator({ currentMealPlan }: ShoppingListGeneratorProps) {
  const [shoppingList, setShoppingList] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateShoppingList = async () => {
    if (!currentMealPlan || !currentMealPlan.weeklyMealPlan || currentMealPlan.weeklyMealPlan.length === 0) {
      toast({
        title: '无法生成购物清单',
        description: '当前没有有效的膳食计划可供生成购物清单。',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setShoppingList(null);

    const input: GenerateShoppingListInput = {
      weeklyMealPlan: currentMealPlan.weeklyMealPlan,
      planDescription: currentMealPlan.planDescription,
    };

    try {
      const result = await generateShoppingListAction(input);
      if ('error' in result) {
        setError(result.error);
        toast({
          title: '生成购物清单错误',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        setShoppingList(result.shoppingListText);
        toast({
          title: '购物清单已生成',
          description: 'AI已为您创建购物清单。',
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || '生成购物清单过程中发生未知错误。';
      setError(errorMessage);
      toast({
        title: '生成购物清单失败',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!shoppingList) {
      toast({ title: '没有内容可复制', variant: 'destructive' });
      return;
    }
    try {
      await navigator.clipboard.writeText(shoppingList);
      toast({ title: '购物清单已复制到剪贴板' });
    } catch (err) {
      toast({ title: '复制失败', description: '无法将内容复制到剪贴板。', variant: 'destructive' });
      console.error('Failed to copy text: ', err);
    }
  };

  const canGenerate = !!currentMealPlan && !!currentMealPlan.weeklyMealPlan && currentMealPlan.weeklyMealPlan.length > 0;

  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <ListChecks className="h-6 w-6 text-primary" />
          购物清单生成器
        </CardTitle>
        <CardDescription>
          根据您当前的膳食计划，AI可以生成一份购物清单。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleGenerateShoppingList}
          disabled={isLoading || !canGenerate}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ListChecks className="mr-2 h-4 w-4" />
          )}
          {isLoading ? '正在生成...' : '生成购物清单'}
        </Button>

        {!canGenerate && !isLoading && (
           <Alert variant="default" className="mt-4 bg-muted/50">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>提示</AlertTitle>
             <AlertDesc>
               请先确保已加载或生成一个膳食计划，然后才能为其生成购物清单。
             </AlertDesc>
           </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>生成出错</AlertTitle>
            <AlertDesc>{error}</AlertDesc>
          </Alert>
        )}

        {shoppingList && !isLoading && (
          <div className="mt-6 p-4 border rounded-md bg-secondary/30 shadow-inner">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-primary">购物清单：</h3>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToClipboard}
                    className="text-primary border-primary hover:bg-primary/10"
                >
                    <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
                    复制清单
                </Button>
            </div>
            <div className="prose prose-sm max-w-none text-sm text-foreground leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{shoppingList}</ReactMarkdown>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

