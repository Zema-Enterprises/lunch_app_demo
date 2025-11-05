/**
 * Test utilities for handling API response formats
 */

/**
 * Unwraps the { data: ... } wrapper from API responses
 * All API endpoints return responses wrapped in { data: {...} }
 */
export const getData = (response: any) => response.body.data;

/**
 * Extracts error array from validation error responses
 * Validation errors return { errors: [...] } instead of { error: '...' }
 */
export const getErrors = (response: any) => response.body.errors;

/**
 * Gets the error message from error responses
 */
export const getErrorMessage = (response: any) => response.body.message;

/**
 * Check if response has data wrapper
 */
export const hasDataWrapper = (response: any) => 
  response.body && typeof response.body === 'object' && 'data' in response.body;

/**
 * Check if response has errors array
 */
export const hasErrorsArray = (response: any) =>
  response.body && typeof response.body === 'object' && 'errors' in response.body;
