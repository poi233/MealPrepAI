
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Brain, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// Legacy imports removed - analysis functionality will be reimplemented in normalized system
import type { MealPlan } from '@/types/database.types';
import { Alert, AlertTitle, AlertDescription as AlertDesc } from '@/components/ui/alert'; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useUserProfile } from '@/contexts/UserProfileContext';

interface MealPlanAnalysisProps {
  currentMealPlan: MealPlan | null;
}

export default function MealPlanAnalysis({ currentMealPlan }: MealPlanAnalysisProps) {
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { toast } = useToast();
  const { activePlanName } = useUserProfile();

  const fetchAnalysis = useCallback(async (planName: string | null | undefined) => {
    if (!planName) {
      setAnalysisText(null);
      return;
    }
    // Analysis functionality is being updated for the normalized system
    setAnalysisText(null);
  }, []);

  useEffect(() => {
    if (activePlanName) {
        fetchAnalysis(activePlanName);
    } else {
        setAnalysisText(null);
    }
  }, [activePlanName, fetchAnalysis]);

  const handleAnalyzePlan = async () => {
    if (!currentMealPlan || !currentMealPlan.items || !currentMealPlan.description) {
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

    // For now, show a message that this feature is being updated
    toast({
      title: '功能暂不可用',
      description: '膳食计划分析功能正在更新中，请稍后再试。',
      variant: 'default',
    });
  };

  const canAnalyze = !!currentMealPlan && !!currentMealPlan.items && currentMealPlan.items.length > 0 && !!currentMealPlan.description && !!activePlanName;

  return (
    <Card className="mt-4 shadow-lg">
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
          className="w-full sm:w-auto mb-4" 
        >
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Brain className="mr-2 h-4 w-4" />
          )}
          {isGenerating ? '正在分析...' : (analysisText ? '重新分析并保存' : '开始分析当前计划')}
        </Button>

        {!canAnalyze && !isGenerating && !isFetching && (
           <Alert variant="default" className="bg-muted/50 mt-4">
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
          <div className="mt-4">
             {analysisText.trim() === "" ? (
                <p className="text-sm text-muted-foreground italic p-4 text-center">分析内容为空或尚未生成详细内容。</p>
             ) : (
                <div className="p-4 border rounded-md bg-card shadow-inner">
                  <div className="prose prose-sm max-w-none text-sm text-foreground leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisText}</ReactMarkdown>
                  </div>
                </div>
             )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

