'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAuth } from '@/contexts/AuthContext';
import { useGuestGuard } from '@/hooks/useAuthGuard';
import type { DietaryPreferences } from '@/types/database.types';
import { getErrorMessage } from '@/lib/error-utils';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [dietaryPreferences, setDietaryPreferences] = useState({
    allergies: [] as string[],
    dietType: undefined as 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'mediterranean' | undefined,
    dislikes: [] as string[],
    calorieTarget: undefined as number | undefined
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { register } = useAuth();
  
  // Redirect authenticated users away from register page
  useGuestGuard();

  const validateForm = () => {
    // Reset error
    setError('');

    // Validate required fields
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }

    if (!formData.password) {
      setError('Password is required');
      return false;
    }

    // Validate username format (alphanumeric and underscores only, 3-30 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(formData.username)) {
      setError('Username must be 3-30 characters long and contain only letters, numbers, and underscores');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return false;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submitting
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName || undefined,
        dietaryPreferences
      });

      if (result.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(getErrorMessage(result.error, 'Registration failed'));
      }
    } catch (error) {
      setError(getErrorMessage(error, 'Network error. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleAllergiesChange = (value: string) => {
    const allergies = value.split(',').map(item => item.trim()).filter(item => item);
    setDietaryPreferences(prev => ({ ...prev, allergies }));
  };

  const handleDislikesChange = (value: string) => {
    const dislikes = value.split(',').map(item => item.trim()).filter(item => item);
    setDietaryPreferences(prev => ({ ...prev, dislikes }));
  };

  return (
    <div className="w-full">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Join MealPrepAI to start planning your meals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="How should we address you?"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-medium">Dietary Preferences (Optional)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dietType">Diet Type</Label>
                  <Select onValueChange={(value) => 
                    setDietaryPreferences(prev => ({ 
                      ...prev, 
                      dietType: value as 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'mediterranean'
                    }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select diet type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vegetarian">Vegetarian</SelectItem>
                      <SelectItem value="vegan">Vegan</SelectItem>
                      <SelectItem value="keto">Keto</SelectItem>
                      <SelectItem value="paleo">Paleo</SelectItem>
                      <SelectItem value="mediterranean">Mediterranean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="calorieTarget">Daily Calorie Target</Label>
                  <Input
                    id="calorieTarget"
                    type="number"
                    placeholder="e.g., 2000"
                    onChange={(e) => 
                      setDietaryPreferences(prev => ({ 
                        ...prev, 
                        calorieTarget: e.target.value ? parseInt(e.target.value) : undefined 
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Input
                  id="allergies"
                  placeholder="e.g., nuts, dairy, shellfish (comma-separated)"
                  onChange={(e) => handleAllergiesChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dislikes">Food Dislikes</Label>
                <Input
                  id="dislikes"
                  placeholder="e.g., mushrooms, olives, spicy food (comma-separated)"
                  onChange={(e) => handleDislikesChange(e.target.value)}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}