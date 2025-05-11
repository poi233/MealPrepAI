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
import { ListChecks, Utensils, BookOpen, Trash2, Edit3 } from "lucide-react";

interface MealItemCardProps {
  mealType: string; // e.g., "Breakfast", "Lunch", "Dinner"
  meal: Meal;
  onDelete: () => void;
  onEdit?: () => void; 
}

export default function MealItemCard({ mealType, meal, onDelete, onEdit }: MealItemCardProps) {
  let mealIcon;
  // Ensure mealType is defined and not null before calling toLowerCase
  const lowerMealType = mealType?.toLowerCase() || "";

  switch (lowerMealType) {
    case "breakfast":
      mealIcon = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-coffee"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a4 4 0 0 1-4 4h-1a2 2 0 1 1-4 0h-1a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1Z"/><path d="M6 22H4a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M7 15h10"/></svg>;
      break;
    case "lunch":
      mealIcon = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-carrot"><path d="M2.4 14.7A16.9 16.9 0 0 0 10 21.9c2.1 0 4.1-.4 6-1.2.9-.4 1.7-.9 2.4-1.5.4-.4.8-.8 1.1-1.3L10 0 2.4 14.7Z"/><path d="m7.5 22-3.2-5.3"/><path d="m16.5 22 3.2-5.3"/><path d="M13.6 11.5h.1L10 0 2.4 14.7C2.4 14.7 10 21.9 10 21.9c2.1 0 4.1-.4 6-1.2.9-.4 1.7-.9 2.4-1.5.4-.4.8-.8 1.1-1.3L13.6 11.5Z"/></svg>;
      break;
    case "dinner":
      mealIcon = <Utensils className="h-4 w-4 text-primary" />;
      break;
    default:
      mealIcon = <Utensils className="h-4 w-4 text-primary" />;
  }
  
  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className="text-primary flex-shrink-0">{mealIcon}</div>
            <Badge variant="secondary" className="text-xs py-0.5 px-1.5 capitalize">{mealType}</Badge>
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-6 w-6 text-muted-foreground hover:text-accent"
                aria-label={`Edit ${meal?.recipeName || mealType}`}
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              aria-label={`Delete ${meal?.recipeName || mealType}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <CardTitle className="text-sm font-semibold text-primary leading-tight">{meal?.recipeName || "Recipe Name"}</CardTitle>
        {/* Ensure meal.mealName exists and is different from mealType before rendering CardDescription */}
        {meal?.mealName && meal.mealName !== mealType && <CardDescription className="text-xs">{meal.mealName}</CardDescription>}
      </CardHeader>
      <CardContent className="px-3 pb-2 pt-0 flex-grow text-xs">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="ingredients" className="border-b-0">
            <AccordionTrigger className="text-xs font-medium hover:text-accent py-1.5 [&[data-state=open]>svg]:text-accent">
              <ListChecks className="mr-1.5 h-3.5 w-3.5" /> Ingredients
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-2">
              {(meal?.ingredients && meal.ingredients.length > 0) ? (
                <ul className="list-disc pl-4 space-y-0.5 text-xs text-muted-foreground">
                  {meal.ingredients.map((ingredient, index) => (
                    <li key={index}>{ingredient}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">No ingredients listed.</p>
              )}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="instructions" className="border-b-0">
            <AccordionTrigger className="text-xs font-medium hover:text-accent py-1.5 [&[data-state=open]>svg]:text-accent">
              <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Instructions
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-2">
              <p className="text-xs text-muted-foreground whitespace-pre-line">
                {meal?.instructions || "No instructions provided."}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
