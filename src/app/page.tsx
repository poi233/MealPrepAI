
"use client";

import GeneratedMealPlan from "@/components/meal-plan/GeneratedMealPlan";

export default function HomePage() {
  return (
    <div className="space-y-12 py-8">
      {/* MealPreferencesForm is removed from here */}
      <section>
        <GeneratedMealPlan />
      </section>
    </div>
  );
}
