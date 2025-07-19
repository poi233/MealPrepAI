'use server';

import { sql, VercelPool } from '@vercel/postgres';
import { DatabaseError, ErrorCodes } from '@/types/database.types';

/**
 * Database connection utilities and transaction management
 */

// Connection pool instance
let pool: VercelPool | null = null;

/**
 * Get database connection pool
 */
export function getPool(): VercelPool {
  if (!pool) {
    pool = sql;
  }
  return pool;
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as test`;
    return result.rows.length > 0 && result.rows[0].test === 1;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Execute a query with error handling
 */
export async function executeQuery<T = unknown>(
  query: string,
  params: unknown[] = []
): Promise<{ rows: T[]; rowCount: number }> {
  try {
    const result = await sql.query(query, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount || 0
    };
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Execute a transaction with multiple queries
 */
export async function executeTransaction<T>(
  operations: ((client: VercelPool) => Promise<T>)[]
): Promise<T[]> {
  try {
    await sql.query('BEGIN');
    
    const results: T[] = [];
    for (const operation of operations) {
      const result = await operation(sql);
      results.push(result);
    }
    
    await sql.query('COMMIT');
    return results;
  } catch (error) {
    await sql.query('ROLLBACK');
    throw handleDatabaseError(error);
  }
}

/**
 * Execute a single transaction operation
 */
export async function withTransaction<T>(
  operation: (client: VercelPool) => Promise<T>
): Promise<T> {
  try {
    await sql.query('BEGIN');
    const result = await operation(sql);
    await sql.query('COMMIT');
    return result;
  } catch (error) {
    await sql.query('ROLLBACK');
    throw handleDatabaseError(error);
  }
}

/**
 * Handle database errors and convert to standardized format
 */
export function handleDatabaseError(error: unknown): DatabaseError {
  console.error('Database error:', error);

  // PostgreSQL error codes
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as { code: string; detail?: string; message?: string };
    switch (dbError.code) {
      case '23505': // unique_violation
        return {
          code: ErrorCodes.UNIQUE_VIOLATION,
          message: 'A record with this value already exists',
          details: dbError.detail
        };
      case '23503': // foreign_key_violation
        return {
          code: ErrorCodes.FOREIGN_KEY_VIOLATION,
          message: 'Referenced record does not exist',
          details: dbError.detail
        };
      case '23514': // check_violation
        return {
          code: 'CHECK_VIOLATION',
          message: 'Value does not meet constraints',
          details: dbError.detail
        };
      case '42P01': // undefined_table
        return {
          code: 'TABLE_NOT_FOUND',
          message: 'Database table does not exist',
          details: dbError.message
        };
      default:
        return {
          code: 'DATABASE_ERROR',
          message: dbError.message || 'An unknown database error occurred',
          details: error
        };
    }
  }

  // Generic error handling
  return {
    code: 'UNKNOWN_ERROR',
    message: error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'An unknown error occurred',
    details: error
  };
}

/**
 * Check if a table exists
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      );
    `;
    return result.rows[0]?.exists || false;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * Get table column information
 */
export async function getTableColumns(tableName: string): Promise<string[]> {
  try {
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position;
    `;
    return result.rows.map(row => row.column_name);
  } catch (error) {
    console.error(`Error getting columns for table ${tableName}:`, error);
    return [];
  }
}

/**
 * Execute raw SQL query (use with caution)
 */
export async function executeRawQuery(query: string): Promise<unknown> {
  try {
    return await sql.query(query);
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  tables: { name: string; rowCount: number }[];
  totalSize: string;
}> {
  try {
    // Get table names first
    const tableNamesResult = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    // Get row counts for each table
    const tables = [];
    for (const table of tableNamesResult.rows) {
      try {
        const countResult = await sql.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
        tables.push({
          name: table.table_name,
          rowCount: parseInt(countResult.rows[0].count) || 0
        });
      } catch (error) {
        tables.push({
          name: table.table_name,
          rowCount: 0
        });
      }
    }

    // Get database size
    const sizeResult = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size;
    `;

    return {
      tables,
      totalSize: sizeResult.rows[0]?.size || 'Unknown'
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return {
      tables: [],
      totalSize: 'Unknown'
    };
  }
}