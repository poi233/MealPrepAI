
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

const formSchema = z.object({
  dietaryPreferences: z.string().min(10, {
    message: "Please provide more details about your dietary preferences (at least 10 characters).",
  }).max(500, {
    message: "Dietary preferences must not exceed 500 characters.",
  }),
});

type MealPreferencesFormValues = z.infer<typeof formSchema>;

export default function MealPreferencesForm() {
  const { toast } = useToast();
  const { mealPlan, setMealPlan, setIsLoading, setError, isLoading } = useMealPlan();
  const { dietaryPreferences: userProfilePreferences } = useUserProfile();

  const form = useForm<MealPreferencesFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      // Initialize with profile preferences. This value is used by the useEffect below.
      dietaryPreferences: userProfilePreferences || "",
    },
  });

  const fetchSavedPlan = useCallback(async (preferences: string) => {
    if (!preferences || preferences.trim() === "") {
      // If preferences are cleared (e.g. from profile), ensure no meal plan is displayed.
      if (mealPlan !== null) setMealPlan(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const result = await getSavedMealPlanAction(preferences);
    setIsLoading(false);

    if (result && "error" in result) {
      setError(result.error);
      toast({
        title: "Error Loading Saved Plan",
        description: result.error,
        variant: "destructive",
      });
      setMealPlan(null); // Clear any existing plan on error
    } else if (result) { // result is GenerateWeeklyMealPlanOutput
      setMealPlan(result);
      toast({
        title: "Meal Plan Loaded",
        description: "Loaded a saved meal plan matching your preferences.",
      });
    } else { // result is null (no plan found for these specific preferences)
      // If a plan was displayed for different preferences, clear it.
      if (mealPlan !== null) setMealPlan(null); 
      toast({
        title: "No Saved Plan",
        description: "No saved meal plan found for these preferences. Feel free to generate a new one!",
        duration: 3000,
      });
    }
  }, [setIsLoading, setError, setMealPlan, toast, mealPlan]);

  // Effect to react to userProfilePreferences changes (e.g., from profile page or initial load from localStorage)
  useEffect(() => {
    const currentFormPreferences = form.getValues("dietaryPreferences");

    if (userProfilePreferences) {
      // Profile has preferences
      if (currentFormPreferences !== userProfilePreferences) {
        // Form doesn't match profile: update form and fetch plan for profile's preferences
        form.setValue("dietaryPreferences", userProfilePreferences);
        fetchSavedPlan(userProfilePreferences);
      } else if (mealPlan === null && !isLoading && !error) {
        // Form matches profile, but no plan loaded and not currently loading/error: try fetching.
        // This covers initial mount where defaultValues match profile, or if a previous fetch failed/found nothing.
        fetchSavedPlan(userProfilePreferences);
      }
    } else {
      // Profile has no preferences (cleared or initially empty)
      if (currentFormPreferences !== "") {
        // If form has something, clear it to reflect empty profile
        form.setValue("dietaryPreferences", "");
      }
      if (mealPlan !== null) {
        // If a meal plan was displayed, clear it as profile preferences are now empty
        setMealPlan(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfilePreferences, fetchSavedPlan]); // Dependencies: userProfilePreferences and the memoized fetchSavedPlan. form, mealPlan, isLoading, error are indirectly handled or would cause loops.

  async function onSubmit(values: MealPreferencesFormValues) {
    setIsLoading(true);
    setError(null);
    setMealPlan(null); // Clear any existing plan before generating a new one

    // generateMealPlanAction now also handles saving the generated plan to the DB
    const result = await generateMealPlanAction(values);

    setIsLoading(false);
    if ("error" in result) {
      setError(result.error);
      toast({
        title: "Error Generating Plan",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setMealPlan(result);
      toast({
        title: "Meal Plan Generated!",
        description: "Your new weekly meal plan is ready and saved.",
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
                />
              </FormControl>
              <FormDescription>
                Enter your dietary needs. If a plan for these exact preferences exists in your history, it will be loaded. Otherwise, a new one will be generated and saved.
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
