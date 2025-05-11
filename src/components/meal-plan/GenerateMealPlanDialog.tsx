"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { generateMealPlanAction, getSavedMealPlanAction } from "@/app/actions";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { normalizePreferences } from "@/lib/utils";
import type { GenerateWeeklyMealPlanOutput } from "@/ai/flows/generate-weekly-meal-plan";
import type { MealPlanState } from "@/contexts/MealPlanContext";

const mealPreferencesFormSchema = z.object({
  dietaryPreferences: z.string()
    .transform(val => normalizePreferences(val))
    .pipe(z.string().min(3, {
        message: "Please enter your dietary preferences (at least 3 characters).",
    }).max(500, {
        message: "Dietary preferences must not exceed 500 characters.",
    })),
});

type MealPreferencesFormValues = z.infer<typeof mealPreferencesFormSchema>;

interface GenerateMealPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GenerateMealPlanDialog({ isOpen, onClose }: GenerateMealPlanDialogProps) {
  const { toast } = useToast();
  const { dietaryPreferences: profilePreferences, setDietaryPreferences: setProfilePreferences } = useUserProfile();
  const { setMealPlan, setIsLoading, setError, isLoading: isMealPlanLoading } = useMealPlan();

  const form = useForm<MealPreferencesFormValues>({
    resolver: zodResolver(mealPreferencesFormSchema),
    defaultValues: {
      dietaryPreferences: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      const normalizedProfilePrefs = normalizePreferences(profilePreferences);
      form.reset({ dietaryPreferences: normalizedProfilePrefs });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilePreferences, isOpen]);

  async function onSubmit(values: MealPreferencesFormValues) {
    setIsLoading(true);
    setError(null);
    
    const currentNormalizedPrefs = normalizePreferences(values.dietaryPreferences);
    
    if (currentNormalizedPrefs !== normalizePreferences(profilePreferences)) {
      setProfilePreferences(currentNormalizedPrefs); 
      toast({
        title: "Preferences Updated",
        description: "Your dietary preferences have been updated in your profile.",
        variant: "default",
      });
    }

    let planToSet: GenerateWeeklyMealPlanOutput | null = null;
    let finalError: string | null = null;

    try {
      const existingPlanOutcome = await getSavedMealPlanAction(currentNormalizedPrefs);

      if (existingPlanOutcome && !("error" in existingPlanOutcome)) {
        planToSet = existingPlanOutcome;
        toast({
          title: "Meal Plan Loaded",
          description: "Found a saved meal plan for these preferences.",
        });
      } else {
        if (existingPlanOutcome && "error" in existingPlanOutcome) {
          console.error("Error fetching saved meal plan from DB:", existingPlanOutcome.error);
          toast({
            title: "Could Not Load Saved Plan",
            description: `${existingPlanOutcome.error}. Attempting to generate a new one.`,
            variant: "default",
          });
        }
        
        const generationResult = await generateMealPlanAction({ dietaryPreferences: currentNormalizedPrefs });

        if ("error" in generationResult) {
          finalError = generationResult.error;
          toast({
            title: "Error Generating Plan",
            description: generationResult.error,
            variant: "destructive",
          });
        } else {
          planToSet = generationResult as GenerateWeeklyMealPlanOutput;
          toast({
            title: "Meal Plan Generated!",
            description: "Your personalized 7-day meal plan is ready.",
          });
        }
      }

      if (planToSet) {
        // When setting the meal plan, include loadedForPrefs
        setMealPlan({ ...planToSet, loadedForPrefs: currentNormalizedPrefs });
        onClose(); 
      }
      
      if (finalError) {
        setError(finalError);
        // If generation failed after an attempt to load an existing plan also failed (or was skipped),
        // ensure an empty plan state is set for these prefs to avoid reload loops on the main page.
        if (!planToSet) {
           setMealPlan({ weeklyMealPlan: [], loadedForPrefs: currentNormalizedPrefs });
        }
      }

    } catch (e: any) { 
      const errorMessage = e.message || "An unexpected error occurred.";
      setError(errorMessage); 
      setMealPlan({ weeklyMealPlan: [], loadedForPrefs: currentNormalizedPrefs }); // Mark attempt on error
      toast({
        title: "Operation Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Generate New MealPlan</DialogTitle>
          <DialogDescription>
            Enter your dietary preferences below. We&apos;ll use them to create a personalized 7-day meal plan.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="dietaryPreferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Dietary Preferences</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., vegetarian, low-carb, no nuts, high protein..."
                      className="min-h-[100px] resize-y text-sm"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    These preferences will also update your profile.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isMealPlanLoading}>
                <Sparkles className="mr-2 h-4 w-4" />
                {isMealPlanLoading ? "Processing..." : "Generate Plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
