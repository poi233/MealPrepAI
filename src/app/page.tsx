
"use client";

import MealPreferencesForm from "@/components/meal-plan/MealPreferencesForm";
import GeneratedMealPlan from "@/components/meal-plan/GeneratedMealPlan";

export default function HomePage() {
  return (
    <div className="space-y-12 py-8">
      <section>
        <MealPreferencesForm />
      </section>

      <section>
        <GeneratedMealPlan />
      </section>
    </div>
  );
}

