'use client';

/**
 * API client for communicating with the Django backend
 */

// Get the API base URL based on environment
function getApiBaseUrl(): string {
  // In production, use the production URL
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_API_BASE_URL_PROD || 'https://meal-prep-app-backend.vercel.app';
  }
  
  // In development, use local backend
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
}

const API_BASE_URL = getApiBaseUrl();

export interface ApiError {
  error: string;
  code?: string;
  details?: any;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Base API client class for making requests to the Django backend
 */
export class ApiClient {
  private static baseUrl = API_BASE_URL;
  private static authToken: string | null = null;

  /**
   * Set the authentication token for API requests
   */
  static setAuthToken(token: string | null) {
    this.authToken = token;
  }

  /**
   * Get the current authentication token
   */
  static getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Make a request to the Django backend
   */
  static async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`;
    
    // Set up default headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authentication header if token is available
    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      // Handle different response types
      let data: any;
      
      // Handle 204 No Content responses (no body)
      if (response.status === 204) {
        data = null;
      } else {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }
      }

      if (!response.ok) {
        // Better error message extraction
        let errorMessage = 'Request failed';
        
        if (data && typeof data === 'object') {
          if (data.error && typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.message && typeof data.message === 'string') {
            errorMessage = data.message;
          } else if (data.detail && typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
            errorMessage = data.non_field_errors.join(', ');
          }
        } else if (typeof data === 'string') {
          errorMessage = data;
        }
        
        throw new ApiClientError(
          errorMessage,
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      
      // Handle network errors or other issues
      throw new ApiClientError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * GET request
   */
  static async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = endpoint;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }

    return this.request<T>(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  static async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  static async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  static async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  static async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = ApiClient;