// Test setup file for vitest
import { vi } from 'vitest';

// Mock environment variables
process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/test';
process.env.GOOGLE_API_KEY = 'test-api-key';

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});