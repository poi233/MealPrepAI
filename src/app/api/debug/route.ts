import { NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';

// GET /api/debug - Debug database status
export async function GET(request: NextRequest) {
  try {
    // Check if recipes table exists and get its structure
    const { rows: tableInfo } = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'recipes'
      ORDER BY ordinal_position;
    `;

    // Get count of recipes
    const { rows: recipeCount } = await sql`SELECT COUNT(*) as count FROM recipes`;

    // Get sample recipe data
    const { rows: sampleRecipes } = await sql`SELECT id, name, created_by_user_id, meal_type FROM recipes LIMIT 3`;

    // Check users table
    const { rows: userCount } = await sql`SELECT COUNT(*) as count FROM users`;
    const { rows: sampleUsers } = await sql`SELECT id, username FROM users LIMIT 3`;

    return Response.json({
      database: {
        recipesTable: {
          exists: tableInfo.length > 0,
          columns: tableInfo,
          count: parseInt(recipeCount[0].count),
          samples: sampleRecipes
        },
        usersTable: {
          count: parseInt(userCount[0].count),
          samples: sampleUsers
        }
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    return Response.json(
      { error: 'Debug failed', details: error },
      { status: 500 }
    );
  }
}