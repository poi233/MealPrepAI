"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WeekSelectorProps {
  selectedWeek: Date;
  onWeekChange: (weekStart: Date) => void;
  disabled?: boolean;
}

// Helper function to get the Monday of a given week
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

// Helper function to format week range
function formatWeekRange(mondayDate: Date): string {
  const sunday = new Date(mondayDate);
  sunday.setDate(mondayDate.getDate() + 6);
  
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric' 
  };
  
  const startStr = mondayDate.toLocaleDateString('en-US', options);
  const endStr = sunday.toLocaleDateString('en-US', options);
  const year = mondayDate.getFullYear();
  
  return `Week of ${startStr} - ${endStr}, ${year}`;
}

export function WeekSelector({ selectedWeek, onWeekChange, disabled = false }: WeekSelectorProps) {
  const [currentWeek, setCurrentWeek] = useState<Date>(getMondayOfWeek(selectedWeek));

  useEffect(() => {
    setCurrentWeek(getMondayOfWeek(selectedWeek));
  }, [selectedWeek]);

  const handlePreviousWeek = () => {
    const prevWeek = new Date(currentWeek);
    prevWeek.setDate(currentWeek.getDate() - 7);
    const mondayOfPrevWeek = getMondayOfWeek(prevWeek);
    setCurrentWeek(mondayOfPrevWeek);
    onWeekChange(mondayOfPrevWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(currentWeek.getDate() + 7);
    const mondayOfNextWeek = getMondayOfWeek(nextWeek);
    setCurrentWeek(mondayOfNextWeek);
    onWeekChange(mondayOfNextWeek);
  };

  const handleCurrentWeek = () => {
    const today = new Date();
    const mondayOfCurrentWeek = getMondayOfWeek(today);
    setCurrentWeek(mondayOfCurrentWeek);
    onWeekChange(mondayOfCurrentWeek);
  };

  return (
    <div className="flex items-center justify-between space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreviousWeek}
        disabled={disabled}
        className="p-2"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex-1 text-center">
        <div className="text-sm font-medium">
          {formatWeekRange(currentWeek)}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCurrentWeek}
          disabled={disabled}
          className="text-xs text-muted-foreground hover:text-foreground mt-1"
        >
          Go to current week
        </Button>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleNextWeek}
        disabled={disabled}
        className="p-2"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Export helper functions for use in other components
export { getMondayOfWeek, formatWeekRange };