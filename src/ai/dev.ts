
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-weekly-meal-plan.ts';
import '@/ai/flows/generate-recipe-details.ts';
import '@/ai/flows/suggest-recipe.ts';
import '@/ai/flows/analyze-meal-plan.ts';
import '@/ai/flows/generate-shopping-list.ts';

