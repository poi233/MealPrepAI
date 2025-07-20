import { NextResponse } from 'next/server';

/**
 * Standard deprecation response for old Next.js API routes
 */
export function createDeprecationResponse(endpoint: string) {
  return NextResponse.json(
    {
      error: 'API_DEPRECATED',
      message: `This API endpoint (${endpoint}) has been deprecated and migrated to Django backend.`,
      details: {
        deprecated_endpoint: endpoint,
        new_backend: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
        migration_date: '2024-01-19',
        documentation: 'Please update your client to use the Django backend API endpoints.'
      }
    },
    { 
      status: 410, // Gone
      headers: {
        'X-API-Deprecated': 'true',
        'X-Migration-Info': 'Migrated to Django backend'
      }
    }
  );
}