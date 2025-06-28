/**
 * Validation utilities for Gemini API queries
 */

/**
 * Sanitizes user input by removing HTML tags and dangerous content
 */
export function sanitizeQuery(query: string): string {
  return query
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/data:/gi, '') // Remove data: protocols
    .replace(/vbscript:/gi, '') // Remove vbscript: protocols
    .trim();
}

/**
 * Validates the query input
 */
export function validateQuery(query: string): { isValid: boolean; error?: string } {
  if (!query || typeof query !== 'string') {
    return { isValid: false, error: 'Query is required' };
  }
  
  if (query.length > 500) {
    return { isValid: false, error: 'Query must be 500 characters or less' };
  }
  
  return { isValid: true };
}