# Database Infrastructure

This directory contains the new normalized database infrastructure for MealPrepAI.

## Overview

The database has been redesigned from a JSONB-based structure to a normalized relational database with proper foreign key relationships, indexes, and constraints.

## Architecture

### Core Tables

- **users** - User profiles and authentication
- **recipes** - Centralized recipe storage
- **meal_plans** - Meal plan metadata
- **meal_plan_items** - Individual meal assignments
- **favorites** - User recipe favorites
- **collections** - Recipe organization
- **collection_recipes** - Many-to-many recipe-collection relationships

### Key Features

- UUID primary keys for better scalability
- Proper foreign key constraints with CASCADE/SET NULL
- Full-text search indexes for recipes
- Performance indexes for common query patterns
- Automatic `updated_at` timestamp triggers
- JSONB fields for flexible data (ingredients, nutrition, preferences)

## Files

- `schema.sql` - Complete database schema definition
- `connection.ts` - Database connection utilities and transaction management
- `init.ts` - Database initialization and cleanup functions
- `cli.ts` - Command-line utility for database operations
- `index.ts` - Main module exports

## Usage

### NPM Scripts

```bash
# Test database connection
npm run db:test

# Initialize database with new schema
npm run db:init

# Clean up legacy tables
npm run db:cleanup

# Verify database schema
npm run db:verify

# Reset database (development only)
npm run db:reset

# Create sample data (development only)
npm run db:sample

# Check database health
npm run db:health

# Show database statistics
npm run db:stats
```

### Programmatic Usage

```typescript
import {
  initializeDatabase,
  testConnection,
  verifyDatabaseSchema,
  getDatabaseHealth
} from '@/lib/database';

// Initialize database
await initializeDatabase();

// Test connection
const isConnected = await testConnection();

// Verify schema
const verification = await verifyDatabaseSchema();

// Check health
const health = await getDatabaseHealth();
```

## Migration from Legacy System

The new database structure replaces the old JSONB-based meal_plans table with a normalized structure:

### Before (Legacy)
- Single `meal_plans` table with JSONB data
- No user management
- Disconnected favorites system
- No proper recipe relationships

### After (New)
- Normalized tables with proper relationships
- User management with authentication
- Centralized recipe database
- Efficient meal planning with foreign keys
- Functional favorites and collections

## Development

### Environment Variables

Required environment variables:
- `POSTGRES_URL` - Database connection string
- `NODE_ENV` - Environment (development/production)

### Database Connection

The system uses Vercel Postgres with connection pooling. All database operations include proper error handling and transaction management.

### Testing

Sample data can be created for development and testing:

```bash
npm run db:sample
```

This creates:
- Test user account
- Sample recipes
- Sample meal plan
- Sample favorites and collections

## Performance

### Indexes

The database includes optimized indexes for:
- Recipe search and filtering
- User-specific queries
- Meal plan retrieval
- Favorites and collections

### Query Optimization

Common query patterns are optimized with:
- Composite indexes for multi-column queries
- GIN indexes for full-text search
- Partial indexes for filtered queries

## Security

- Password hashing for user authentication
- Foreign key constraints for data integrity
- Input validation through database constraints
- Transaction management for data consistency

## Monitoring

Use the health check endpoint to monitor database status:

```bash
npm run db:health
```

This checks:
- Database connectivity
- Schema validity
- Required extensions
- Overall system health