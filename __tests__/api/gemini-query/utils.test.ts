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

  it('should extract chart JSON from concatenated LangChain response', () => {
    const concatenatedResponse = 
      '{"type":"executableCode","executableCode":{"language":"PYTHON","code":"import pandas as pd"}}' +
      '{"type":"codeExecutionResult","codeExecutionResult":{"outcome":"OUTCOME_OK","output":"data loaded"}}' +
      '{"chartType":"bar","title":"Test Chart","data":[{"x":1,"y":2}],"config":{"xAxis":"x","yAxis":["y"]}}';
    
    const result = extractJSONFromText(concatenatedResponse);
    const parsed = JSON.parse(result);
    
    expect(parsed.chartType).toBe('bar');
    expect(parsed.title).toBe('Test Chart');
    expect(parsed.data).toEqual([{"x":1,"y":2}]);
    expect(parsed.config).toEqual({"xAxis":"x","yAxis":["y"]});
  });

  it('should handle complex concatenated response with multiple code blocks', () => {
    const complexResponse = 
      '{"type":"executableCode","executableCode":{"language":"PYTHON","code":"df = pd.read_csv(\\"file.csv\\")"}}' +
      '{"type":"codeExecutionResult","codeExecutionResult":{"outcome":"OUTCOME_OK","output":"DataFrame loaded"}}' +
      '{"type":"executableCode","executableCode":{"language":"PYTHON","code":"result = df.groupby(\\"category\\").sum()"}}' +
      '{"type":"codeExecutionResult","codeExecutionResult":{"outcome":"OUTCOME_OK","output":"[{\\"category\\": \\"A\\", \\"value\\": 100}]"}}' +
      '{"chartType":"line","title":"Category Analysis","data":[{"category":"A","value":100}],"config":{"xAxis":"category","yAxis":["value"]},"insights":"Analysis complete"}';
    
    const result = extractJSONFromText(complexResponse);
    const parsed = JSON.parse(result);
    
    expect(parsed.chartType).toBe('line');
    expect(parsed.title).toBe('Category Analysis');
    expect(parsed.insights).toBe('Analysis complete');
  });

  it('should fallback to last object if no chart JSON found', () => {
    const responseWithoutChart = 
      '{"type":"executableCode","executableCode":{"language":"PYTHON","code":"print(\\"hello\\")"}}' +
      '{"type":"codeExecutionResult","codeExecutionResult":{"outcome":"OUTCOME_OK","output":"hello"}}' +
      '{"summary":"No chart data available","message":"Query could not generate visualization"}';
    
    const result = extractJSONFromText(responseWithoutChart);
    const parsed = JSON.parse(result);
    
    expect(parsed.summary).toBe('No chart data available');
    expect(parsed.message).toBe('Query could not generate visualization');
  });
});