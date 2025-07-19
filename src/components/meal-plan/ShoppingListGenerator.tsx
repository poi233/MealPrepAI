
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, ListChecks, ClipboardCopy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// Legacy imports removed - shopping list functionality will be reimplemented in normalized system
import type { MealPlan } from '@/types/database.types';
import { Alert, AlertTitle, AlertDescription as AlertDesc } from '@/components/ui/alert';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useUserProfile } from '@/contexts/UserProfileContext';

interface ShoppingListGeneratorProps {
  currentMealPlan: MealPlan | null;
}

export default function ShoppingListGenerator({ currentMealPlan }: ShoppingListGeneratorProps) {
  const [fetchedShoppingListText, setFetchedShoppingListText] = useState<string | null>(null);
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const [isFetchingList, setIsFetchingList] = useState(false);
  const [fetchListError, setFetchListError] = useState<string | null>(null);

  const { activePlanName } = useUserProfile();
  const { toast } = useToast();

  const fetchShoppingList = useCallback(async (planName: string | null | undefined) => {
    if (!planName) {
      setFetchedShoppingListText(null); 
      return;
    }
    // Shopping list functionality is being updated for the normalized system
    setFetchedShoppingListText(null);
  }, []);

  useEffect(() => {
    if (activePlanName && currentMealPlan) { 
      fetchShoppingList(activePlanName);
    } else {
      setFetchedShoppingListText(null); 
    }
  }, [activePlanName, currentMealPlan, fetchShoppingList]);

  const handleGenerateShoppingList = async () => {
    if (!currentMealPlan || !currentMealPlan.items || currentMealPlan.items.length === 0) {
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

    // For now, show a message that this feature is being updated
    toast({
      title: '功能暂不可用',
      description: '购物清单生成功能正在更新中，请稍后再试。',
      variant: 'default',
    });
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

  const canGenerate = !!currentMealPlan && !!currentMealPlan.items && currentMealPlan.items.length > 0 && !!activePlanName;

  return (
    <Card className="mt-4 shadow-lg">
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
          className="w-full sm:w-auto mb-4" 
        >
          {isGeneratingList ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ListChecks className="mr-2 h-4 w-4" />
          )}
          {isGeneratingList ? '正在生成...' : (fetchedShoppingListText ? '重新生成并保存购物清单' : '生成并保存购物清单')}
        </Button>

        {!canGenerate && !isGeneratingList && !isFetchingList && (
           <Alert variant="default" className="bg-muted/50 mt-4">
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
          <div className="mt-4">
             <div className="flex justify-end mb-3 mt-1">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToClipboard}
                    disabled={!fetchedShoppingListText || fetchedShoppingListText.trim() === ""}
                    className="text-primary border-primary hover:bg-primary/10 h-8 px-2.5 py-1.5 text-xs"
                >
                    <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
                    复制清单
                </Button>
            </div>
            {fetchedShoppingListText.trim() === "" ? (
                <p className="text-sm text-muted-foreground italic p-4 text-center">购物清单为空或尚未生成详细内容。</p>
            ) : (
                <div className="p-4 border rounded-md bg-card shadow-inner">
                    <div className="prose prose-sm max-w-none text-sm text-foreground leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{fetchedShoppingListText}</ReactMarkdown>
                    </div>
                </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

