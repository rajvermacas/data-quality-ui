import { NextRequest, NextResponse } from 'next/server';
import { AIQueryRequest, AIChartResponse, APIErrorResponse } from '@/types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff delays in ms

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

/**
 * Sanitizes user input by removing HTML tags and dangerous content
 */
function sanitizeQuery(query: string): string {
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
function validateQuery(query: string): { isValid: boolean; error?: string } {
  if (!query || typeof query !== 'string') {
    return { isValid: false, error: 'Query is required' };
  }
  
  if (query.length > 500) {
    return { isValid: false, error: 'Query must be 500 characters or less' };
  }
  
  return { isValid: true };
}

/**
 * Creates the prompt for Gemini API with structured output requirements
 */
function createGeminiPrompt(query: string, dataContext?: any[]): string {
  const contextData = dataContext ? JSON.stringify(dataContext.slice(0, 50)) : '[]';
  
  return `You are a data visualization expert analyzing data quality metrics. Based on the user query and data context, generate a JSON response for creating a chart.

User Query: "${query}"

Data Context (sample records): ${contextData}

IMPORTANT: Your response must be valid JSON only, no additional text. The JSON should follow this exact structure:

{
  "chartType": "line|bar|pie|scatter|area|heatmap",
  "title": "Descriptive chart title",
  "data": [array of data objects],
  "config": {
    "xAxis": "field_name_for_x_axis",
    "yAxis": ["field_name_for_y_axis"]
  },
  "filters": [
    {
      "field": "field_name",
      "label": "Display Label",
      "values": ["filter_values"]
    }
  ],
  "insights": "Brief insights about the data shown"
}

Chart Type Selection Guidelines:
- Use "line" for trends over time
- Use "bar" for comparisons and categorical data
- Use "pie" for proportions and distributions
- Use "scatter" for correlations
- Use "area" for cumulative data
- Use "heatmap" for multi-dimensional analysis

Data Fields Available:
- dataset_name, source, tenant_id, rule_type, dimension
- fail_rate_1m, fail_rate_3m, fail_rate_12m, fail_rate_total
- trend_flag (up/down/equal)
- business_date_latest

Generate appropriate data based on the query context and ensure the response is valid JSON.`;
}

/**
 * Makes API call to Gemini with retry logic
 */
async function callGeminiAPI(prompt: string, retryCount = 0): Promise<AIChartResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
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

    const responseText = data.candidates[0].content.parts[0].text;
    
    try {
      const chartResponse: AIChartResponse = JSON.parse(responseText);
      
      // Validate required fields
      if (!chartResponse.chartType || !chartResponse.title || !chartResponse.config) {
        throw new Error('Invalid response structure from Gemini API');
      }
      
      return chartResponse;
    } catch (parseError) {
      throw new Error(`Failed to parse Gemini response as JSON: ${parseError}`);
    }
    
  } catch (error) {
    console.error(`Gemini API call failed (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < MAX_RETRIES) {
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]));
      return callGeminiAPI(prompt, retryCount + 1);
    }
    
    throw error;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<AIChartResponse | APIErrorResponse>> {
  try {
    const body: AIQueryRequest = await request.json();
    
    // Validate query
    const validation = validateQuery(body.query);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error! },
        { status: 400 }
      );
    }
    
    // Sanitize query
    const sanitizedQuery = sanitizeQuery(body.query);
    
    // Create prompt for Gemini
    const prompt = createGeminiPrompt(sanitizedQuery, body.dataContext);
    
    // Call Gemini API with retry logic
    const chartResponse = await callGeminiAPI(prompt);
    
    return NextResponse.json(chartResponse);
    
  } catch (error) {
    console.error('API route error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Gemini API key not configured')) {
        return NextResponse.json(
          { error: 'Gemini API key not configured' },
          { status: 500 }
        );
      }
      
      if (error.message.includes('Failed to parse')) {
        return NextResponse.json(
          { error: 'Invalid response from AI service' },
          { status: 502 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to process query after multiple attempts' },
      { status: 500 }
    );
  }
}