"use client";

import { useState, useEffect } from "react";
import { useNormalizedMealPlan } from "@/contexts/NormalizedMealPlanContext";
import { useAuth } from "@/contexts/AuthContext";
import RecipeSelectionDialog from "./dialogs/RecipeSelectionDialog";
import RecipeDetailsDialog from "./dialogs/RecipeDetailsDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { AlertCircle, Trash2, Utensils, CalendarDays, Plus, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WeekSelector, getMondayOfWeek } from "@/components/ui/week-selector";
import { useToast } from "@/hooks/use-toast";
import type { MealPlanItem, Recipe } from '@/types/database.types';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

interface MealSlotProps {
  dayOfWeek: number;
  mealType: typeof MEAL_TYPES[number];
  items: MealPlanItem[];
  onAssignRecipe: (dayOfWeek: number, mealType: typeof MEAL_TYPES[number]) => void;
  onRemoveRecipe: (dayOfWeek: number, mealType: typeof MEAL_TYPES[number], recipeId: string) => void;
  onViewRecipeDetails: (recipe: Recipe) => void;
}

function MealSlot({ dayOfWeek, mealType, items, onAssignRecipe, onRemoveRecipe, onViewRecipeDetails }: MealSlotProps) {
  const mealItems = items.filter(item => item.dayOfWeek === dayOfWeek && item.mealType === mealType);
  
  return (
    <div className="meal-slot">
      <h4 className="font-medium text-sm text-center text-primary capitalize mb-2">
        {mealType}
      </h4>
      
      {mealItems.length > 0 ? (
        <div className="flex-1 space-y-2">
          {mealItems.map((mealItem, index) => (
            <div 
              key={`${mealItem.recipeId}-${index}`} 
              className="simple-recipe-card group cursor-pointer"
              onClick={() => onViewRecipeDetails(mealItem.recipe)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground truncate flex-1 pr-2 text-center">
                  {mealItem.recipe.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveRecipe(dayOfWeek, mealType, mealItem.recipe.id);
                  }}
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 flex-shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAssignRecipe(dayOfWeek, mealType)}
              className="text-primary border-primary hover:bg-primary/10 h-8 w-8 p-0 border-dashed"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-xs text-muted-foreground italic mb-2 text-center">No {mealType} planned</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAssignRecipe(dayOfWeek, mealType)}
            className="text-primary border-primary hover:bg-primary/10 h-8 w-8 p-0 border-dashed"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface CreateMealPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string, weekStartDate: Date) => void;
  isLoading: boolean;
}

function CreateMealPlanDialog({ isOpen, onClose, onSubmit, isLoading }: CreateMealPlanDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<Date>(getMondayOfWeek(new Date()));

  const handleSubmit = () => {
    if (!name.trim()) return;
    
    onSubmit(name.trim(), description.trim(), selectedWeek);
    
    // Reset form
    setName('');
    setDescription('');
    setSelectedWeek(getMondayOfWeek(new Date()));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Meal Plan</DialogTitle>
          <DialogDescription>
            Create a new meal plan to organize your weekly meals.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Plan Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weekly Meal Plan"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your meal plan goals..."
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="weekSelector">Select Week</Label>
            <div className="mt-2">
              <WeekSelector
                selectedWeek={selectedWeek}
                onWeekChange={setSelectedWeek}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!name.trim() || isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function NormalizedMealPlan() {
  const {
    activeMealPlan,
    userMealPlans,
    isLoading,
    error,
    createNewMealPlan,
    loadUserMealPlans,
    loadActiveMealPlan,
    deleteCurrentMealPlan,
    setAsActive,
    assignRecipe,
    removeRecipe
  } = useNormalizedMealPlan();

  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);
  const [isRecipeDetailsDialogOpen, setIsRecipeDetailsDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    dayOfWeek: number;
    mealType: typeof MEAL_TYPES[number];
  } | null>(null);

  // Load user's meal plans and active meal plan on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      
      try {        
        // Load user's meal plans
        await loadUserMealPlans({
          userId: user.id,
          limit: 20,
          offset: 0
        });
        
        // Load active meal plan
        await loadActiveMealPlan(user.id);
      } catch (err) {
        console.error('Failed to load meal plan data:', err);
      }
    };

    loadData();
  }, [user?.id, loadUserMealPlans, loadActiveMealPlan]);

  const handleCreateMealPlan = async (name: string, description: string, weekStartDate: Date) => {
    if (!user?.id) return;
    
    try {
      const newPlan = await createNewMealPlan({
        userId: user.id,
        name,
        description,
        weekStartDate,
        isActive: false
      });
      
      toast({
        title: "Meal Plan Created",
        description: `"${name}" has been created successfully.`,
      });
      
      // Set as active and reload data
      await setAsActive(user.id, newPlan.id);
      await loadUserMealPlans({
        userId: user.id,
        limit: 20,
        offset: 0
      });
      
      setIsCreateDialogOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create meal plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMealPlan = async () => {
    if (!activeMealPlan) return;
    
    setIsDeleting(true);
    try {
      await deleteCurrentMealPlan();
      
      toast({
        title: "Meal Plan Deleted",
        description: `"${activeMealPlan.name}" has been deleted.`,
      });
      
      // Reload user meal plans
      if (user?.id) {
        await loadUserMealPlans({
          userId: user.id,
          limit: 20,
          offset: 0
        });
      }
      
      setIsDeleteDialogOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete meal plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAssignRecipe = async (dayOfWeek: number, mealType: typeof MEAL_TYPES[number]) => {
    if (!activeMealPlan) return;
    
    // Open recipe selection dialog
    setSelectedSlot({ dayOfWeek, mealType });
    setIsRecipeDialogOpen(true);
  };

  const handleRecipeSelected = async (recipe: Recipe) => {
    if (!activeMealPlan || !selectedSlot) return;
    
    try {
      await assignRecipe(activeMealPlan.id, recipe.id, selectedSlot.dayOfWeek, selectedSlot.mealType);
      toast({
        title: "Recipe Assigned",
        description: `${recipe.name} assigned to ${DAYS_OF_WEEK[selectedSlot.dayOfWeek]} ${selectedSlot.mealType}.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to assign recipe. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveRecipe = async (dayOfWeek: number, mealType: typeof MEAL_TYPES[number], recipeId: string) => {
    if (!activeMealPlan) return;
    
    try {
      await removeRecipe(activeMealPlan.id, dayOfWeek, mealType);
      toast({
        title: "Recipe Removed",
        description: `Recipe removed from ${DAYS_OF_WEEK[dayOfWeek]} ${mealType}.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to remove recipe. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewRecipeDetails = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsRecipeDetailsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 mt-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-full" />
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-24 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          {activeMealPlan && (
            <>
              <h2 className="text-2xl font-bold text-primary">
                {activeMealPlan.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Week of {activeMealPlan.weekStartDate.toLocaleDateString()}
              </p>
            </>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Plan
          </Button>
          
          {activeMealPlan && (
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {activeMealPlan ? (
        <div className="space-y-6">
          {/* Weekly Grid */}
          <div className="weekly-meal-grid">
            {DAYS_OF_WEEK.map((day, dayIndex) => (
              <Card key={day} className="day-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-center text-foreground">
                    <CalendarDays className="h-4 w-4 inline mr-2" />
                    {day}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {MEAL_TYPES.map((mealType) => (
                    <MealSlot
                      key={`${dayIndex}-${mealType}`}
                      dayOfWeek={dayIndex}
                      mealType={mealType}
                      items={activeMealPlan.items}
                      onAssignRecipe={handleAssignRecipe}
                      onRemoveRecipe={handleRemoveRecipe}
                      onViewRecipeDetails={handleViewRecipeDetails}
                    />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Utensils size={64} className="mx-auto text-muted-foreground/50 mb-6" />
          <h3 className="text-xl font-semibold text-primary mb-3">No Active Meal Plan</h3>
          <p className="text-muted-foreground mb-6">
            Create a new meal plan to start organizing your weekly meals.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Meal Plan
          </Button>
        </div>
      )}

      {/* User's Meal Plans List */}
      {userMealPlans.length > 0 && (
        <div className="space-y-4 mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">All Your Meal Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userMealPlans.map((plan) => (
              <Card key={plan.id} className={`cursor-pointer transition-colors ${
                activeMealPlan?.id === plan.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
              }`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Week of {plan.weekStartDate.toLocaleDateString()}</span>
                    <span>{plan.items.length} meals</span>
                  </div>
                  {activeMealPlan?.id !== plan.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => user?.id && setAsActive(user.id, plan.id)}
                    >
                      Set Active
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create Meal Plan Dialog */}
      <CreateMealPlanDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateMealPlan}
        isLoading={isLoading}
      />

      {/* Recipe Selection Dialog */}
      <RecipeSelectionDialog
        isOpen={isRecipeDialogOpen}
        onClose={() => {
          setIsRecipeDialogOpen(false);
          setSelectedSlot(null);
        }}
        onSelectRecipe={handleRecipeSelected}
        currentUserId={user?.id}
        mealType={selectedSlot?.mealType}
        dayName={selectedSlot ? DAYS_OF_WEEK[selectedSlot.dayOfWeek] : undefined}
      />

      {/* Recipe Details Dialog */}
      <RecipeDetailsDialog
        isOpen={isRecipeDetailsDialogOpen}
        recipe={selectedRecipe}
        onClose={() => {
          setIsRecipeDetailsDialogOpen(false);
          setSelectedRecipe(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meal Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{activeMealPlan?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMealPlan}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}