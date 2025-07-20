import { createDeprecationResponse } from '../deprecated';

// DEPRECATED: This API has been migrated to Django backend
export async function GET() {
  return createDeprecationResponse('/api/favorites');
}

export async function POST() {
  return createDeprecationResponse('/api/favorites');
}