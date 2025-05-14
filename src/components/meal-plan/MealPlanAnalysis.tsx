
"use client";

import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Brain, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeMealPlanAction } from '@/app/actions';
import type { AnalyzeMealPlanInput, AnalyzeMealPlanOutput } from '@/ai/flows/analyze-meal-plan';
import type { MealPlanData } from '@/contexts/MealPlanContext';
import { Alert, AlertTitle, AlertDescription as AlertDesc } from '@/components/ui/alert'; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface MealPlanAnalysisProps {
  currentMealPlan: MealPlanData | null;
}

export default function MealPlanAnalysis({ currentMealPlan }: MealPlanAnalysisProps) {
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const { toast } = useToast();

  const handleAnalyzePlan = async () => {
    if (!currentMealPlan || !currentMealPlan.weeklyMealPlan || !currentMealPlan.planDescription) {
      toast({
        title: '无法分析',
        description: '当前没有有效的膳食计划或计划描述可供分析。',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null); // Clear previous results
    setIsAccordionOpen(false); // Collapse accordion before new analysis

    const input: AnalyzeMealPlanInput = {
      planDescription: currentMealPlan.planDescription,
      weeklyMealPlan: currentMealPlan.weeklyMealPlan,
    };

    try {
      const result = await analyzeMealPlanAction(input);
      if ('error' in result) {
        setError(result.error);
        toast({
          title: '分析错误',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        setAnalysisResult(result.analysisText);
        setIsAccordionOpen(true); // Open accordion to show new results
        toast({
          title: '分析完成',
          description: 'AI已提供膳食计划分析。',
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || '分析过程中发生未知错误。';
      setError(errorMessage);
      toast({
        title: '分析失败',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canAnalyze = !!currentMealPlan && !!currentMealPlan.weeklyMealPlan && currentMealPlan.weeklyMealPlan.length > 0 && !!currentMealPlan.planDescription;

  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Brain className="h-6 w-6 text-primary" />
          膳食计划AI分析
        </CardTitle>
        <CardDescription>
          让AI分析您当前的膳食计划，评估其营养均衡性、多样性并提供改进建议。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleAnalyzePlan}
          disabled={isLoading || !canAnalyze}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Brain className="mr-2 h-4 w-4" />
          )}
          {isLoading ? '正在分析...' : '开始分析当前计划'}
        </Button>

        {!canAnalyze && !isLoading && (
           <Alert variant="default" className="mt-4 bg-muted/50">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>提示</AlertTitle>
             <AlertDesc>
               请先确保已加载或生成一个包含有效描述的膳食计划，然后才能进行分析。
             </AlertDesc>
           </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>分析出错</AlertTitle>
            <AlertDesc>{error}</AlertDesc>
          </Alert>
        )}

        {analysisResult && !isLoading && (
          <Accordion 
            type="single" 
            collapsible 
            className="w-full mt-6 border-t pt-4"
            value={isAccordionOpen ? "analysis-result-item" : ""}
            onValueChange={(value) => setIsAccordionOpen(value === "analysis-result-item")}
          >
            <AccordionItem value="analysis-result-item" className="border-b-0">
              <AccordionTrigger 
                className="w-full flex justify-between items-center p-3 text-md font-semibold text-primary rounded-lg hover:bg-primary/10 transition-colors data-[state=open]:bg-primary/10 [&[data-state=open]>svg]:text-primary"
              >
                <span>查看AI分析结果</span>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-2">
                <div className="p-4 border rounded-md bg-card shadow-inner max-h-96 overflow-y-auto">
                  <div className="prose prose-sm max-w-none text-sm text-foreground leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisResult}</ReactMarkdown>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

