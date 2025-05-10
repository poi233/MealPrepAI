"use client";

import MealPreferencesForm from "@/components/meal-plan/MealPreferencesForm";
import GeneratedMealPlan from "@/components/meal-plan/GeneratedMealPlan";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="text-center py-8 md:py-12 bg-card shadow-md rounded-lg">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
            Welcome to MealPrepAI
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Let AI craft your perfect weekly meal plan tailored to your tastes and dietary needs. Healthy eating, simplified!
          </p>
        </div>
      </section>
      
      <section>
        <MealPreferencesForm />
      </section>

      <section>
        <GeneratedMealPlan />
      </section>

      <section className="mt-16 py-12 bg-secondary/50 rounded-lg">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-semibold text-primary mb-4">How It Works</h2>
            <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
              <li><strong className="text-foreground">Tell Us Your Preferences:</strong> Fill out your dietary needs, allergies, and favorite cuisines.</li>
              <li><strong className="text-foreground">AI Magic:</strong> Our smart AI analyzes your input to design a balanced and delicious meal plan.</li>
              <li><strong className="text-foreground">Enjoy Your Meals:</strong> Get a full 7-day plan with recipes, ingredients, and instructions.</li>
            </ol>
          </div>
          <div className="relative h-64 md:h-80 rounded-lg overflow-hidden shadow-xl">
            <Image 
              src="https://picsum.photos/600/400?random=1" 
              alt="Healthy food ingredients" 
              layout="fill" 
              objectFit="cover"
              data-ai-hint="healthy food"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
