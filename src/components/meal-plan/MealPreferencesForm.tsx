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
import { generateMealPlanAction, getSavedMealPlanAction } from "@/app/actions";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useEffect, useCallback } from "react";
import { ChefHat } from "lucide-react";
import { normalizePreferences } from "@/lib/utils";

const formSchema = z.object({
  dietaryPreferences: z.string()
    .transform(val => normalizePreferences(val))
    .pipe(z.string().min(1, { message: "Dietary preferences cannot be empty." }))
    .pipe(z.string().min(10, {
      message: "Please provide more details about your dietary preferences (at least 10 characters after normalization).",
    }).max(500, {
      message: "Dietary preferences must not exceed 500 characters after normalization.",
    })),
});

type MealPreferencesFormValues = z.infer<typeof formSchema>;

export default function MealPreferencesForm() {
  const { toast } = useToast();
  const { mealPlan, setMealPlan, setIsLoading, setError, isLoading, error } = useMealPlan();
  const { dietaryPreferences: userProfilePreferences } = useUserProfile();

  const form = useForm<MealPreferencesFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dietaryPreferences: userProfilePreferences || "",
    },
  });

  const fetchSavedPlan = useCallback(async (preferences: string) => {
    const normalizedPrefs = normalizePreferences(preferences); 
    if (!normalizedPrefs) {
      setMealPlan(null); 
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const result = await getSavedMealPlanAction(normalizedPrefs);
    setIsLoading(false);

    if (result && "error" in result) {
      setError(result.error);
      toast({
        title: "Error Loading Saved Plan",
        description: result.error,
        variant: "destructive",
      });
      setMealPlan(null);
    } else if (result) {
      setMealPlan(result);
      toast({
        title: "Meal Plan Loaded",
        description: "Loaded a saved meal plan matching your preferences.",
      });
    } else {
      setMealPlan(null);
      toast({
        title: "No Saved Plan",
        description: "No saved meal plan found for these preferences. Feel free to generate a new one!",
        duration: 3000,
      });
    }
  }, [setIsLoading, setError, setMealPlan, toast]);

  useEffect(() => {
    const currentFormPreferences = normalizePreferences(form.getValues("dietaryPreferences"));
    // userProfilePreferences from context is already normalized or ""

    if (userProfilePreferences) {
      if (currentFormPreferences !== userProfilePreferences) {
        form.setValue("dietaryPreferences", userProfilePreferences, { shouldValidate: true });
        fetchSavedPlan(userProfilePreferences);
      } else { 
        // Form is in sync with profile (currentFormPreferences === userProfilePreferences)
        // This branch is for:
        // - Initial load where form defaults to profile prefs.
        // - Or, user typed in prefs that match profile prefs.
        if (mealPlan === null && !isLoading && !error) { 
          fetchSavedPlan(userProfilePreferences);
        }
      }
    } else { // No profile preferences
      if (currentFormPreferences !== "") { 
        form.setValue("dietaryPreferences", "", { shouldValidate: true });
      }
      if (mealPlan !== null) { 
        setMealPlan(null);
      }
    }
  }, [userProfilePreferences, fetchSavedPlan, mealPlan, isLoading, error, form, setMealPlan]);


  async function onSubmit(values: MealPreferencesFormValues) {
    // values.dietaryPreferences is already normalized and validated by Zod schema's transform and pipe
    setIsLoading(true);
    setError(null);
    setMealPlan(null); 

    const result = await generateMealPlanAction(values); // Pass Zod-processed values

    setIsLoading(false);
    if (result && "error" in result) {
      setError(result.error);
      toast({
        title: "Error Generating Plan",
        description: result.error,
        variant: "destructive",
      });
    } else if (result) {
      setMealPlan(result);
      toast({
        title: "Meal Plan Generated!",
        description: "Your new weekly meal plan is ready and saved.",
      });
    } else {
        setError("Failed to generate meal plan for an unknown reason.");
        toast({
            title: "Error Generating Plan",
            description: "The AI did not return a meal plan.",
            variant: "destructive",
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-card p-6 sm:p-8 rounded-lg shadow-lg">
        <FormField
          control={form.control}
          name="dietaryPreferences"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold">Your Dietary Preferences</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., vegetarian, gluten-free, allergic to peanuts, prefer high-protein meals..."
                  className="min-h-[120px] resize-y"
                  {...field}
                  value={field.value ?? ""} // Ensure value is not null/undefined
                />
              </FormControl>
              <FormDescription>
                Enter your dietary needs (min 10 chars). If a plan for these exact preferences exists in your history, it will be loaded. Otherwise, a new one will be generated and saved.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
          <ChefHat className="mr-2 h-5 w-5" />
          {isLoading ? "Processing..." : "Generate Weekly Meal Plan"}
        </Button>
      </form>
    </Form>
  );
}
