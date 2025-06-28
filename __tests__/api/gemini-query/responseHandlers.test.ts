/**
 * Tests for response handler functions
 */

import { 
  createClarificationResponse,
  validateChartResponse,
  createErrorResponse,
  createConfigurationErrorResponse
} from '@/app/api/gemini-query/responseHandlers';
import { AIChartResponse } from '@/types';

describe('createClarificationResponse', () => {
  it('should create a valid clarification response', () => {
    const clarificationText = 'Please specify which dataset you want to analyze';
    const response = createClarificationResponse(clarificationText);
    
    expect(response.chartType).toBe('bar');
    expect(response.title).toBe('Additional Information Needed');
    expect(response.data).toEqual([]);
    expect(response.config.xAxis).toBe('dataset_name');
    expect(response.config.yAxis).toEqual(['fail_rate_1m']);
    expect(response.filters).toEqual([]);
    expect(response.insights).toBe(clarificationText);
  });
});

describe('validateChartResponse', () => {
  it('should validate a valid chart response', () => {
    const input: AIChartResponse = {
      chartType: 'line',
      title: 'Test Chart',
      data: [{ x: 'A', y: 1 }],
      config: {
        xAxis: 'name',
        yAxis: ['value']
      },
      filters: [],
      insights: 'Test insights'
    };
    
    const result = validateChartResponse(input);
    expect(result).toEqual(input);
  });

  it('should throw error for missing required fields', () => {
    const input = {
      title: 'Test Chart'
    } as any;
    
    expect(() => validateChartResponse(input)).toThrow(
      'Invalid response structure from Gemini API - missing required fields'
    );
  });

  it('should correct invalid chart type to bar', () => {
    const input: AIChartResponse = {
      chartType: 'invalid' as any,
      title: 'Test Chart',
      data: [],
      config: {
        xAxis: 'name',
        yAxis: ['value']
      },
      filters: [],
      insights: ''
    };
    
    const result = validateChartResponse(input);
    expect(result.chartType).toBe('bar');
  });

  it('should throw error for missing axis configuration', () => {
    const input = {
      chartType: 'line',
      title: 'Test Chart',
      data: [],
      config: {}
    } as any;
    
    expect(() => validateChartResponse(input)).toThrow(
      'Invalid response structure from Gemini API - missing axis configuration'
    );
  });

  it('should convert non-array yAxis to array', () => {
    const input: any = {
      chartType: 'line',
      title: 'Test Chart',
      data: [],
      config: {
        xAxis: 'name',
        yAxis: 'value'
      },
      filters: []
    };
    
    const result = validateChartResponse(input);
    expect(result.config.yAxis).toEqual(['value']);
  });

  it('should convert non-array data to empty array', () => {
    const input: any = {
      chartType: 'line',
      title: 'Test Chart',
      data: null,
      config: {
        xAxis: 'name',
        yAxis: ['value']
      },
      filters: []
    };
    
    const result = validateChartResponse(input);
    expect(result.data).toEqual([]);
  });

  it('should convert non-array filters to empty array', () => {
    const input: any = {
      chartType: 'line',
      title: 'Test Chart',
      data: [],
      config: {
        xAxis: 'name',
        yAxis: ['value']
      },
      filters: null
    };
    
    const result = validateChartResponse(input);
    expect(result.filters).toEqual([]);
  });

  it('should normalize filter structure', () => {
    const input: any = {
      chartType: 'line',
      title: 'Test Chart',
      data: [],
      config: {
        xAxis: 'name',
        yAxis: ['value']
      },
      filters: [
        { field: 'dataset' },
        { field: 'system', label: 'System', values: null },
        { field: 'tenant', label: 'Tenant', values: ['A', 'B'] }
      ]
    };
    
    const result = validateChartResponse(input);
    expect(result.filters).toEqual([
      { field: 'dataset', label: 'dataset', values: [] },
      { field: 'system', label: 'System', values: [] },
      { field: 'tenant', label: 'Tenant', values: ['A', 'B'] }
    ]);
  });
});

describe('createErrorResponse', () => {
  it('should create error response with custom details', () => {
    const response = createErrorResponse('Network error', 'Unable to connect to server');
    
    expect(response.chartType).toBe('bar');
    expect(response.title).toBe('Query Processing Error');
    expect(response.data).toEqual([]);
    expect(response.config.xAxis).toBe('dataset_name');
    expect(response.config.yAxis).toEqual(['fail_rate_1m']);
    expect(response.filters).toEqual([]);
    expect(response.insights).toBe('Unable to connect to server');
  });

  it('should create error response with default message', () => {
    const response = createErrorResponse('Network error');
    
    expect(response.insights).toBe('Unable to process the query. Network error');
  });
});

describe('createConfigurationErrorResponse', () => {
  it('should create configuration error response', () => {
    const response = createConfigurationErrorResponse();
    
    expect(response.chartType).toBe('bar');
    expect(response.title).toBe('Service Configuration Error');
    expect(response.data).toEqual([]);
    expect(response.config.xAxis).toBe('dataset_name');
    expect(response.config.yAxis).toEqual(['fail_rate_1m']);
    expect(response.filters).toEqual([]);
    expect(response.insights).toBe(
      'The AI service is experiencing configuration issues. Please try again later.'
    );
  });
});