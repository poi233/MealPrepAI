import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, clearSession } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Start a transaction to delete all user-related data
    await sql`BEGIN`;

    try {
      // Delete user's meal plan items first (foreign key constraint)
      await sql`
        DELETE FROM meal_plan_items 
        WHERE meal_plan_id IN (
          SELECT id FROM meal_plans WHERE user_id = ${user.id}
        );
      `;

      // Delete user's meal plans
      await sql`DELETE FROM meal_plans WHERE user_id = ${user.id};`;

      // Delete user's collection recipes (junction table)
      await sql`
        DELETE FROM collection_recipes 
        WHERE collection_id IN (
          SELECT id FROM collections WHERE user_id = ${user.id}
        );
      `;

      // Delete user's collections
      await sql`DELETE FROM collections WHERE user_id = ${user.id};`;

      // Delete user's favorites
      await sql`DELETE FROM favorites WHERE user_id = ${user.id};`;

      // Delete user's created recipes (if any)
      await sql`DELETE FROM recipes WHERE created_by_user_id = ${user.id};`;

      // Finally, delete the user account
      await sql`DELETE FROM users WHERE id = ${user.id};`;

      // Commit the transaction
      await sql`COMMIT`;

      // Clear the user's session
      await clearSession();

      console.log(`User account deleted successfully: ${user.username} (${user.id})`);

      return NextResponse.json(
        { message: 'Account deleted successfully' },
        { status: 200 }
      );
    } catch (error) {
      // Rollback the transaction on error
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    console.error('Delete account API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again.' },
      { status: 500 }
    );
  }
}