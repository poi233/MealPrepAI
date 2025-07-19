'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  recipeId: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  showText?: boolean;
  className?: string;
}

export function FavoriteButton({ 
  recipeId, 
  size = 'md', 
  variant = 'ghost',
  showText = false,
  className 
}: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth();
  const { checkIsFavorited, toggleFavorite, isLoading } = useFavorites();
  const [isToggling, setIsToggling] = useState(false);

  const isFavorited = checkIsFavorited(recipeId);

  const handleToggle = async () => {
    if (!isAuthenticated || isToggling) return;

    setIsToggling(true);
    try {
      await toggleFavorite(recipeId);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsToggling(false);
    }
  };

  if (!isAuthenticated) {
    return null; // Don't show favorite button for unauthenticated users
  }

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={handleToggle}
      disabled={isLoading || isToggling}
      className={cn(
        sizeClasses[size],
        'transition-colors duration-200',
        isFavorited && 'text-red-500 hover:text-red-600',
        !isFavorited && 'text-gray-400 hover:text-red-400',
        className
      )}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart 
        size={iconSizes[size]} 
        className={cn(
          'transition-all duration-200',
          isFavorited && 'fill-current',
          isToggling && 'scale-110'
        )}
      />
      {showText && (
        <span className="ml-2 text-sm">
          {isFavorited ? 'Favorited' : 'Favorite'}
        </span>
      )}
    </Button>
  );
}