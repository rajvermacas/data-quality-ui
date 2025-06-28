/**
 * Structured API call functions for Gemini integration
 */

import { AIChartResponse } from '@/types';
import { GEMINI_API_URL, GeminiResponse } from './types';
import { MAX_RETRIES, RETRY_DELAYS, getRetryDelayWithJitter } from './utils';
import { validateChartResponse } from './responseHandlers';

/**
 * Response schema for structured output
 */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    chartType: {
      type: "string"
    },
    title: {
      type: "string"
    },
    data: {
      type: "array",
      items: {
        type: "object",
        properties: {
          x: { type: "string" },
          y: { type: "number" }
        },
        required: ["x", "y"]
      }
    },
    config: {
      type: "object",
      properties: {
        xAxis: { type: "string" },
        yAxis: { 
          type: "array",
          items: {
            type: "string"
          }
        }
      },
      required: ["xAxis", "yAxis"]
    },
    filters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          label: { type: "string" },
          values: { 
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["field", "label", "values"]
      }
    },
    insights: {
      type: "string"
    }
  },
  required: ["chartType", "title", "data", "config"]
};

/**
 * Makes API call to Gemini with structured output (guaranteed JSON)
 */
export async function callGeminiAPIWithStructuredOutput(
  prompt: string, 
  fileUri?: string, 
  retryCount = 0
): Promise<AIChartResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const parts: any[] = [{ text: prompt }];
    
    if (fileUri) {
      parts.push({
        fileData: {
          mimeType: 'text/csv',
          fileUri: fileUri
        }
      });
    }
    
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: parts
        }],
        generationConfig: {
          temperature: 0.5,
          topK: 1,
          topP: 1,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          thinkingConfig: {
            thinkingBudget: 0
          }
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error('Invalid Gemini response structure:', JSON.stringify(data, null, 2));
      throw new Error('No response candidates from Gemini API');
    }

    const structuredParts = data.candidates[0].content.parts;
    
    if (!structuredParts) {
      throw new Error('No content parts in Gemini API structured response');
    }
    
    const structuredPartsArray = Array.isArray(structuredParts) ? structuredParts : [structuredParts];
    
    if (structuredPartsArray.length === 0) {
      throw new Error('Empty parts array in Gemini API structured response');
    }
    
    const firstPart = structuredPartsArray[0];
    if (!firstPart || typeof firstPart !== 'object') {
      throw new Error('Invalid part structure in Gemini API response');
    }
    
    if (!firstPart.hasOwnProperty('text')) {
      console.error('Part structure missing text property:', JSON.stringify(firstPart, null, 2));
      throw new Error('No text property in Gemini API response part');
    }
    
    const responseText = firstPart.text;
    console.log('Gemini structured output responseText:', responseText);
    
    if (!responseText) {
      console.error('First part structure:', JSON.stringify(firstPart, null, 2));
      throw new Error('No text property in Gemini API response part');
    }
    
    try {
      const chartResponse: AIChartResponse = JSON.parse(responseText);
      return validateChartResponse(chartResponse);
    } catch (parseError) {
      console.error('Raw Gemini response (structured):', responseText);
      throw new Error(`Failed to parse structured Gemini response as JSON: ${parseError}`);
    }
    
  } catch (error) {
    console.error(`Gemini API call failed (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < MAX_RETRIES) {
      const delay = getRetryDelayWithJitter(RETRY_DELAYS[retryCount]);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGeminiAPIWithStructuredOutput(prompt, fileUri, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * Direct structured API call without code execution (fallback)
 */
export async function callGeminiAPIDirectStructured(
  query: string, 
  fileUri?: string, 
  retryCount = 0
): Promise<AIChartResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }
  
  try {
    const directPrompt = `Analyze the data quality metrics in the uploaded CSV file to answer this query: "${query}"

Please provide a response in the following JSON format:
{
  "chartType": "bar" | "line" | "scatter" | "pie" | "table",
  "title": "Descriptive title for the visualization",
  "data": [array of data objects with x/y or appropriate fields],
  "config": {
    "xAxis": "field name for x-axis",
    "yAxis": ["array of field names for y-axis"]
  },
  "filters": [array of applied filters],
  "insights": "Key insights and analysis"
}

Focus on providing meaningful insights based on patterns in the data. For queries about "worst" or "best" datasets, analyze failure rates and trends.`;

    const parts: any[] = [{ text: directPrompt }];
    
    if (fileUri) {
      parts.push({
        fileData: {
          mimeType: 'text/csv',
          fileUri: fileUri
        }
      });
    }
    
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: parts
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.8,
          topK: 1,
          topP: 1,
          maxOutputTokens: 4096
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response candidates from Gemini API');
    }

    if (!data.candidates[0].content || !data.candidates[0].content.parts) {
      throw new Error('No content parts in Gemini API response');
    }

    const responseParts = data.candidates[0].content.parts;
    const firstPart = responseParts[0];
    
    if (!firstPart || !firstPart.text) {
      throw new Error('No text in Gemini API response');
    }

    const chartResponse: AIChartResponse = JSON.parse(firstPart.text);
    
    // Validate and normalize filters
    if (!Array.isArray(chartResponse.filters)) {
      chartResponse.filters = [];
    } else {
      chartResponse.filters = chartResponse.filters.map(filter => ({
        field: filter.field || '',
        label: filter.label || filter.field || 'Unknown',
        values: Array.isArray(filter.values) ? filter.values : []
      }));
    }
    
    // Add note about estimation
    if (chartResponse.insights && !chartResponse.insights.includes('Note:')) {
      chartResponse.insights += '\n\nNote: Results based on pattern analysis. For precise calculations, please try a more specific query.';
    }
    
    return chartResponse;
    
  } catch (error) {
    console.error(`Direct Gemini API call failed (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < MAX_RETRIES) {
      const delay = getRetryDelayWithJitter(RETRY_DELAYS[retryCount]);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGeminiAPIDirectStructured(query, fileUri, retryCount + 1);
    }
    
    throw error;
  }
}