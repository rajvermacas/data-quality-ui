/**
 * Tests for utility functions
 */

import { 
  isEmptyPartsError, 
  getRetryDelayWithJitter, 
  isAskingForClarification,
  extractJSONFromText 
} from '@/app/api/gemini-query/utils';

describe('isEmptyPartsError', () => {
  it('should detect "No content parts" error', () => {
    const error = new Error('No content parts in Gemini API response');
    expect(isEmptyPartsError(error)).toBe(true);
  });

  it('should detect "Empty parts array" error', () => {
    const error = new Error('Empty parts array in Gemini API response');
    expect(isEmptyPartsError(error)).toBe(true);
  });

  it('should detect "No text content found" error', () => {
    const error = new Error('No text content found in Gemini API response parts');
    expect(isEmptyPartsError(error)).toBe(true);
  });

  it('should not detect unrelated errors', () => {
    const error = new Error('Network timeout');
    expect(isEmptyPartsError(error)).toBe(false);
  });

  it('should handle null error', () => {
    expect(isEmptyPartsError(null)).toBe(false);
  });

  it('should handle undefined error', () => {
    expect(isEmptyPartsError(undefined)).toBe(false);
  });

  it('should handle error without message', () => {
    const error = { code: 500 };
    expect(isEmptyPartsError(error)).toBe(false);
  });
});

describe('getRetryDelayWithJitter', () => {
  it('should add jitter within 20% range', () => {
    const baseDelay = 1000;
    const minExpected = baseDelay * 0.8;
    const maxExpected = baseDelay * 1.2;
    
    // Test multiple times to ensure randomness
    for (let i = 0; i < 10; i++) {
      const delay = getRetryDelayWithJitter(baseDelay);
      expect(delay).toBeGreaterThanOrEqual(minExpected);
      expect(delay).toBeLessThanOrEqual(maxExpected);
    }
  });

  it('should return integer values', () => {
    const delay = getRetryDelayWithJitter(1000);
    expect(Number.isInteger(delay)).toBe(true);
  });

  it('should handle small delays', () => {
    const delay = getRetryDelayWithJitter(100);
    expect(delay).toBeGreaterThanOrEqual(80);
    expect(delay).toBeLessThanOrEqual(120);
  });

  it('should handle large delays', () => {
    const delay = getRetryDelayWithJitter(10000);
    expect(delay).toBeGreaterThanOrEqual(8000);
    expect(delay).toBeLessThanOrEqual(12000);
  });
});

describe('isAskingForClarification', () => {
  it('should detect "need to know" phrase', () => {
    const text = 'I need to know which dataset you are interested in';
    expect(isAskingForClarification(text)).toBe(true);
  });

  it('should detect "please specify" phrase', () => {
    const text = 'Please specify the time range for the analysis';
    expect(isAskingForClarification(text)).toBe(true);
  });

  it('should detect "which dataset" phrase', () => {
    const text = 'Which dataset would you like me to analyze?';
    expect(isAskingForClarification(text)).toBe(true);
  });

  it('should detect phrases case-insensitively', () => {
    const text = 'PLEASE SPECIFY the parameters';
    expect(isAskingForClarification(text)).toBe(true);
  });

  it('should not detect clarification in normal responses', () => {
    const text = 'Here are the results for your query';
    expect(isAskingForClarification(text)).toBe(false);
  });

  it('should handle empty string', () => {
    expect(isAskingForClarification('')).toBe(false);
  });

  it('should handle null', () => {
    expect(isAskingForClarification(null as any)).toBe(false);
  });

  it('should handle undefined', () => {
    expect(isAskingForClarification(undefined as any)).toBe(false);
  });

  it('should handle non-string input', () => {
    expect(isAskingForClarification(123 as any)).toBe(false);
  });
});

describe('extractJSONFromText', () => {
  it('should extract JSON from markdown code block with json label', () => {
    const text = '```json\n{"key": "value"}\n```';
    const result = extractJSONFromText(text);
    expect(result).toBe('{"key": "value"}');
  });

  it('should extract JSON from markdown code block without label', () => {
    const text = '```\n{"key": "value"}\n```';
    const result = extractJSONFromText(text);
    expect(result).toBe('{"key": "value"}');
  });

  it('should handle code blocks with extra whitespace', () => {
    const text = '```json  \n  {"key": "value"}  \n  ```';
    const result = extractJSONFromText(text);
    expect(result).toBe('{"key": "value"}');
  });

  it('should return text as-is if no code blocks', () => {
    const text = '{"key": "value"}';
    const result = extractJSONFromText(text);
    expect(result).toBe('{"key": "value"}');
  });

  it('should extract first code block if multiple exist', () => {
    const text = '```json\n{"first": true}\n```\n```json\n{"second": true}\n```';
    const result = extractJSONFromText(text);
    expect(result).toBe('{"first": true}');
  });

  it('should handle empty code blocks', () => {
    const text = '```\n\n```';
    const result = extractJSONFromText(text);
    expect(result).toBe('');
  });

  it('should trim result', () => {
    const text = '  {"key": "value"}  ';
    const result = extractJSONFromText(text);
    expect(result).toBe('{"key": "value"}');
  });
});