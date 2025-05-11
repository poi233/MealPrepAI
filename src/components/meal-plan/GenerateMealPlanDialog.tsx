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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { generateMealPlanAction, getSavedMealPlanByNameAction, type GenerateMealPlanActionInput } from "@/app/actions";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { normalizeStringInput } from "@/lib/utils";
import type { GenerateWeeklyMealPlanOutput } from "@/ai/flows/generate-weekly-meal-plan";


const mealPlanFormSchema = z.object({
  planName: z.string()
    .transform(val => normalizeStringInput(val))
    .pipe(z.string().min(1, {
        message: "Plan name is required.",
    }).max(100, {
        message: "Plan name must not exceed 100 characters.",
    })),
  planDescription: z.string()
    .min(10, { // Min length for a meaningful description
        message: "Plan description must be at least 10 characters.",
    }).max(1000, {
        message: "Plan description must not exceed 1000 characters.",
    }),
});

type MealPlanFormValues = z.infer<typeof mealPlanFormSchema>;

interface GenerateMealPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanGenerated?: (newlyGeneratedPlanName: string) => void; 
}

const DEFAULT_PLAN_NAME = "My Default Plan";
const DEFAULT_PLAN_DESCRIPTION = "A balanced and healthy weekly meal plan. Please include a variety of protein sources, vegetables, and whole grains. Avoid excessive sugar and processed foods.";

export default function GenerateMealPlanDialog({ isOpen, onClose, onPlanGenerated }: GenerateMealPlanDialogProps) {
  const { toast } = useToast();
  const { setActivePlanName, activePlanName: currentActivePlanName } = useUserProfile();
  const { setMealPlan, setIsLoading: setMealPlanLoading, setError: setMealPlanError, isLoading: isMealPlanLoading } = useMealPlan();

  const form = useForm<MealPlanFormValues>({
    resolver: zodResolver(mealPlanFormSchema),
    defaultValues: {
      planName: DEFAULT_PLAN_NAME,
      planDescription: DEFAULT_PLAN_DESCRIPTION,
    },
  });

  useEffect(() => {
    if (isOpen) {
      // If there's an active plan, prefill with its name and description if desired,
      // or always start with defaults for a "new" plan generation.
      // For now, let's stick to defaults or last user input if dialog was re-opened.
      // Resetting to defaults each time might be better for "Generate New"
      form.reset({
        planName: currentActivePlanName || DEFAULT_PLAN_NAME,
        planDescription: DEFAULT_PLAN_DESCRIPTION // Or fetch description of currentActivePlanName
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentActivePlanName]); // form not needed in dep array for reset

  async function onSubmit(values: MealPlanFormValues) {
    setMealPlanLoading(true);
    setMealPlanError(null);
    
    const normalizedPlanName = normalizeStringInput(values.planName);

    const actionInput: GenerateMealPlanActionInput = {
      planName: normalizedPlanName,
      planDescription: values.planDescription,
    };

    try {
      // Check if plan with this name already exists to inform user, or just overwrite.
      // For now, we will overwrite as per saveMealPlanToDb's ON CONFLICT.
      // A small toast could inform if it's an update.
      const existingPlan = await getSavedMealPlanByNameAction(normalizedPlanName);
      const isUpdate = existingPlan && !("error" in existingPlan);

      const generationResult = await generateMealPlanAction(actionInput);

      if ("error" in generationResult) {
        setMealPlanError(generationResult.error);
        toast({
          title: "Error Generating Plan",
          description: generationResult.error,
          variant: "destructive",
        });
        setMealPlan({ weeklyMealPlan: [], planDescription: values.planDescription }); // Clear plan on error
      } else {
        setMealPlan({ ...generationResult, planDescription: values.planDescription });
        setActivePlanName(normalizedPlanName); // This will also trigger DB update for active status
        toast({
          title: isUpdate ? "Meal Plan Updated!" : "Meal Plan Generated!",
          description: `Your personalized 7-day meal plan "${normalizedPlanName}" is ready.`,
        });
        if (onPlanGenerated) {
          onPlanGenerated(normalizedPlanName);
        }
        onClose(); 
      }
    } catch (e: any) { 
      const errorMessage = e.message || "An unexpected error occurred.";
      setMealPlanError(errorMessage); 
      setMealPlan({ weeklyMealPlan: [], planDescription: values.planDescription }); // Clear plan on error
      toast({
        title: "Operation Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setMealPlanLoading(false);
    }
  }
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate or Update Meal Plan</DialogTitle>
          <DialogDescription>
            Enter a name for your plan and describe your dietary needs.
            If a plan with this name exists, it will be updated.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="planName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Plan Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., My Weekly Healthy Mix" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    A unique name for this meal plan.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="planDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Plan Description (for AI)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., vegetarian, low-carb, no nuts, high protein, for weight loss, quick meals..."
                      className="min-h-[120px] resize-y text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Provide details for the AI to generate your meal plan.
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
                {isMealPlanLoading ? "Processing..." : "Generate / Update Plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
