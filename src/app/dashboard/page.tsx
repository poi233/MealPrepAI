import NormalizedMealPlan from '@/components/meal-plan/NormalizedMealPlan';

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Your Meal Plans</h1>
        <p className="text-muted-foreground">Manage your AI-generated meal plans and recipes</p>
      </div>
      
      <NormalizedMealPlan />
    </div>
  );
}