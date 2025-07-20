"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, ChefHat, Star, Users } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Recipe } from "@/types/database.types";

interface RecipeDetailsDialogProps {
  isOpen: boolean;
  recipe: Recipe | null;
  onClose: () => void;
}

export default function RecipeDetailsDialog({
  isOpen,
  recipe,
  onClose
}: RecipeDetailsDialogProps) {
  if (!recipe) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{recipe.name}</DialogTitle>
          {recipe.description && (
            <DialogDescription className="text-base">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-1">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
                  }}
                >
                  {recipe.description}
                </ReactMarkdown>
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Recipe Info Cards */}
          <div className="recipe-details-grid">
            <Card>
              <CardContent className="p-3 text-center">
                <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
                <div className="text-sm font-medium">{recipe.prepTime + recipe.cookTime} min</div>
                <div className="text-xs text-muted-foreground">Total Time</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 text-center">
                <ChefHat className="h-5 w-5 mx-auto mb-1 text-primary" />
                <div className="text-sm font-medium capitalize">{recipe.difficulty}</div>
                <div className="text-xs text-muted-foreground">Difficulty</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 text-center">
                <Star className="h-5 w-5 mx-auto mb-1 text-primary" />
                <div className="text-sm font-medium">{recipe.avgRating.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Rating</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 text-center">
                <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                <div className="text-sm font-medium">{recipe.ratingCount}</div>
                <div className="text-xs text-muted-foreground">Reviews</div>
              </CardContent>
            </Card>
          </div>

          {/* Tags and Cuisine */}
          <div className="flex flex-wrap gap-2">
            {recipe.cuisine && (
              <Badge variant="secondary">{recipe.cuisine}</Badge>
            )}
            <Badge variant="outline" className="capitalize">{recipe.mealType}</Badge>
            {recipe.tags.map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>

          {/* Nutrition Info */}
          {recipe.nutritionInfo && Object.keys(recipe.nutritionInfo).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nutrition Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {recipe.nutritionInfo.calories && (
                    <div className="text-center">
                      <div className="font-medium">{recipe.nutritionInfo.calories}</div>
                      <div className="text-muted-foreground">Calories</div>
                    </div>
                  )}
                  {recipe.nutritionInfo.protein && (
                    <div className="text-center">
                      <div className="font-medium">{recipe.nutritionInfo.protein}g</div>
                      <div className="text-muted-foreground">Protein</div>
                    </div>
                  )}
                  {recipe.nutritionInfo.carbs && (
                    <div className="text-center">
                      <div className="font-medium">{recipe.nutritionInfo.carbs}g</div>
                      <div className="text-muted-foreground">Carbs</div>
                    </div>
                  )}
                  {recipe.nutritionInfo.fat && (
                    <div className="text-center">
                      <div className="font-medium">{recipe.nutritionInfo.fat}g</div>
                      <div className="text-muted-foreground">Fat</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ingredients</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{ingredient.name}</span>
                      <span className="text-muted-foreground text-sm">
                        {ingredient.amount} {ingredient.unit}
                      </span>
                    </div>
                    {ingredient.notes && (
                      <div className="mt-1 prose prose-sm max-w-none text-xs text-muted-foreground">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-1">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
                          }}
                        >
                          {ingredient.notes}
                        </ReactMarkdown>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-sm leading-relaxed">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-medium mt-2 mb-1">{children}</h3>,
                    p: ({ children }) => <p className="mb-2">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
                    pre: ({ children }) => <pre className="bg-muted p-2 rounded-md overflow-x-auto text-xs mb-2">{children}</pre>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-border pl-4 italic mb-2">{children}</blockquote>,
                  }}
                >
                  {recipe.instructions}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Time Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Time Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-medium">{recipe.prepTime} min</div>
                  <div className="text-muted-foreground">Prep Time</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">{recipe.cookTime} min</div>
                  <div className="text-muted-foreground">Cook Time</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">{recipe.totalTime} min</div>
                  <div className="text-muted-foreground">Total Time</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}