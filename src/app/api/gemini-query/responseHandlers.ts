/**
 * Response parsing and validation functions for Gemini API
 */

import { AIChartResponse } from '@/types';

/**
 * Creates a clarification response without fake data
 */
export function createClarificationResponse(clarificationText: string): AIChartResponse {
  return {
    chartType: 'bar' as const,
    title: 'Additional Information Needed',
    data: [],
    config: {
      xAxis: 'dataset_name',
      yAxis: ['fail_rate_1m']
    },
    filters: [],
    insights: clarificationText
  };
}

/**
 * Validates and normalizes a chart response
 */
export function validateChartResponse(chartResponse: AIChartResponse): AIChartResponse {
  // Validate required fields
  if (!chartResponse.chartType || !chartResponse.title || !chartResponse.config) {
    throw new Error('Invalid response structure from Gemini API - missing required fields');
  }
  
  // Validate chart type
  const validChartTypes = ['line', 'bar', 'pie', 'scatter', 'area', 'heatmap'];
  if (!validChartTypes.includes(chartResponse.chartType)) {
    console.warn(`Invalid chart type: ${chartResponse.chartType}, defaulting to 'bar'`);
    chartResponse.chartType = 'bar';
  }
  
  // Validate config structure
  if (!chartResponse.config.xAxis || !chartResponse.config.yAxis) {
    throw new Error('Invalid response structure from Gemini API - missing axis configuration');
  }
  
  // Ensure yAxis is an array
  if (!Array.isArray(chartResponse.config.yAxis)) {
    console.warn('yAxis is not an array, converting to array');
    chartResponse.config.yAxis = [chartResponse.config.yAxis as string];
  }
  
  // Ensure data is an array
  if (!Array.isArray(chartResponse.data)) {
    console.warn('Data is not an array, defaulting to empty array');
    chartResponse.data = [];
  }
  
  // Ensure filters is an array and validate structure
  if (!Array.isArray(chartResponse.filters)) {
    console.warn('Filters is not an array, defaulting to empty array');
    chartResponse.filters = [];
  } else {
    // Validate each filter has the required structure
    chartResponse.filters = chartResponse.filters.map(filter => ({
      field: filter.field || '',
      label: filter.label || filter.field || 'Unknown',
      values: Array.isArray(filter.values) ? filter.values : []
    }));
  }
  
  return chartResponse;
}

/**
 * Creates an error response for API failures
 */
export function createErrorResponse(error: string, details?: string): AIChartResponse {
  return {
    chartType: 'bar' as const,
    title: 'Query Processing Error',
    data: [],
    config: {
      xAxis: 'dataset_name',
      yAxis: ['fail_rate_1m']
    },
    filters: [],
    insights: details || `Unable to process the query. ${error}`
  };
}

/**
 * Creates a service configuration error response
 */
export function createConfigurationErrorResponse(): AIChartResponse {
  return {
    chartType: 'bar' as const,
    title: 'Service Configuration Error',
    data: [],
    config: {
      xAxis: 'dataset_name',
      yAxis: ['fail_rate_1m']
    },
    filters: [],
    insights: 'The AI service is experiencing configuration issues. Please try again later.'
  };
}