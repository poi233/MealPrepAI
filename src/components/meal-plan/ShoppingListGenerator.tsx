
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, ListChecks, ClipboardCopy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateShoppingListAction, getShoppingListForPlanAction } from '@/app/actions';
import type { GenerateShoppingListActionInput } from '@/app/actions';
import type { MealPlanData } from '@/contexts/MealPlanContext';
import { Alert, AlertTitle, AlertDescription as AlertDesc } from '@/components/ui/alert';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useUserProfile } from '@/contexts/UserProfileContext';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ShoppingListGeneratorProps {
  currentMealPlan: MealPlanData | null;
}

export default function ShoppingListGenerator({ currentMealPlan }: ShoppingListGeneratorProps) {
  const [fetchedShoppingListText, setFetchedShoppingListText] = useState<string | null>(null);
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const [isFetchingList, setIsFetchingList] = useState(false);
  const [fetchListError, setFetchListError] = useState<string | null>(null);

  const [isAccordionOpen, setIsAccordionOpen] = useState(false); // Default to false (folded)


  const { activePlanName } = useUserProfile();
  const { toast } = useToast();

  const fetchShoppingList = useCallback(async (planName: string | null | undefined) => {
    if (!planName) {
      setFetchedShoppingListText(null); 
      setIsAccordionOpen(false);
      return;
    }
    setIsFetchingList(true);
    setFetchListError(null);
    try {
      const result = await getShoppingListForPlanAction(planName);
      if (result && "shoppingListText" in result) {
        setFetchedShoppingListText(result.shoppingListText);
        // Do not automatically open accordion here
        // setIsAccordionOpen(!!(result.shoppingListText && result.shoppingListText.trim() !== "")); 
      } else if (result && "error" in result) {
        setFetchListError(result.error);
        console.warn(`获取购物清单时出错: ${result.error}`);
        setFetchedShoppingListText(null);
        setIsAccordionOpen(false);
      } else {
        setFetchedShoppingListText(null); 
        setIsAccordionOpen(false);
      }
    } catch (e: any) {
      setFetchListError(e.message || '获取购物清单时发生未知错误。');
      setFetchedShoppingListText(null);
      setIsAccordionOpen(false);
    } finally {
      setIsFetchingList(false);
    }
  }, []);

  useEffect(() => {
    if (activePlanName && currentMealPlan) { 
      fetchShoppingList(activePlanName);
    } else {
      setFetchedShoppingListText(null); 
      setIsAccordionOpen(false);
    }
  }, [activePlanName, currentMealPlan, fetchShoppingList]);

  const handleGenerateShoppingList = async () => {
    if (!currentMealPlan || !currentMealPlan.weeklyMealPlan || currentMealPlan.weeklyMealPlan.length === 0) {
      toast({
        title: '无法生成购物清单',
        description: '当前没有有效的膳食计划可供生成购物清单。',
        variant: 'destructive',
      });
      return;
    }
    if (!activePlanName) {
        toast({
            title: '无法生成购物清单',
            description: '没有活动的计划名称，无法保存生成的购物清单。',
            variant: 'destructive',
        });
        return;
    }

    setIsGeneratingList(true);
    setGenerationError(null);
    
    const input: GenerateShoppingListActionInput = {
      planName: activePlanName,
      weeklyMealPlan: currentMealPlan.weeklyMealPlan,
      planDescription: currentMealPlan.planDescription,
    };

    try {
      const result = await generateShoppingListAction(input);
      if ('error' in result) {
        setGenerationError(result.error);
        toast({
          title: '生成购物清单错误',
          description: result.error,
          variant: 'destructive',
        });
        setFetchedShoppingListText(null); 
      } else {
        setFetchedShoppingListText(result.shoppingListText);
        // Do not automatically open accordion here, let user click to open it
        // setIsAccordionOpen(true); 
        toast({
          title: '购物清单已生成并保存',
          description: 'AI已为您创建购物清单并将其保存到数据库。',
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || '生成购物清单过程中发生未知错误。';
      setGenerationError(errorMessage);
      setFetchedShoppingListText(null);
      toast({
        title: '生成购物清单失败',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingList(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!fetchedShoppingListText) {
      toast({ title: '没有内容可复制', variant: 'destructive' });
      return;
    }
    try {
      await navigator.clipboard.writeText(fetchedShoppingListText);
      toast({ title: '购物清单已复制到剪贴板' });
    } catch (err) {
      toast({ title: '复制失败', description: '无法将内容复制到剪贴板。', variant: 'destructive' });
      console.error('Failed to copy text: ', err);
    }
  };

  const canGenerate = !!currentMealPlan && !!currentMealPlan.weeklyMealPlan && currentMealPlan.weeklyMealPlan.length > 0 && !!activePlanName;

  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <ListChecks className="h-6 w-6 text-primary" />
          购物清单生成器
        </CardTitle>
        <CardDescription>
          根据您当前的膳食计划，AI可以生成一份购物清单。生成的清单会自动保存，并可在此查看。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleGenerateShoppingList}
          disabled={isGeneratingList || isFetchingList || !canGenerate}
          className="w-full sm:w-auto"
        >
          {isGeneratingList ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ListChecks className="mr-2 h-4 w-4" />
          )}
          {isGeneratingList ? '正在生成...' : (fetchedShoppingListText ? '重新生成并保存购物清单' : '生成并保存购物清单')}
        </Button>

        {!canGenerate && !isGeneratingList && !isFetchingList && (
           <Alert variant="default" className="mt-4 bg-muted/50">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>提示</AlertTitle>
             <AlertDesc>
               请先确保已加载或生成一个有效的膳食计划，然后才能为其生成购物清单。
             </AlertDesc>
           </Alert>
        )}

        {fetchListError && (
            <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>加载购物清单出错</AlertTitle>
                <AlertDesc>{fetchListError} 请尝试重新生成。</AlertDesc>
            </Alert>
        )}
        {generationError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>生成购物清单出错</AlertTitle>
            <AlertDesc>{generationError}</AlertDesc>
          </Alert>
        )}
        
        {isFetchingList && !fetchedShoppingListText && (
            <div className="mt-6 flex items-center justify-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                <p className="text-muted-foreground">正在加载购物清单...</p>
            </div>
        )}

        {(fetchedShoppingListText !== null && !fetchListError) && (
          <Accordion 
            type="single" 
            collapsible 
            className="w-full mt-6"
            value={isAccordionOpen ? "shopping-list-item" : ""}
            onValueChange={(value) => setIsAccordionOpen(value === "shopping-list-item")}
          >
            <AccordionItem value="shopping-list-item">
              <AccordionTrigger 
                className="text-base font-medium hover:text-accent py-2 [&[data-state=open]>svg]:text-accent"
              >
                查看购物清单
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2">
                 <div className="flex justify-end mb-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyToClipboard}
                        disabled={!fetchedShoppingListText || fetchedShoppingListText.trim() === ""}
                        className="text-primary border-primary hover:bg-primary/10 h-7 px-2 py-1 text-xs"
                    >
                        <ClipboardCopy className="mr-1.5 h-3 w-3" />
                        复制
                    </Button>
                </div>
                {fetchedShoppingListText.trim() === "" ? (
                    <p className="text-sm text-muted-foreground italic p-4 text-center">购物清单为空或尚未生成详细内容。</p>
                ) : (
                    <div className="p-4 border rounded-md bg-secondary/30 shadow-inner">
                        <div className="prose prose-sm max-w-none text-sm text-foreground leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{fetchedShoppingListText}</ReactMarkdown>
                        </div>
                    </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

