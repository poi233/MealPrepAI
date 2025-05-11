
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { generateMealPlanAction, getSavedMealPlanAction } from "@/app/actions";
import { useEffect } from "react";
import { Lightbulb, Sparkles } from "lucide-react";
import { normalizePreferences } from "@/lib/utils";
import type { GenerateWeeklyMealPlanOutput } from "@/ai/flows/generate-weekly-meal-plan";

const mealPreferencesFormSchema = z.object({
  dietaryPreferences: z.string()
    .transform(val => normalizePreferences(val)) // Normalize before length check
    .pipe(z.string().min(3, {
        message: "Please enter your dietary preferences (at least 3 characters).",
    }).max(500, {
        message: "Dietary preferences must not exceed 500 characters.",
    })),
});

type MealPreferencesFormValues = z.infer<typeof mealPreferencesFormSchema>;

export default function MealPreferencesForm() {
  const { toast } = useToast();
  const { dietaryPreferences: profilePreferences, setDietaryPreferences: setProfilePreferences } = useUserProfile();
  const { setMealPlan, setIsLoading, setError, mealPlan, isLoading: isMealPlanLoading } = useMealPlan();

  const form = useForm<MealPreferencesFormValues>({
    resolver: zodResolver(mealPreferencesFormSchema),
    defaultValues: {
      dietaryPreferences: profilePreferences || "",
    },
  });

  // Effect to pre-fill form with profile preferences or load existing plan
  useEffect(() => {
    const normalizedProfilePrefs = normalizePreferences(profilePreferences);
    form.reset({ dietaryPreferences: normalizedProfilePrefs });

    if (normalizedProfilePrefs && !mealPlan && !isMealPlanLoading) {
      // Attempt to load saved plan if preferences exist, no plan is loaded, and not currently loading
      const loadSavedPlan = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const existingPlan = await getSavedMealPlanAction(normalizedProfilePrefs);
          if (existingPlan && !("error" in existingPlan)) {
            setMealPlan(existingPlan);
            toast({
              title: "Meal Plan Loaded",
              description: "Found a saved meal plan for your preferences.",
            });
          } else if (existingPlan && "error" in existingPlan) {
             // Do not show error if plan not found, only for actual fetch errors
             if (!existingPlan.error.toLowerCase().includes("not found")) {
                setError(existingPlan.error);
             }
          }
        } catch (e: any) {
          setError(e.message || "Failed to load saved meal plan.");
        } finally {
          setIsLoading(false);
        }
      };
      loadSavedPlan();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilePreferences, form.reset, setMealPlan, setIsLoading, setError, mealPlan]); // Add mealPlan to dependencies to avoid re-fetching if already loaded

  async function onSubmit(values: MealPreferencesFormValues) {
    setIsLoading(true);
    setError(null);
    setMealPlan(null); // Clear previous meal plan

    // Normalize preferences for consistent API calls and storage
    const currentNormalizedPrefs = normalizePreferences(values.dietaryPreferences);
    
    // Update profile if current form preferences differ from stored profile preferences
    if (currentNormalizedPrefs !== normalizePreferences(profilePreferences)) {
      setProfilePreferences(currentNormalizedPrefs); 
      toast({
        title: "Preferences Updated",
        description: "Your dietary preferences have been updated in your profile.",
        variant: "default",
      });
    }

    try {
      // First, try to get from DB
      const existingPlan = await getSavedMealPlanAction(currentNormalizedPrefs);
      if (existingPlan && !("error" in existingPlan)) {
        setMealPlan(existingPlan);
        toast({
          title: "Meal Plan Loaded",
          description: "Found a saved meal plan for these preferences.",
        });
        setIsLoading(false);
        return;
      } else if (existingPlan && "error" in existingPlan && !existingPlan.error.toLowerCase().includes("not found")) {
        // If there's an error fetching, but it's not 'not found', show it and stop.
        setError(existingPlan.error);
        setIsLoading(false);
        return;
      }
      // If not found or error was 'not found', proceed to generate
      
      const result = await generateMealPlanAction({ dietaryPreferences: currentNormalizedPrefs });

      if ("error" in result) {
        setError(result.error);
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        setMealPlan(result as GenerateWeeklyMealPlanOutput); // Cast because we checked for error
        toast({
          title: "Meal Plan Generated!",
          description: "Your personalized 7-day meal plan is ready.",
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
            <Lightbulb size={32} className="text-primary"/>
            <h1 className="text-3xl font-bold text-primary">
            AI Meal Planner
            </h1>
        </div>
        <p className="text-md text-muted-foreground">
            Tell us your dietary preferences, and we&apos;ll whip up a personalized 7-day meal plan for you!
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-card p-4 sm:p-6 rounded-lg shadow-lg">
          <FormField
            control={form.control}
            name="dietaryPreferences"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold">Dietary Preferences</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., vegetarian, low-carb, no nuts, high protein..."
                    className="min-h-[100px] resize-y text-sm"
                    {...field}
                    value={field.value ?? ""} // Ensure value is not undefined
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Be as specific as you like. Your preferences are saved to your profile.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" size="sm" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-base py-2 px-4" disabled={isMealPlanLoading}>
            <Sparkles className="mr-2 h-4 w-4" />
            {isMealPlanLoading ? "Generating..." : "Generate Meal Plan"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
