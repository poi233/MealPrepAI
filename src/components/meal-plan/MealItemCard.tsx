
"use client";

import type { Meal } from "@/ai/flows/generate-weekly-meal-plan";
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
import { Button } from "@/components/ui/button";
import { ListChecks, Utensils, BookOpen, Trash2 } from "lucide-react";

interface MealItemCardProps {
  mealType: string; // e.g., "Breakfast", "Lunch", "Dinner"
  meal: Meal;
  onDelete: () => void;
}

export default function MealItemCard({ mealType, meal, onDelete }: MealItemCardProps) {
  let mealIcon;
  switch (mealType.toLowerCase()) {
    case "breakfast":
      mealIcon = <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-coffee"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a4 4 0 0 1-4 4h-1a2 2 0 1 1-4 0h-1a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1Z"/><path d="M6 22H4a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M7 15h10"/></svg>;
      break;
    case "lunch":
      mealIcon = <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-carrot"><path d="M2.4 14.7A16.9 16.9 0 0 0 10 21.9c2.1 0 4.1-.4 6-1.2.9-.4 1.7-.9 2.4-1.5.4-.4.8-.8 1.1-1.3L10 0 2.4 14.7Z"/><path d="m7.5 22-3.2-5.3"/><path d="m16.5 22 3.2-5.3"/><path d="M13.6 11.5h.1L10 0 2.4 14.7C2.4 14.7 10 21.9 10 21.9c2.1 0 4.1-.4 6-1.2.9-.4 1.7-.9 2.4-1.5.4-.4.8-.8 1.1-1.3L13.6 11.5Z"/></svg>;
      break;
    case "dinner":
      mealIcon = <Utensils className="h-5 w-5 text-primary" />;
      break;
    default:
      mealIcon = <Utensils className="h-5 w-5 text-primary" />;
  }
  
  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between mb-1">
          <Badge variant="secondary" className="text-xs py-0.5 px-1.5">{mealType}</Badge>
          <div className="text-primary">{mealIcon}</div>
        </div>
        <CardTitle className="text-md font-semibold text-primary">{meal.recipeName}</CardTitle>
        {meal.mealName && meal.mealName !== mealType && <CardDescription className="text-xs">{meal.mealName}</CardDescription>}
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0 flex-grow">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="ingredients">
            <AccordionTrigger className="text-sm font-medium hover:text-accent py-2">
              <ListChecks className="mr-2 h-4 w-4" /> Ingredients
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-2">
              <ul className="list-disc pl-4 space-y-0.5 text-xs text-muted-foreground">
                {meal.ingredients.map((ingredient, index) => (
                  <li key={index}>{ingredient}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="instructions" className="border-b-0">
            <AccordionTrigger className="text-sm font-medium hover:text-accent py-2">
              <BookOpen className="mr-2 h-4 w-4" /> Instructions
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-2">
              <p className="text-xs text-muted-foreground whitespace-pre-line leading-snug">
                {meal.instructions}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
      <div className="px-4 pb-3 pt-1 mt-auto border-t">
        <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete {mealType}
          </Button>
      </div>
    </Card>
  );
}
