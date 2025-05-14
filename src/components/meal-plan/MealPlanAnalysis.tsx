
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Brain, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeMealPlanAction, getMealPlanAnalysisAction } from '@/app/actions';
import type { AnalyzeMealPlanActionInput } from '@/app/actions';
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
import { useUserProfile } from '@/contexts/UserProfileContext';

interface MealPlanAnalysisProps {
  currentMealPlan: MealPlanData | null;
}

export default function MealPlanAnalysis({ currentMealPlan }: MealPlanAnalysisProps) {
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const { toast } = useToast();
  const { activePlanName } = useUserProfile();

  const fetchAnalysis = useCallback(async (planName: string | null | undefined) => {
    if (!planName) {
      setAnalysisText(null);
      setIsAccordionOpen(false);
      return;
    }
    setIsFetching(true);
    setFetchError(null);
    try {
      const result = await getMealPlanAnalysisAction(planName);
      if (result && "analysisText" in result) {
        setAnalysisText(result.analysisText);
        // setIsAccordionOpen(!!result.analysisText); // Open if text exists
      } else if (result && "error" in result) {
        setFetchError(result.error);
        setAnalysisText(null);
        setIsAccordionOpen(false);
      } else { // Plan not found or no analysis yet
        setAnalysisText(null);
        setIsAccordionOpen(false);
      }
    } catch (e: any) {
      setFetchError(e.message || '获取分析时发生未知错误。');
      setAnalysisText(null);
      setIsAccordionOpen(false);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (activePlanName) {
        fetchAnalysis(activePlanName);
    } else {
        setAnalysisText(null);
        setIsAccordionOpen(false);
    }
  }, [activePlanName, fetchAnalysis]);

  const handleAnalyzePlan = async () => {
    if (!currentMealPlan || !currentMealPlan.weeklyMealPlan || !currentMealPlan.planDescription) {
      toast({
        title: '无法分析',
        description: '当前没有有效的膳食计划或计划描述可供分析。',
        variant: 'destructive',
      });
      return;
    }
    if (!activePlanName) {
        toast({
            title: '无法分析',
            description: '没有活动的计划名称，无法保存生成的分析。',
            variant: 'destructive',
        });
        return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    // setAnalysisText(null); // Optionally clear previous results immediately

    const input: AnalyzeMealPlanActionInput = {
      planName: activePlanName,
      planDescription: currentMealPlan.planDescription,
      weeklyMealPlan: currentMealPlan.weeklyMealPlan,
    };

    try {
      const result = await analyzeMealPlanAction(input);
      if ('error' in result) {
        setGenerationError(result.error);
        toast({
          title: '分析错误',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        setAnalysisText(result.analysisText);
        setIsAccordionOpen(true); 
        toast({
          title: '分析完成并已保存',
          description: 'AI已提供膳食计划分析并保存到数据库。',
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || '分析过程中发生未知错误。';
      setGenerationError(errorMessage);
      toast({
        title: '分析失败',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const canAnalyze = !!currentMealPlan && !!currentMealPlan.weeklyMealPlan && currentMealPlan.weeklyMealPlan.length > 0 && !!currentMealPlan.planDescription && !!activePlanName;

  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Brain className="h-6 w-6 text-primary" />
          膳食计划AI分析
        </CardTitle>
        <CardDescription>
          让AI分析您当前的膳食计划，评估其营养均衡性、多样性并提供改进建议。分析结果会自动保存。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleAnalyzePlan}
          disabled={isGenerating || isFetching || !canAnalyze}
          className="w-full sm:w-auto"
        >
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Brain className="mr-2 h-4 w-4" />
          )}
          {isGenerating ? '正在分析...' : (analysisText ? '重新分析并保存' : '开始分析当前计划')}
        </Button>

        {!canAnalyze && !isGenerating && !isFetching && (
           <Alert variant="default" className="mt-4 bg-muted/50">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>提示</AlertTitle>
             <AlertDesc>
               请先确保已加载或生成一个包含有效描述的膳食计划，并且有一个活动的计划名称，然后才能进行分析。
             </AlertDesc>
           </Alert>
        )}
        
        {isFetching && !analysisText && (
             <div className="mt-6 flex items-center justify-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                <p className="text-muted-foreground">正在加载已保存的分析...</p>
            </div>
        )}

        {fetchError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>加载分析出错</AlertTitle>
            <AlertDesc>{fetchError}</AlertDesc>
          </Alert>
        )}
        {generationError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>分析时出错</AlertTitle>
            <AlertDesc>{generationError}</AlertDesc>
          </Alert>
        )}

        {(analysisText !== null && !fetchError) && (
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
                 {analysisText.trim() === "" ? (
                    <p className="text-sm text-muted-foreground italic p-4 text-center">分析内容为空或尚未生成详细内容。</p>
                 ) : (
                    <div className="p-4 border rounded-md bg-card shadow-inner max-h-96 overflow-y-auto">
                      <div className="prose prose-sm max-w-none text-sm text-foreground leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisText}</ReactMarkdown>
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
