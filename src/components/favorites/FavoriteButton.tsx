/**
 * @fileOverview Favorite button component for toggling meal favorites
 * Displays heart/star icon with smooth animations and loading states
 */

'use client';

import { useState } from 'react';
import { Heart, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Meal } from '@/ai/schemas/meal';

interface FavoriteButtonProps {
  meal: Meal;
  isFavorite: boolean;
  onToggle: (meal: Meal, additionalData?: {
    cuisine?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    imageUrl?: string;
    tags?: string[];
    rating?: number;
  }) => Promise<void>;
  additionalData?: {
    cuisine?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    imageUrl?: string;
    tags?: string[];
    rating?: number;
  };
  variant?: 'heart' | 'star';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FavoriteButton({
  meal,
  isFavorite,
  onToggle,
  additionalData,
  variant = 'heart',
  size = 'md',
  showLabel = false,
  disabled = false,
  className
}: FavoriteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled || isLoading) return;

    setIsLoading(true);
    setIsAnimating(true);

    try {
      await onToggle(meal, additionalData);
      
      // Keep animation for a bit longer for visual feedback
      setTimeout(() => setIsAnimating(false), 300);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setIsAnimating(false);
    } finally {
      setIsLoading(false);
    }
  };

  const IconComponent = variant === 'heart' ? Heart : Star;
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const buttonSizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        buttonSizeClasses[size],
        'relative rounded-full transition-all duration-200 hover:scale-110',
        'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2',
        isFavorite 
          ? 'text-red-500 hover:text-red-600 hover:bg-red-50' 
          : 'text-gray-400 hover:text-red-500 hover:bg-gray-50',
        isAnimating && 'animate-pulse scale-110',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      aria-label={isFavorite ? `取消收藏 ${meal.recipeName}` : `收藏 ${meal.recipeName}`}
      title={isFavorite ? `取消收藏 ${meal.recipeName}` : `收藏 ${meal.recipeName}`}
    >
      {isLoading ? (
        <Loader2 className={cn(sizeClasses[size], 'animate-spin')} />
      ) : (
        <>
          <IconComponent 
            className={cn(
              sizeClasses[size],
              'transition-all duration-200',
              isFavorite ? 'fill-current' : 'fill-none',
              isAnimating && 'animate-bounce'
            )} 
          />
          
          {/* Animated heart particles effect */}
          {isAnimating && isFavorite && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
                    'animate-ping opacity-75'
                  )}
                  style={{
                    animationDelay: `${i * 100}ms`,
                    animationDuration: '600ms'
                  }}
                >
                  <IconComponent 
                    className={cn(
                      sizeClasses[size], 
                      'text-red-400 fill-current'
                    )} 
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      {showLabel && (
        <span className="sr-only">
          {isFavorite ? '已收藏' : '收藏'}
        </span>
      )}
    </Button>
  );
}

// Compact version for use in lists
export function CompactFavoriteButton({
  meal,
  isFavorite,
  onToggle,
  additionalData,
  className
}: Omit<FavoriteButtonProps, 'size' | 'showLabel' | 'variant'>) {
  return (
    <FavoriteButton
      meal={meal}
      isFavorite={isFavorite}
      onToggle={onToggle}
      additionalData={additionalData}
      size="sm"
      variant="heart"
      className={cn('h-6 w-6', className)}
    />
  );
}

// Version with text label
export function LabeledFavoriteButton({
  meal,
  isFavorite,
  onToggle,
  additionalData,
  className
}: Omit<FavoriteButtonProps, 'size' | 'showLabel' | 'variant'>) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onToggle(meal, additionalData);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={isFavorite ? "default" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'gap-2 transition-all duration-200',
        isFavorite 
          ? 'bg-red-500 hover:bg-red-600 text-white' 
          : 'border-red-200 text-red-600 hover:bg-red-50',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart 
          className={cn(
            'h-4 w-4 transition-all duration-200',
            isFavorite ? 'fill-current' : 'fill-none'
          )} 
        />
      )}
      {isFavorite ? '已收藏' : '收藏'}
    </Button>
  );
}