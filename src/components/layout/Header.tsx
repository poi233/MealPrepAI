
"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed, Sparkles } from 'lucide-react';
import GenerateMealPlanDialog from '@/components/meal-plan/GenerateMealPlanDialog';

export default function Header() {
  const [isGeneratePlanDialogOpen, setIsGeneratePlanDialogOpen] = useState(false);

  return (
    <>
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
            <UtensilsCrossed size={28} />
            <span>MealPrepAI</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsGeneratePlanDialogOpen(true)}
              className="border-primary text-primary hover:bg-primary/10"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Meal Plan
            </Button>
            {/* "View Plan" and "Profile" buttons removed */}
          </nav>
        </div>
      </header>
      <GenerateMealPlanDialog
        isOpen={isGeneratePlanDialogOpen}
        onClose={() => setIsGeneratePlanDialogOpen(false)}
      />
    </>
  );
}

