'use server';

import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User, UserRecord, DietaryPreferences } from '@/types/database.types';

// Ensure users table exists with proper constraints
async function ensureUsersTableExists(): Promise<void> {
  try {
    // Create the users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        dietary_preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create indexes for performance (separate statements)
    await sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`;
  } catch (error) {
    console.error('Database error: Failed to ensure users table exists:', error);
    throw new Error('Failed to initialize users table');
  }
}

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// User registration function
export async function registerUser(
  username: string,
  email: string,
  password: string,
  displayName?: string,
  dietaryPreferences?: DietaryPreferences
): Promise<{ success: boolean; userId?: string; error?: string }> {
  await ensureUsersTableExists();

  // Validate input
  if (!username || username.trim().length < 3) {
    return { success: false, error: 'Username must be at least 3 characters long' };
  }
  
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Valid email address is required' };
  }
  
  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long' };
  }

  try {
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Insert user into database
    const result = await sql`
      INSERT INTO users (username, email, password_hash, display_name, dietary_preferences)
      VALUES (${username.trim()}, ${email.toLowerCase().trim()}, ${passwordHash}, 
              ${displayName?.trim() || null}, ${JSON.stringify(dietaryPreferences || {})})
      RETURNING id;
    `;

    const userId = result.rows[0].id;
    console.log(`User registered successfully: ${username} (${userId})`);
    
    return { success: true, userId };
  } catch (error) {
    console.error('Database error during user registration:', error);
    
    // Handle specific database errors
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') { // Unique violation
      const dbError = error as { constraint?: string };
      if (dbError.constraint?.includes('username')) {
        return { success: false, error: 'Username already exists' };
      } else if (dbError.constraint?.includes('email')) {
        return { success: false, error: 'Email address already registered' };
      }
    }
    
    return { success: false, error: 'Registration failed. Please try again.' };
  }
}

// User login function
export async function loginUser(
  usernameOrEmail: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  await ensureUsersTableExists();

  if (!usernameOrEmail || !password) {
    return { success: false, error: 'Username/email and password are required' };
  }

  try {
    // Find user by username or email
    const result = await sql`
      SELECT id, username, email, password_hash, display_name, dietary_preferences, created_at, updated_at
      FROM users
      WHERE username = ${usernameOrEmail.trim()} OR email = ${usernameOrEmail.toLowerCase().trim()}
      LIMIT 1;
    `;

    if (result.rows.length === 0) {
      return { success: false, error: 'Invalid username/email or password' };
    }

    const userRecord = result.rows[0] as UserRecord;
    
    // Verify password
    const isValidPassword = await verifyPassword(password, userRecord.password_hash);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid username/email or password' };
    }

    // Convert database record to User type
    const user: User = {
      id: userRecord.id,
      username: userRecord.username,
      email: userRecord.email,
      displayName: userRecord.display_name || undefined,
      dietaryPreferences: userRecord.dietary_preferences || {},
      createdAt: userRecord.created_at,
      updatedAt: userRecord.updated_at
    };

    console.log(`User logged in successfully: ${user.username} (${user.id})`);
    return { success: true, user };
  } catch (error) {
    console.error('Database error during user login:', error);
    return { success: false, error: 'Login failed. Please try again.' };
  }
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  await ensureUsersTableExists();

  if (!userId) {
    return null;
  }

  try {
    const result = await sql`
      SELECT id, username, email, display_name, dietary_preferences, created_at, updated_at
      FROM users
      WHERE id = ${userId}
      LIMIT 1;
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const userRecord = result.rows[0] as Omit<UserRecord, 'password_hash'>;
    
    return {
      id: userRecord.id,
      username: userRecord.username,
      email: userRecord.email,
      displayName: userRecord.display_name || undefined,
      dietaryPreferences: userRecord.dietary_preferences || {},
      createdAt: userRecord.created_at,
      updatedAt: userRecord.updated_at
    };
  } catch (error) {
    console.error('Database error getting user by ID:', error);
    return null;
  }
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  updates: {
    displayName?: string;
    dietaryPreferences?: DietaryPreferences;
    email?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  await ensureUsersTableExists();

  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  try {
    // Use individual SQL queries for each update to avoid parameter issues
    if (updates.displayName !== undefined) {
      await sql`
        UPDATE users 
        SET display_name = ${updates.displayName?.trim() || null}, updated_at = NOW()
        WHERE id = ${userId};
      `;
    }

    if (updates.dietaryPreferences !== undefined) {
      await sql`
        UPDATE users 
        SET dietary_preferences = ${JSON.stringify(updates.dietaryPreferences)}, updated_at = NOW()
        WHERE id = ${userId};
      `;
    }

    if (updates.email !== undefined) {
      if (!updates.email.includes('@')) {
        return { success: false, error: 'Valid email address is required' };
      }
      await sql`
        UPDATE users 
        SET email = ${updates.email.toLowerCase().trim()}, updated_at = NOW()
        WHERE id = ${userId};
      `;
    }

    if (!updates.displayName && !updates.dietaryPreferences && !updates.email) {
      return { success: false, error: 'No updates provided' };
    }

    console.log(`User profile updated successfully: ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Database error updating user profile:', error);
    
    // Handle specific database errors
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505' && 'constraint' in error && typeof error.constraint === 'string' && error.constraint.includes('email')) {
      return { success: false, error: 'Email address already registered' };
    }
    
    return { success: false, error: 'Profile update failed. Please try again.' };
  }
}

// Change user password
export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  await ensureUsersTableExists();

  if (!userId || !currentPassword || !newPassword) {
    return { success: false, error: 'All fields are required' };
  }

  if (newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long' };
  }

  try {
    // Get current password hash
    const result = await sql`
      SELECT password_hash FROM users WHERE id = ${userId} LIMIT 1;
    `;

    if (result.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }

    const currentPasswordHash = result.rows[0].password_hash;
    
    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, currentPasswordHash);
    if (!isValidPassword) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await sql`
      UPDATE users 
      SET password_hash = ${newPasswordHash}, updated_at = NOW()
      WHERE id = ${userId};
    `;

    console.log(`Password changed successfully for user: ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Database error changing password:', error);
    return { success: false, error: 'Password change failed. Please try again.' };
  }
}

// Session management functions
const SESSION_COOKIE_NAME = 'mealprep_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const SESSION_REFRESH_THRESHOLD = 24 * 60 * 60 * 1000; // Refresh if less than 1 day remaining

export async function createSession(userId: string): Promise<void> {
  const sessionData = {
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION,
    lastRefresh: Date.now()
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/'
  });
}

export async function getSession(): Promise<{ userId: string; needsRefresh?: boolean } | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie?.value) {
      return null;
    }

    const sessionData = JSON.parse(sessionCookie.value);
    
    // Check if session is expired
    if (Date.now() > sessionData.expiresAt) {
      await clearSession();
      return null;
    }

    // Check if session needs refresh (less than 1 day remaining)
    const needsRefresh = (sessionData.expiresAt - Date.now()) < SESSION_REFRESH_THRESHOLD;

    return { 
      userId: sessionData.userId,
      needsRefresh 
    };
  } catch (error) {
    console.error('Error getting session:', error);
    await clearSession();
    return null;
  }
}

export async function refreshSession(userId: string): Promise<void> {
  const session = await getSession();
  if (session && session.userId === userId) {
    await createSession(userId);
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function validateSession(): Promise<{ valid: boolean; userId?: string; user?: User }> {
  const session = await getSession();
  
  if (!session) {
    return { valid: false };
  }

  // Get user to ensure they still exist
  const user = await getUserById(session.userId);
  if (!user) {
    await clearSession();
    return { valid: false };
  }

  // Refresh session if needed
  if (session.needsRefresh) {
    await refreshSession(session.userId);
  }

  return { 
    valid: true, 
    userId: session.userId, 
    user 
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) {
    return null;
  }

  return await getUserById(session.userId);
}

// Logout function
export async function logoutUser(): Promise<void> {
  await clearSession();
  redirect('/login');
}

// Utility function to require authentication
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}