"use client";

import type { Meal } from "@/ai/flows/generate-weekly-meal-plan";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ListChecks, BookOpen, Trash2, Edit3, Heart } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React from 'react'; 

interface MealItemCardProps {
  meal: Meal;
  onDelete: () => void;
  onEdit?: () => void; 
}

export default function MealItemCard({ meal, onDelete, onEdit }: MealItemCardProps) {
  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col bg-card/90 backdrop-blur-sm">
      <CardHeader className="pb-1 pt-2 px-2.5">
        <div className="flex items-center justify-between"> 
          <CardTitle 
            className="text-sm font-semibold text-primary leading-tight truncate flex-grow mr-2" 
            title={meal?.recipeName || "食谱名称"}
          >
            {meal?.recipeName || "食谱名称"}
          </CardTitle>
          <div className="flex gap-0.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-red-500"
              aria-label={`收藏 ${meal?.recipeName || '食谱'}`}
            >
              <Heart className="h-3 w-3" />
            </Button>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-5 w-5 text-muted-foreground hover:text-accent"
                aria-label={`编辑 ${meal?.recipeName || '食谱'}`}
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-5 w-5 text-muted-foreground hover:text-destructive"
              aria-label={`删除 ${meal?.recipeName || '食谱'}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2.5 pb-1.5 pt-0 flex-grow text-xs">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="ingredients" className="border-b-0">
            <AccordionTrigger className="text-xs font-medium hover:text-accent py-1 [&[data-state=open]>svg]:text-accent">
              <ListChecks className="mr-1 h-3 w-3" /> 配料
            </AccordionTrigger>
            <AccordionContent className="pt-0.5 pb-1">
              {(meal?.ingredients && meal.ingredients.length > 0) ? (
                <ul className="list-disc pl-3.5 space-y-0.5 text-xs text-muted-foreground">
                  {meal.ingredients.map((ingredient, index) => (
                    <li key={`${meal.recipeName}-ingredient-${index}`}>{ingredient}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">未列出配料。</p>
              )}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="instructions" className="border-b-0">
            <AccordionTrigger className="text-xs font-medium hover:text-accent py-1 [&[data-state=open]>svg]:text-accent">
              <BookOpen className="mr-1 h-3 w-3" /> 制作步骤
            </AccordionTrigger>
            <AccordionContent className="pt-0.5 pb-1">
              {meal?.instructions ? (
                <div className="prose prose-sm max-w-none text-xs text-muted-foreground leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{meal.instructions}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">未提供制作步骤。</p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}