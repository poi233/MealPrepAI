
"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed, Sparkles, ListFilter, ChevronsUpDown } from 'lucide-react';
import GenerateMealPlanDialog from '@/components/meal-plan/GenerateMealPlanDialog';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { getAllSavedMealPlanPreferencesAction } from '@/app/actions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { normalizePreferences } from '@/lib/utils';


export default function Header() {
  const [isGeneratePlanDialogOpen, setIsGeneratePlanDialogOpen] = useState(false);
  const { dietaryPreferences: currentProfilePreferences, setDietaryPreferences } = useUserProfile();
  const [savedPreferences, setSavedPreferences] = useState<string[]>([]);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPreferences = async () => {
      setIsLoadingPreferences(true);
      const result = await getAllSavedMealPlanPreferencesAction();
      if ("error" in result) {
        toast({
          title: "Error loading saved plans",
          description: result.error,
          variant: "destructive",
        });
        setSavedPreferences([]);
      } else {
        setSavedPreferences(result);
      }
      setIsLoadingPreferences(false);
    };
    fetchPreferences();
  }, [toast]);

  const handlePreferenceChange = (newPreference: string) => {
    const normalizedNewPref = normalizePreferences(newPreference);
    setDietaryPreferences(normalizedNewPref);
     toast({
        title: "Plan Switched",
        description: `Loading meal plan for: ${normalizedNewPref || 'cleared preferences'}.`,
      });
  };
  
  // Ensure currentProfilePreferences is always a string for Select value
  const selectValue = currentProfilePreferences || "";

  return (
    <>
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-xl md:text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
            <UtensilsCrossed size={28} />
            <span>MealPrepAI</span>
          </Link>
          <nav className="flex items-center gap-2 flex-wrap">
            {savedPreferences.length > 0 && (
                <Select
                  value={selectValue}
                  onValueChange={handlePreferenceChange}
                  disabled={isLoadingPreferences}
                >
                  <SelectTrigger className="w-auto min-w-[180px] max-w-[250px] h-9 text-xs sm:text-sm border-primary/50 text-primary focus:ring-primary/50">
                     <ListFilter className="mr-1.5 h-3.5 w-3.5 opacity-80" />
                    <SelectValue placeholder="Switch Saved Plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedPreferences.map((pref) => (
                      <SelectItem key={pref} value={pref} className="text-xs sm:text-sm">
                        {pref.length > 30 ? `${pref.substring(0, 27)}...` : pref}
                      </SelectItem>
                    ))}
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
        onPlanGenerated={(newPrefs) => {
          // Refresh saved preferences list if a new plan with new prefs is made
          if (!savedPreferences.includes(newPrefs)) {
             setSavedPreferences(prev => [...prev, newPrefs].sort());
          }
        }}
      />
    </>
  );
}
