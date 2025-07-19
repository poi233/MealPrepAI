'use client';

import { useState } from 'react';
import { Heart, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FavoritesList } from '@/components/favorites/FavoritesList';
import { useFavorites } from '@/contexts/FavoritesContext';

export default function FavoritesPage() {
  const { favoritesCount, refreshFavorites, isLoading } = useFavorites();
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Heart className="h-8 w-8 text-red-500" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
            <p className="text-gray-600">
              {favoritesCount} favorite recipe{favoritesCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button 
          onClick={refreshFavorites}
          disabled={isLoading}
          variant="outline"
        >
          <Filter className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard title="Total Favorites" value={favoritesCount} />
      </div>

      {/* Favorites Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <FavoritesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: number;
}

function StatsCard({ title, value }: StatsCardProps) {
  const { getFavoritesByMeal } = useFavorites();
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}