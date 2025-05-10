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
import { generateMealPlanAction } from "@/app/actions";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useEffect } from "react";
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
  const { setMealPlan, setIsLoading, setError, isLoading } = useMealPlan();
  const { dietaryPreferences: userProfilePreferences } = useUserProfile();

  const form = useForm<MealPreferencesFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dietaryPreferences: "",
    },
  });

  useEffect(() => {
    if (userProfilePreferences) {
      form.setValue("dietaryPreferences", userProfilePreferences);
    }
  }, [userProfilePreferences, form]);

  async function onSubmit(values: MealPreferencesFormValues) {
    setIsLoading(true);
    setError(null);
    setMealPlan(null);

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
        description: "Your weekly meal plan is ready.",
      });
      // Optionally clear form or scroll to plan
      // form.reset({ dietaryPreferences: values.dietaryPreferences }); // Keep preferences for regeneration
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
                Tell us about your eating habits, allergies, and any specific dietary goals. The more detail, the better the plan!
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
          <ChefHat className="mr-2 h-5 w-5" />
          {isLoading ? "Generating Your Plan..." : "Generate Weekly Meal Plan"}
        </Button>
      </form>
    </Form>
  );
}
