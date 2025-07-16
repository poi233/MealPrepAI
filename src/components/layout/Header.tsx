
"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed, Sparkles, ListFilter, Heart, FolderHeart, Menu, X } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      <header className="bg-gradient-to-r from-teal-50 to-blue-50 border-b border-teal-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 text-2xl md:text-3xl font-bold text-teal-700 hover:text-teal-800 transition-colors">
              <div className="p-2 bg-teal-600 rounded-xl text-white">
                <UtensilsCrossed size={32} />
              </div>
              <span className="hidden sm:block">膳食规划AI</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-3">
              <Link href="/favorites">
                <Button 
                  variant="ghost" 
                  className="text-teal-700 hover:bg-teal-100 h-10 px-4 font-medium"
                >
                  <Heart className="mr-2 h-4 w-4" />
                  我的收藏
                </Button>
              </Link>
              
              <Link href="/collections">
                <Button 
                  variant="ghost" 
                  className="text-teal-700 hover:bg-teal-100 h-10 px-4 font-medium"
                >
                  <FolderHeart className="mr-2 h-4 w-4" />
                  收藏夹管理
                </Button>
              </Link>

              {(savedPlanNames.length > 0 || isLoadingPlans || isProfileLoading) && (
                <Select
                  value={selectValue}
                  onValueChange={handlePlanChange}
                  disabled={isLoadingPlans || isProfileLoading}
                >
                  <SelectTrigger className="w-auto min-w-[200px] max-w-[280px] h-10 border-teal-300 text-teal-700 focus:ring-teal-500 bg-white/80">
                    <ListFilter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="切换当前计划..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingPlans || isProfileLoading ? (
                      <SelectItem value="loading" disabled>加载计划中...</SelectItem>
                    ) : (
                      <>
                        {savedPlanNames.length === 0 && !activePlanName && (
                          <SelectItem value="no-plans" disabled>暂无已保存的计划。</SelectItem>
                        )}
                        {savedPlanNames.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name.length > 35 ? `${name.substring(0, 32)}...` : name}
                          </SelectItem>
                        ))}
                        {activePlanName && savedPlanNames.length > 0 && (
                          <SelectItem value="---clear---" className="text-red-600">清除当前计划</SelectItem>
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}

              <Button 
                onClick={() => setIsGeneratePlanDialogOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white h-10 px-6 font-medium shadow-md"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                生成膳食计划
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-teal-700 hover:bg-teal-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="lg:hidden mt-4 pt-4 border-t border-teal-200">
              <nav className="flex flex-col gap-2">
                <Link href="/favorites" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-teal-700 hover:bg-teal-100 h-12"
                  >
                    <Heart className="mr-3 h-5 w-5" />
                    我的收藏
                  </Button>
                </Link>
                
                <Link href="/collections" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-teal-700 hover:bg-teal-100 h-12"
                  >
                    <FolderHeart className="mr-3 h-5 w-5" />
                    收藏夹管理
                  </Button>
                </Link>

                {(savedPlanNames.length > 0 || isLoadingPlans || isProfileLoading) && (
                  <div className="px-3 py-2">
                    <Select
                      value={selectValue}
                      onValueChange={handlePlanChange}
                      disabled={isLoadingPlans || isProfileLoading}
                    >
                      <SelectTrigger className="w-full h-12 border-teal-300 text-teal-700 focus:ring-teal-500 bg-white/80">
                        <ListFilter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="切换当前计划..." />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingPlans || isProfileLoading ? (
                          <SelectItem value="loading" disabled>加载计划中...</SelectItem>
                        ) : (
                          <>
                            {savedPlanNames.length === 0 && !activePlanName && (
                              <SelectItem value="no-plans" disabled>暂无已保存的计划。</SelectItem>
                            )}
                            {savedPlanNames.map((name) => (
                              <SelectItem key={name} value={name}>
                                {name.length > 25 ? `${name.substring(0, 22)}...` : name}
                              </SelectItem>
                            ))}
                            {activePlanName && savedPlanNames.length > 0 && (
                              <SelectItem value="---clear---" className="text-red-600">清除当前计划</SelectItem>
                            )}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="px-3 py-2">
                  <Button 
                    onClick={() => {
                      setIsGeneratePlanDialogOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12 font-medium shadow-md"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    生成膳食计划
                  </Button>
                </div>
              </nav>
            </div>
          )}
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

