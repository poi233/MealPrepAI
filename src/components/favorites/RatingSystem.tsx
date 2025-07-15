/**
 * @fileOverview Rating system component with interactive star selection
 * Supports different sizes, read-only mode, and smooth animations
 */

'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingSystemProps {
  rating: number;
  maxRating?: number;
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

export function RatingSystem({
  rating,
  maxRating = 5,
  size = 'medium',
  interactive = false,
  onRatingChange,
  showLabel = false,
  disabled = false,
  className
}: RatingSystemProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-5 w-5',
    large: 'h-6 w-6'
  };

  const handleStarClick = (starRating: number) => {
    if (!interactive || disabled) return;
    
    setIsAnimating(true);
    onRatingChange?.(starRating);
    
    // Reset animation after a short delay
    setTimeout(() => setIsAnimating(false), 200);
  };

  const handleStarHover = (starRating: number) => {
    if (!interactive || disabled) return;
    setHoverRating(starRating);
  };

  const handleMouseLeave = () => {
    if (!interactive || disabled) return;
    setHoverRating(0);
  };

  const getStarState = (starIndex: number) => {
    const currentRating = hoverRating || rating;
    
    if (starIndex <= currentRating) {
      return 'filled';
    } else if (starIndex - 0.5 <= currentRating) {
      return 'half';
    } else {
      return 'empty';
    }
  };

  const getRatingText = (rating: number) => {
    if (rating === 0) return '未评分';
    if (rating === 1) return '很差';
    if (rating === 2) return '一般';
    if (rating === 3) return '不错';
    if (rating === 4) return '很好';
    if (rating === 5) return '极佳';
    return `${rating} 星`;
  };

  return (
    <div 
      className={cn(
        'flex items-center gap-1',
        interactive && !disabled && 'cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onMouseLeave={handleMouseLeave}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`评分: ${rating} / ${maxRating} 星`}
    >
      {/* Stars */}
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }, (_, index) => {
          const starIndex = index + 1;
          const starState = getStarState(starIndex);
          
          return (
            <button
              key={starIndex}
              type="button"
              onClick={() => handleStarClick(starIndex)}
              onMouseEnter={() => handleStarHover(starIndex)}
              disabled={!interactive || disabled}
              className={cn(
                'relative transition-all duration-150',
                interactive && !disabled && 'hover:scale-110 focus:scale-110',
                interactive && !disabled && 'focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 rounded',
                isAnimating && starIndex <= rating && 'animate-pulse scale-110'
              )}
              aria-label={`${starIndex} 星`}
              role={interactive ? 'radio' : undefined}
              aria-checked={interactive ? starIndex <= rating : undefined}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  'transition-all duration-150',
                  {
                    'text-yellow-400 fill-yellow-400': starState === 'filled',
                    'text-yellow-400 fill-yellow-200': starState === 'half',
                    'text-gray-300 fill-none': starState === 'empty'
                  },
                  interactive && hoverRating >= starIndex && 'text-yellow-500 fill-yellow-500'
                )}
              />
              
              {/* Half star overlay for partial ratings */}
              {starState === 'half' && (
                <div className="absolute inset-0 overflow-hidden w-1/2">
                  <Star
                    className={cn(
                      sizeClasses[size],
                      'text-yellow-400 fill-yellow-400'
                    )}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Rating label */}
      {showLabel && (
        <span className={cn(
          'text-sm font-medium',
          size === 'small' && 'text-xs',
          size === 'large' && 'text-base'
        )}>
          {interactive && hoverRating > 0 
            ? getRatingText(hoverRating)
            : getRatingText(rating)
          }
        </span>
      )}
      
      {/* Numeric rating for screen readers */}
      <span className="sr-only">
        {rating} out of {maxRating} stars
      </span>
    </div>
  );
}

// Compact read-only version
export function CompactRating({
  rating,
  maxRating = 5,
  className
}: Pick<RatingSystemProps, 'rating' | 'maxRating' | 'className'>) {
  return (
    <RatingSystem
      rating={rating}
      maxRating={maxRating}
      size="small"
      interactive={false}
      className={className}
    />
  );
}

// Interactive rating with label
export function InteractiveRating({
  rating,
  onRatingChange,
  maxRating = 5,
  disabled = false,
  className
}: Pick<RatingSystemProps, 'rating' | 'onRatingChange' | 'maxRating' | 'disabled' | 'className'>) {
  return (
    <RatingSystem
      rating={rating}
      maxRating={maxRating}
      size="medium"
      interactive={true}
      onRatingChange={onRatingChange}
      showLabel={true}
      disabled={disabled}
      className={className}
    />
  );
}

// Large display rating for detailed views
export function DisplayRating({
  rating,
  maxRating = 5,
  showLabel = true,
  className
}: Pick<RatingSystemProps, 'rating' | 'maxRating' | 'showLabel' | 'className'>) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <RatingSystem
        rating={rating}
        maxRating={maxRating}
        size="large"
        interactive={false}
        className="justify-center"
      />
      {showLabel && (
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {rating.toFixed(1)}
          </div>
          <div className="text-sm text-gray-500">
            {rating === 0 ? '未评分' : `${maxRating} 星评分`}
          </div>
        </div>
      )}
    </div>
  );
}

// Rating distribution component for analytics
export function RatingDistribution({
  ratings,
  totalCount,
  className
}: {
  ratings: { rating: number; count: number }[];
  totalCount: number;
  className?: string;
}) {
  const maxCount = Math.max(...ratings.map(r => r.count));
  
  return (
    <div className={cn('space-y-2', className)}>
      {[5, 4, 3, 2, 1].map(rating => {
        const ratingData = ratings.find(r => r.rating === rating);
        const count = ratingData?.count || 0;
        const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
        const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
        
        return (
          <div key={rating} className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1 w-12">
              <span className="text-gray-600">{rating}</span>
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            </div>
            
            <div className="flex-1 bg-gray-200 rounded-full h-2 relative overflow-hidden">
              <div
                className="bg-yellow-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${barWidth}%` }}
              />
            </div>
            
            <div className="text-gray-500 text-xs w-12 text-right">
              {percentage.toFixed(0)}%
            </div>
            
            <div className="text-gray-400 text-xs w-8 text-right">
              {count}
            </div>
          </div>
        );
      })}
    </div>
  );
}