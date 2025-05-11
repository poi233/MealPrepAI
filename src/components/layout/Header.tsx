"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed, Sparkles, ListFilter } from 'lucide-react';
import GenerateMealPlanDialog from '@/components/meal-plan/GenerateMealPlanDialog';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { getAllSavedMealPlanNamesAction } from '@/app/actions';
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
  const [savedPlanNames, setSavedPlanNames] = useState<string[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const { toast } = useToast();

  const fetchPlanNames = async () => {
    setIsLoadingPlans(true);
    const result = await getAllSavedMealPlanNamesAction();
    if ("error" in result) {
      toast({
        title: "Error loading saved plan names",
        description: result.error,
        variant: "destructive",
      });
      setSavedPlanNames([]);
    } else {
      setSavedPlanNames(result);
    }
    setIsLoadingPlans(false);
  };

  useEffect(() => {
    fetchPlanNames();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); // Intentionally not re-fetching on activePlanName change here; dialog handles refresh

  const handlePlanChange = (newPlanName: string) => {
    if (newPlanName === "---clear---") { // Special value to clear selection
        setActivePlanName(null);
        toast({
            title: "Active Plan Cleared",
            description: `No plan is currently active. Generate or select one.`,
        });
        return;
    }
    const normalizedNewPlan = normalizeStringInput(newPlanName);
    setActivePlanName(normalizedNewPlan); // This updates context and persists to DB
    toast({
      title: "Plan Switched",
      description: `Loading meal plan: ${normalizedNewPlan}.`,
    });
  };
  
  const selectValue = activePlanName || ""; // Ensure Select has a string value or empty for placeholder

  return (
    <>
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-xl md:text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
            <UtensilsCrossed size={28} />
            <span>MealPrepAI</span>
          </Link>
          <nav className="flex items-center gap-2 flex-wrap">
            {(savedPlanNames.length > 0 || isLoadingPlans || isProfileLoading) && (
                <Select
                  value={selectValue}
                  onValueChange={handlePlanChange}
                  disabled={isLoadingPlans || isProfileLoading}
                >
                  <SelectTrigger className="w-auto min-w-[180px] max-w-[250px] h-9 text-xs sm:text-sm border-primary/50 text-primary focus:ring-primary/50">
                     <ListFilter className="mr-1.5 h-3.5 w-3.5 opacity-80" />
                    <SelectValue placeholder="Switch Active Plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingPlans || isProfileLoading ? (
                      <SelectItem value="loading" disabled className="text-xs sm:text-sm">Loading plans...</SelectItem>
                    ) : (
                      <>
                        {savedPlanNames.length === 0 && !activePlanName && (
                           <SelectItem value="no-plans" disabled className="text-xs sm:text-sm">No saved plans yet.</SelectItem>
                        )}
                        {savedPlanNames.map((name) => (
                          <SelectItem key={name} value={name} className="text-xs sm:text-sm">
                            {name.length > 30 ? `${name.substring(0, 27)}...` : name}
                          </SelectItem>
                        ))}
                        {/* Option to clear selection if a plan is active */}
                        {activePlanName && savedPlanNames.length > 0 && (
                            <SelectItem value="---clear---" className="text-xs sm:text-sm text-destructive/80">Clear Active Plan</SelectItem>
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
              Generate Meal Plan
            </Button>
          </nav>
        </div>
      </header>
      <GenerateMealPlanDialog
        isOpen={isGeneratePlanDialogOpen}
        onClose={() => setIsGeneratePlanDialogOpen(false)}
        onPlanGenerated={(newlyGeneratedPlanName) => {
          // Refresh saved plan names list
          fetchPlanNames();
          // setActivePlanName is already called within the dialog's onSubmit
        }}
      />
    </>
  );
}
