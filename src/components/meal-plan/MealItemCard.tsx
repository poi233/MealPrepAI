"use client";

import type { MealSchema } from "@/ai/flows/generate-weekly-meal-plan"; // Assuming MealSchema is exported or define it here
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Utensils, BookOpen } from "lucide-react";

interface MealItem { // Duplicating schema for safety if not exported or to add client-side fields later
  mealName: string;
  recipeName: string;
  ingredients: string[];
  instructions: string;
}

interface MealItemCardProps {
  mealType: string; // e.g., "Breakfast", "Lunch", "Dinner"
  meal: MealItem;
}

export default function MealItemCard({ mealType, meal }: MealItemCardProps) {
  let mealIcon;
  switch (mealType.toLowerCase()) {
    case "breakfast":
      mealIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-coffee"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a4 4 0 0 1-4 4h-1a2 2 0 1 1-4 0h-1a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1Z"/><path d="M6 22H4a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M7 15h10"/></svg>; // Coffee icon
      break;
    case "lunch":
      mealIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-carrot"><path d="M2.4 14.7A16.9 16.9 0 0 0 10 21.9c2.1 0 4.1-.4 6-1.2.9-.4 1.7-.9 2.4-1.5.4-.4.8-.8 1.1-1.3L10 0 2.4 14.7Z"/><path d="m7.5 22-3.2-5.3"/><path d="m16.5 22 3.2-5.3"/><path d="M13.6 11.5h.1L10 0 2.4 14.7C2.4 14.7 10 21.9 10 21.9c2.1 0 4.1-.4 6-1.2.9-.4 1.7-.9 2.4-1.5.4-.4.8-.8 1.1-1.3L13.6 11.5Z"/></svg>; // Carrot icon as placeholder for lunch/salad
      break;
    case "dinner":
      mealIcon = <Utensils className="h-6 w-6 text-primary" />;
      break;
    default:
      mealIcon = <Utensils className="h-6 w-6 text-primary" />;
  }
  
  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="mb-2">{mealType}</Badge>
          <div className="text-primary">{mealIcon}</div>
        </div>
        <CardTitle className="text-xl text-primary">{meal.recipeName}</CardTitle>
        {meal.mealName && meal.mealName !== mealType && <CardDescription>{meal.mealName}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="ingredients">
            <AccordionTrigger className="text-base font-medium hover:text-accent">
              <ListChecks className="mr-2 h-5 w-5" /> Ingredients
            </AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {meal.ingredients.map((ingredient, index) => (
                  <li key={index}>{ingredient}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="instructions">
            <AccordionTrigger className="text-base font-medium hover:text-accent">
              <BookOpen className="mr-2 h-5 w-5" /> Instructions
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {meal.instructions}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
