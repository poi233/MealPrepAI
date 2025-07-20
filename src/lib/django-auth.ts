'use client';

import { ApiClient, ApiClientError } from './api-client';

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  dietary_preferences?: string[];
  allergies?: string[];
  cooking_experience?: string;
  favorite_cuisines?: string[];
  is_staff?: boolean;
  is_active?: boolean;
  date_joined?: string;
  last_login?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
  new_password_confirm: string;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  username?: string;
  dietary_preferences?: string[];
  allergies?: string[];
  cooking_experience?: string;
  favorite_cuisines?: string[];
}

/**
 * Authentication service for Django backend
 */
export class DjangoAuthService {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly USER_KEY = 'user_data';

  /**
   * Initialize the auth service (set token from storage)
   */
  static initialize() {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
      if (token) {
        ApiClient.setAuthToken(token);
      }
    }
  }

  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await ApiClient.post<AuthResponse>('/auth/register/', data);
      this.storeAuthData(response);
      return response;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Login user
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await ApiClient.post<AuthResponse>('/auth/login/', credentials);
      this.storeAuthData(response);
      return response;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        await ApiClient.post('/auth/logout/', { refresh: refreshToken });
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearAuthData();
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<User> {
    try {
      return await ApiClient.get<User>('/auth/me/');
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: UpdateProfileData): Promise<User> {
    try {
      return await ApiClient.patch<User>('/auth/profile/', data);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Change password
   */
  static async changePassword(data: ChangePasswordData): Promise<void> {
    try {
      await ApiClient.post('/auth/change-password/', data);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Delete account
   */
  static async deleteAccount(): Promise<void> {
    try {
      await ApiClient.delete('/auth/delete-account/');
      this.clearAuthData();
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await ApiClient.post<{ access: string }>('/auth/token/refresh/', {
        refresh: refreshToken
      });
      
      const newAccessToken = response.access;
      this.setAccessToken(newAccessToken);
      return newAccessToken;
    } catch (error) {
      this.clearAuthData();
      throw this.handleAuthError(error);
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Get access token
   */
  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Get refresh token
   */
  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Get stored user data
   */
  static getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Store authentication data
   */
  private static storeAuthData(authData: AuthResponse) {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(this.ACCESS_TOKEN_KEY, authData.access);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, authData.refresh);
    localStorage.setItem(this.USER_KEY, JSON.stringify(authData.user));
    
    ApiClient.setAuthToken(authData.access);
  }

  /**
   * Set access token
   */
  private static setAccessToken(token: string) {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    ApiClient.setAuthToken(token);
  }

  /**
   * Clear authentication data
   */
  private static clearAuthData() {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    ApiClient.setAuthToken(null);
  }

  /**
   * Handle authentication errors
   */
  private static handleAuthError(error: any): Error {
    if (error instanceof ApiClientError) {
      // Handle specific auth errors
      if (error.status === 401) {
        this.clearAuthData();
        return new Error('Authentication failed. Please login again.');
      }
      
      if (error.status === 400 && error.response) {
        // Handle validation errors
        const details = error.response;
        if (details.email) {
          return new Error(`Email: ${details.email.join(', ')}`);
        }
        if (details.password) {
          return new Error(`Password: ${details.password.join(', ')}`);
        }
        if (details.non_field_errors) {
          return new Error(details.non_field_errors.join(', '));
        }
      }
      
      return new Error(error.message);
    }
    
    return error instanceof Error ? error : new Error('Authentication error');
  }
}

// Initialize the service
if (typeof window !== 'undefined') {
  DjangoAuthService.initialize();
}