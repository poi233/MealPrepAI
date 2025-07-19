import NormalizedMealPlan from '@/components/meal-plan/NormalizedMealPlan';

export default function MealPlansPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meal Plans</h1>
        <p className="text-gray-600">Create and manage your weekly meal plans</p>
      </div>
      
      <NormalizedMealPlan />
    </div>
  );
}