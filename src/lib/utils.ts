import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes a string input by trimming whitespace and converting to lowercase.
 * Returns an empty string if the input is null, undefined, or an empty string.
 * @param str The string to normalize.
 * @returns The normalized string or an empty string.
 */
export const normalizeStringInput = (str: string | undefined | null): string => {
  if (!str) return '';
  return str.trim().toLowerCase();
};
