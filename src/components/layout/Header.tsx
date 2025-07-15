
"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed, Sparkles, ListFilter, Heart } from 'lucide-react';
import GenerateMealPlanDialog from '@/components/meal-plan/GenerateMealPlanDialog';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { usePlanList } from '@/contexts/PlanListContext'; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { normalizeStringInput } from '@/lib/utils';


export default function Header() {
  const [isGeneratePlanDialogOpen, setIsGeneratePlanDialogOpen] = useState(false);
  const { activePlanName, setActivePlanName, isLoading: isProfileLoading } = useUserProfile();
  const { savedPlanNames, isLoadingPlans, fetchPlanNames } = usePlanList(); 
  const { toast } = useToast();


  const handlePlanChange = (newPlanName: string) => {
    if (newPlanName === "---clear---") { 
        setActivePlanName(null);
        toast({
            title: "当前计划已清除",
            description: `当前没有活动的计划。请生成或选择一个。`,
        });
        return;
    }
    const normalizedNewPlan = normalizeStringInput(newPlanName);
    setActivePlanName(normalizedNewPlan); 
    toast({
      title: "计划已切换",
      description: `正在加载膳食计划: ${normalizedNewPlan}。`,
    });
  };
  
  const selectValue = activePlanName || ""; 

  return (
    <>
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-xl md:text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
            <UtensilsCrossed size={28} />
            <span>膳食规划AI</span>
          </Link>
          <nav className="flex items-center gap-2 flex-wrap">
            <Link href="/favorites">
              <Button 
                variant="ghost" 
                className="text-primary hover:bg-primary/10 h-9 text-xs sm:text-sm"
              >
                <Heart className="mr-1.5 h-4 w-4" />
                我的收藏
              </Button>
            </Link>
            {(savedPlanNames.length > 0 || isLoadingPlans || isProfileLoading) && (
                <Select
                  value={selectValue}
                  onValueChange={handlePlanChange}
                  disabled={isLoadingPlans || isProfileLoading}
                >
                  <SelectTrigger className="w-auto min-w-[180px] max-w-[250px] h-9 text-xs sm:text-sm border-primary/50 text-primary focus:ring-primary/50">
                     <ListFilter className="mr-1.5 h-3.5 w-3.5 opacity-80" />
                    <SelectValue placeholder="切换当前计划..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingPlans || isProfileLoading ? (
                      <SelectItem value="loading" disabled className="text-xs sm:text-sm">加载计划中...</SelectItem>
                    ) : (
                      <>
                        {savedPlanNames.length === 0 && !activePlanName && (
                           <SelectItem value="no-plans" disabled className="text-xs sm:text-sm">暂无已保存的计划。</SelectItem>
                        )}
                        {savedPlanNames.map((name) => (
                          <SelectItem key={name} value={name} className="text-xs sm:text-sm">
                            {name.length > 30 ? `${name.substring(0, 27)}...` : name}
                          </SelectItem>
                        ))}
                        {activePlanName && savedPlanNames.length > 0 && (
                            <SelectItem value="---clear---" className="text-xs sm:text-sm text-destructive/80">清除当前计划</SelectItem>
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
            )}
             <Button 
              variant="outline" 
              onClick={() => setIsGeneratePlanDialogOpen(true)}
              className="border-primary text-primary hover:bg-primary/10 h-9 text-xs sm:text-sm"
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              生成膳食计划
            </Button>
          </nav>
        </div>
      </header>
      <GenerateMealPlanDialog
        isOpen={isGeneratePlanDialogOpen}
        onClose={() => setIsGeneratePlanDialogOpen(false)}
        onPlanGenerated={async (newlyGeneratedPlanName) => {
          await fetchPlanNames(); 
        }}
      />
    </>
  );
}

