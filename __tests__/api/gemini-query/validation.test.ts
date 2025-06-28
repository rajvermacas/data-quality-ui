/**
 * Tests for validation utilities
 */

import { sanitizeQuery, validateQuery } from '@/app/api/gemini-query/validation';

describe('sanitizeQuery', () => {
  it('should remove HTML tags', () => {
    const input = '<div>Hello <script>alert("hack")</script> World</div>';
    const result = sanitizeQuery(input);
    expect(result).toBe('Hello alert("hack") World');
  });

  it('should remove javascript: protocols', () => {
    const input = 'Click here javascript:alert("hack")';
    const result = sanitizeQuery(input);
    expect(result).toBe('Click here alert("hack")');
  });

  it('should remove data: protocols', () => {
    const input = 'Image data:image/png;base64,hack';
    const result = sanitizeQuery(input);
    expect(result).toBe('Image image/png;base64,hack');
  });

  it('should remove vbscript: protocols', () => {
    const input = 'Run vbscript:msgbox("hack")';
    const result = sanitizeQuery(input);
    expect(result).toBe('Run msgbox("hack")');
  });

  it('should trim whitespace', () => {
    const input = '  Hello World  ';
    const result = sanitizeQuery(input);
    expect(result).toBe('Hello World');
  });

  it('should handle case insensitive protocol removal', () => {
    const input = 'JaVaScRiPt:alert("test")';
    const result = sanitizeQuery(input);
    expect(result).toBe('alert("test")');
  });

  it('should handle empty strings', () => {
    const result = sanitizeQuery('');
    expect(result).toBe('');
  });

  it('should handle normal text without modification', () => {
    const input = 'What are the worst performing datasets?';
    const result = sanitizeQuery(input);
    expect(result).toBe('What are the worst performing datasets?');
  });
});

describe('validateQuery', () => {
  it('should validate a valid query', () => {
    const result = validateQuery('What are the worst performing datasets?');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject empty query', () => {
    const result = validateQuery('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Query is required');
  });

  it('should reject null query', () => {
    const result = validateQuery(null as any);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Query is required');
  });

  it('should reject undefined query', () => {
    const result = validateQuery(undefined as any);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Query is required');
  });

  it('should reject non-string query', () => {
    const result = validateQuery(123 as any);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Query is required');
  });

  it('should reject query longer than 500 characters', () => {
    const longQuery = 'a'.repeat(501);
    const result = validateQuery(longQuery);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Query must be 500 characters or less');
  });

  it('should accept query exactly 500 characters', () => {
    const query = 'a'.repeat(500);
    const result = validateQuery(query);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept query with special characters', () => {
    const query = 'What about datasets with >90% failure rate?';
    const result = validateQuery(query);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});