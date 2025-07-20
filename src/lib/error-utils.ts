/**
 * Utility functions for handling errors consistently across the application
 */

/**
 * Extract a readable error message from various error types
 */
export function getErrorMessage(error: unknown, defaultMessage = 'An error occurred'): string {
  // Handle Error instances
  if (error instanceof Error) {
    return error.message;
  }
  
  // Handle objects with error properties
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, any>;
    
    // Check common error message properties
    if (errorObj.message && typeof errorObj.message === 'string') {
      return errorObj.message;
    }
    
    if (errorObj.error && typeof errorObj.error === 'string') {
      return errorObj.error;
    }
    
    if (errorObj.detail && typeof errorObj.detail === 'string') {
      return errorObj.detail;
    }
    
    // Handle validation errors
    if (errorObj.non_field_errors && Array.isArray(errorObj.non_field_errors)) {
      return errorObj.non_field_errors.join(', ');
    }
    
    // Handle field-specific errors
    const fieldErrors: string[] = [];
    Object.entries(errorObj).forEach(([field, messages]) => {
      if (Array.isArray(messages)) {
        fieldErrors.push(`${field}: ${messages.join(', ')}`);
      } else if (typeof messages === 'string') {
        fieldErrors.push(`${field}: ${messages}`);
      }
    });
    
    if (fieldErrors.length > 0) {
      return fieldErrors.join('; ');
    }
    
    // Fallback for objects without readable properties
    return `${defaultMessage}: ${JSON.stringify(error)}`;
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Fallback for unknown error types
  return defaultMessage;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: unknown, defaultMessage = 'An error occurred') {
  return {
    success: false,
    error: getErrorMessage(error, defaultMessage)
  };
}

/**
 * Handle API errors specifically
 */
export function handleApiError(error: unknown, operation = 'operation'): Error {
  const message = getErrorMessage(error, `Failed to ${operation}`);
  return new Error(message);
}