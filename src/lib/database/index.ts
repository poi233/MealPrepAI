/**
 * @fileOverview Main database module - exports all database functionality
 */

// Connection utilities
export {
  getPool,
  testConnection,
  executeQuery,
  executeTransaction,
  withTransaction,
  handleDatabaseError,
  tableExists,
  getTableColumns,
  executeRawQuery,
  getDatabaseStats
} from './connection';

// Initialization and cleanup
export {
  initializeDatabase,
  cleanupLegacyTables,
  verifyDatabaseSchema,
  resetDatabase,
  createSampleData,
  getDatabaseHealth
} from './init';

// Type definitions
export * from '@/types/database.types';