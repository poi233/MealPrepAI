import { createDeprecationResponse } from '../deprecated';

// DEPRECATED: This API has been migrated to Django backend
export async function GET() {
  return createDeprecationResponse('/api/recipes');
}

export async function POST() {
  return createDeprecationResponse('/api/recipes');
}