#!/usr/bin/env node

/**
 * Database CLI utility for development and maintenance tasks
 * Usage: npx tsx src/lib/database/cli.ts <command>
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

import {
  initializeDatabase,
  cleanupLegacyTables,
  verifyDatabaseSchema,
  resetDatabase,
  createSampleData,
  getDatabaseHealth,
  getDatabaseStats,
  testConnection
} from './index';

async function main() {
  const command = process.argv[2];

  if (!command) {
    console.log(`
Database CLI Utility

Available commands:
  init          - Initialize database with new schema
  cleanup       - Remove legacy tables
  verify        - Verify database schema
  reset         - Reset database (development only)
  sample        - Create sample data (development only)
  health        - Check database health
  stats         - Show database statistics
  test          - Test database connection

Usage: npx tsx src/lib/database/cli.ts <command>
    `);
    process.exit(1);
  }

  try {
    switch (command) {
      case 'init':
        console.log('Initializing database...');
        await initializeDatabase();
        console.log('✅ Database initialized successfully');
        break;

      case 'cleanup':
        console.log('Cleaning up legacy tables...');
        await cleanupLegacyTables();
        console.log('✅ Legacy cleanup completed');
        break;

      case 'verify':
        console.log('Verifying database schema...');
        const verification = await verifyDatabaseSchema();
        if (verification.isValid) {
          console.log('✅ Database schema is valid');
        } else {
          console.log('❌ Database schema has issues:');
          if (verification.missingTables.length > 0) {
            console.log('Missing tables:', verification.missingTables.join(', '));
          }
          if (verification.errors.length > 0) {
            console.log('Errors:', verification.errors.join(', '));
          }
        }
        break;

      case 'reset':
        if (process.env.NODE_ENV === 'production') {
          console.log('❌ Database reset is not allowed in production');
          process.exit(1);
        }
        console.log('Resetting database...');
        await resetDatabase();
        console.log('✅ Database reset completed');
        break;

      case 'sample':
        if (process.env.NODE_ENV === 'production') {
          console.log('❌ Sample data creation is not allowed in production');
          process.exit(1);
        }
        console.log('Creating sample data...');
        await createSampleData();
        console.log('✅ Sample data created');
        break;

      case 'health':
        console.log('Checking database health...');
        const health = await getDatabaseHealth();
        console.log('Database Health Report:');
        console.log(`Connection: ${health.connectionStatus ? '✅' : '❌'}`);
        console.log(`Schema: ${health.schemaStatus.isValid ? '✅' : '❌'}`);
        console.log(`Overall: ${health.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
        console.log(`Last checked: ${health.lastChecked.toISOString()}`);
        
        if (!health.schemaStatus.isValid) {
          if (health.schemaStatus.missingTables.length > 0) {
            console.log('Missing tables:', health.schemaStatus.missingTables.join(', '));
          }
          if (health.schemaStatus.errors.length > 0) {
            console.log('Errors:', health.schemaStatus.errors.join(', '));
          }
        }
        break;

      case 'stats':
        console.log('Getting database statistics...');
        const stats = await getDatabaseStats();
        console.log('Database Statistics:');
        console.log(`Total size: ${stats.totalSize}`);
        console.log('Tables:');
        stats.tables.forEach(table => {
          console.log(`  ${table.name}: ${table.rowCount} rows`);
        });
        break;

      case 'test':
        console.log('Testing database connection...');
        const isConnected = await testConnection();
        console.log(`Connection: ${isConnected ? '✅ Connected' : '❌ Failed'}`);
        break;

      default:
        console.log(`❌ Unknown command: ${command}`);
        console.log('Run without arguments to see available commands');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}