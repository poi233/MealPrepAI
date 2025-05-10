import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const normalizePreferences = (prefs: string | undefined | null): string => {
  if (!prefs) return '';
  return prefs.trim().toLowerCase();
};
