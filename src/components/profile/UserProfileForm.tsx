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
import { useEffect } from "react";
import { Save } from "lucide-react";
import { normalizePreferences } from "@/lib/utils";

const profileFormSchema = z.object({
  dietaryPreferences: z.string()
    .transform(val => normalizePreferences(val))
    .pipe(z.string().max(500, {
      message: "Dietary preferences must not exceed 500 characters after normalization.",
    }))
    .optional()
    .or(z.literal('')), // Allows empty string, which normalize('') produces.
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function UserProfileForm() {
  const { toast } = useToast();
  const { dietaryPreferences, setDietaryPreferences } = useUserProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      dietaryPreferences: dietaryPreferences || "",
    },
  });

  useEffect(() => {
    // userProfilePreferences from context is already normalized
    form.reset({ dietaryPreferences: dietaryPreferences || "" });
  }, [dietaryPreferences, form]);

  function onSubmit(values: ProfileFormValues) {
    // values.dietaryPreferences is already normalized by Zod transform.
    // It can be "" if user cleared the field, or undefined if field was never touched and schema is optional.
    // useUserProfile's setDietaryPreferences will handle normalize(undefined) -> ""
    setDietaryPreferences(values.dietaryPreferences || ""); 
    toast({
      title: "Profile Updated",
      description: "Your dietary preferences have been saved.",
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 bg-card p-6 sm:p-8 rounded-lg shadow-lg max-w-2xl mx-auto">
        <FormField
          control={form.control}
          name="dietaryPreferences"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xl font-semibold">Your Dietary Preferences</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., vegetarian, gluten-free, allergic to peanuts, prefer high-protein meals... Leave blank to clear."
                  className="min-h-[150px] resize-y"
                  {...field}
                  // Ensure field.value is never null/undefined for Textarea
                  value={field.value ?? ""} 
                />
              </FormControl>
              <FormDescription>
                These preferences will be used to pre-fill the meal generator form. You can always adjust them when generating a new plan.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
          <Save className="mr-2 h-5 w-5" />
          Save Preferences
        </Button>
      </form>
    </Form>
  );
}
