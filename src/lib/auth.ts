// Legacy auth service - migrated to Django backend
// This file is kept for backward compatibility

export { DjangoAuthService } from './django-auth';

// Re-export types with legacy names for compatibility
export type {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  ChangePasswordData,
  UpdateProfileData
} from './django-auth';

// Legacy functions for backward compatibility
import { DjangoAuthService } from './django-auth';

/**
 * Legacy function signatures maintained for compatibility
 */
export async function registerUser(
  username: string,
  email: string,
  password: string,
  displayName?: string,
  dietaryPreferences?: any
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const response = await DjangoAuthService.register({
      email,
      password,
      password_confirm: password,
      username,
      first_name: displayName
    });
    return { success: true, userId: response.user.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Registration failed' };
  }
}

export async function loginUser(
  usernameOrEmail: string,
  password: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const response = await DjangoAuthService.login({
      email: usernameOrEmail,
      password
    });
    return { success: true, user: response.user };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
  }
}

export async function getUserById(userId: string): Promise<any | null> {
  try {
    return await DjangoAuthService.getCurrentUser();
  } catch (error) {
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: {
    displayName?: string;
    dietaryPreferences?: any;
    email?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await DjangoAuthService.updateProfile({
      first_name: updates.displayName,
      dietary_preferences: updates.dietaryPreferences
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Update failed' };
  }
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await DjangoAuthService.changePassword({
      old_password: currentPassword,
      new_password: newPassword,
      new_password_confirm: newPassword
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Password change failed' };
  }
}

export async function getCurrentUser(): Promise<any | null> {
  try {
    return await DjangoAuthService.getCurrentUser();
  } catch (error) {
    return null;
  }
}

export async function validateSession(): Promise<{ valid: boolean; userId?: string; user?: any }> {
  try {
    const isAuth = DjangoAuthService.isAuthenticated();
    if (!isAuth) {
      return { valid: false };
    }

    const user = await DjangoAuthService.getCurrentUser();
    return { 
      valid: true, 
      userId: user.id, 
      user 
    };
  } catch (error) {
    return { valid: false };
  }
}

export async function logoutUser(): Promise<void> {
  await DjangoAuthService.logout();
}

export async function requireAuth(): Promise<any> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

// Session management functions (deprecated in favor of JWT tokens)
export async function createSession(userId: string): Promise<void> {
  // No-op for Django JWT auth
}

export async function getSession(): Promise<{ userId: string; needsRefresh?: boolean } | null> {
  const user = await getCurrentUser();
  return user ? { userId: user.id } : null;
}

export async function refreshSession(userId: string): Promise<void> {
  try {
    await DjangoAuthService.refreshToken();
  } catch (error) {
    // Token refresh failed
  }
}

export async function clearSession(): Promise<void> {
  await DjangoAuthService.logout();
}