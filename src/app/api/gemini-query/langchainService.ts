/**
 * LangChain service for Gemini API integration
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { z } from 'zod';
import { AIChartResponse } from '@/types';
import { HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { validateChartResponse } from './responseHandlers';
import { MAX_RETRIES, RETRY_DELAYS, getRetryDelayWithJitter } from './utils';

// Schema for structured output validation
const ChartResponseSchema = z.object({
  chartType: z.enum(['line', 'bar', 'pie', 'scatter', 'area', 'heatmap']),
  title: z.string(),
  data: z.array(z.record(z.any())),
  config: z.object({
    xAxis: z.string(),
    yAxis: z.array(z.string()),
    groupBy: z.string().optional()
  }),
  filters: z.array(z.object({
    field: z.string(),
    label: z.string(),
    values: z.array(z.string())
  })),
  insights: z.string().optional()
});

// Type for schema
export type ChartResponseType = z.infer<typeof ChartResponseSchema>;

/**
 * Helper function to extract text content from LangChain response
 * Handles various response content formats from Gemini
 */
function extractTextFromResponse(content: any): string {
  console.log('=== EXTRACT TEXT DEBUG ===');
  console.log('Input content type:', typeof content);
  console.log('Input content:', content);
  
  if (typeof content === 'string') {
    console.log('✅ Content is already a string');
    return content;
  }
  
  if (Array.isArray(content)) {
    console.log('Content is an array with length:', content.length);
    let responseText = '';
    for (let i = 0; i < content.length; i++) {
      const part = content[i];
      console.log(`Array item ${i}:`, part);
      console.log(`Array item ${i} type:`, typeof part);
      
      if (typeof part === 'string') {
        responseText += part;
      } else if (part && typeof part === 'object') {
        // Handle different object structures
        if ('text' in part) {
          console.log(`Found text property in item ${i}:`, part.text);
          responseText += part.text;
        } else if ('content' in part) {
          console.log(`Found content property in item ${i}:`, part.content);
          responseText += extractTextFromResponse(part.content); // Recursive call
        } else if ('message' in part && part.message && 'content' in part.message) {
          console.log(`Found message.content in item ${i}:`, part.message.content);
          responseText += extractTextFromResponse(part.message.content); // Recursive call
        } else {
          // Try to serialize the object
          console.log(`Attempting to serialize object item ${i}`);
          try {
            const serialized = JSON.stringify(part);
            if (serialized && serialized !== '{}' && serialized !== 'null') {
              responseText += serialized;
            }
          } catch (serError) {
            console.warn(`Failed to serialize item ${i}:`, serError);
          }
        }
      }
    }
    
    console.log('Extracted text from array:', responseText);
    if (responseText) {
      return responseText;
    }
  }
  
  // Fallback for other content types
  if (content && typeof content === 'object') {
    if ('text' in content) {
      console.log('Found text property in object:', content.text);
      return content.text;
    } else if ('content' in content) {
      console.log('Found content property in object:', content.content);
      return extractTextFromResponse(content.content); // Recursive call
    } else if ('message' in content && content.message && 'content' in content.message) {
      console.log('Found message.content in object:', content.message.content);
      return extractTextFromResponse(content.message.content); // Recursive call
    }
  }
  
  // Last resort - convert to string, but log what we're doing
  console.log('Using last resort string conversion');
  const result = String(content || '');
  console.log('String conversion result:', result);
  console.log('=== END EXTRACT TEXT DEBUG ===');
  
  if (!result.trim() || result === '[object Object]') {
    throw new Error('No text content found in LangChain response');
  }
  
  return result;
}

/**
 * Initialize Gemini model through LangChain
 */
function getGeminiModel(options: {
  withTools?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
} = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const modelConfig = {
    model: 'gemini-2.5-flash',
    temperature: options.temperature ?? 0.7,
    maxOutputTokens: options.maxOutputTokens ?? 4096,
    apiKey,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
  };

  if (options.withTools) {
    // For code execution, we'll still use the REST API for now
    // as LangChain doesn't directly support Gemini's code execution
    return new ChatGoogleGenerativeAI(modelConfig);
  }

  return new ChatGoogleGenerativeAI(modelConfig);
}

/**
 * Call Gemini with code execution capabilities using LangChain
 * Uses Google's native code execution tool through LangChain
 */
export async function callGeminiWithCodeExecutionLC(
  prompt: string,
  fileUri?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  try {
    console.log('LangChain code execution call with fileUri:', fileUri ? 'provided' : 'not provided');
    
    // Initialize model with code execution tool
    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      temperature: 0.5,
      maxOutputTokens: 4096,
      apiKey,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    // Bind the code execution tool
    const codeExecutionTool = { codeExecution: {} };
    const modelWithCodeExecution = model.bindTools([codeExecutionTool]);
    
    // Build messages based on whether we have file context
    // Use proper file attachment format for Gemini + LangChain
    const messages = fileUri 
      ? [
          new HumanMessage({
            content: [
              { type: "text", text: `${prompt}\n\nYou have access to a CSV file uploaded for data analysis. Use code execution to analyze this data.` },
              {
                type: "media",
                mimeType: "text/csv",
                fileUri: fileUri
              }
            ]
          })
        ]
      : [new HumanMessage(prompt)];
    
    if (fileUri) {
      console.log('LangChain: Sending message with file attachment using proper media format');
      console.log('File URI:', fileUri);
    }
      
    const response = await modelWithCodeExecution.invoke(messages);
    console.log('LangChain code execution response received, extracting content...');
    
    // Extract text content from response with proper type handling
    return extractTextFromResponse(response.content);
  } catch (error) {
    console.error('LangChain code execution error:', error);
    throw error;
  }
}

/**
 * Call Gemini for structured output using LangChain
 */
export async function callGeminiWithStructuredOutputLC(
  prompt: string,
  fileUri?: string
): Promise<AIChartResponse> {
  const model = getGeminiModel({ temperature: 0.5, maxOutputTokens: 4096 });
  
  // Use JsonOutputParser to avoid template parsing issues
  const parser = new JsonOutputParser<AIChartResponse>();
  
  const systemPrompt = fileUri 
    ? `You are a data analysis assistant with access to a CSV file at: ${fileUri}. 
       You must respond with valid JSON that matches this exact structure:
       {
         "chartType": "line" | "bar" | "pie" | "scatter" | "area" | "heatmap",
         "title": "string",
         "data": [{"key": "value"}],
         "config": {"xAxis": "string", "yAxis": ["string"], "groupBy": "string?"},
         "filters": [{"field": "string", "label": "string", "values": ["string"]}],
         "insights": "string?"
       }`
    : `You are a data analysis assistant. You must respond with valid JSON that matches this exact structure:
       {
         "chartType": "line" | "bar" | "pie" | "scatter" | "area" | "heatmap",
         "title": "string", 
         "data": [{"key": "value"}],
         "config": {"xAxis": "string", "yAxis": ["string"], "groupBy": "string?"},
         "filters": [{"field": "string", "label": "string", "values": ["string"]}],
         "insights": "string?"
       }`;
    
  // Use direct messages to avoid template parsing
  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(prompt)
  ];
  
  // Create chain with parser
  const chain = RunnableSequence.from([
    () => messages,
    model,
    parser
  ]);
  
  try {
    const response = await chain.invoke({});
    
    // Validate and normalize filters
    if (!Array.isArray(response.filters)) {
      response.filters = [];
    } else {
      response.filters = response.filters.map(filter => ({
        field: filter.field || '',
        label: filter.label || filter.field || 'Unknown',
        values: Array.isArray(filter.values) ? filter.values : []
      }));
    }
    
    return response as AIChartResponse;
  } catch (error) {
    console.error('LangChain structured output error:', error);
    throw error;
  }
}

/**
 * Direct structured query without code execution using LangChain with hybrid approach
 */
export async function callGeminiDirectStructuredLC(
  query: string,
  fileUri?: string
): Promise<AIChartResponse> {
  const model = getGeminiModel({ temperature: 0.5, maxOutputTokens: 4096 });
  
  const systemPrompt = `You are a data analysis assistant that responds with JSON formatted data visualization configurations.
    ${fileUri ? `You have access to a CSV file at: ${fileUri}.` : ''}
    
    You must respond with a JSON object containing:
    - chartType: one of "line", "bar", "pie", "scatter", "area", "heatmap"
    - title: descriptive title for the chart
    - data: array of data points
    - config: object with xAxis (string), yAxis (array of strings), and optional groupBy
    - filters: array of filter objects with field, label, and values
    - insights: optional string with analysis insights`;
    
  // Use direct messages to avoid template parsing issues
  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(query)
  ];
  
  // Attempt 1: Try withStructuredOutput (preferred method)
  try {
    console.log('Attempting structured output with withStructuredOutput()');
    const structuredModel = model.withStructuredOutput(ChartResponseSchema, {
      name: "chart_response"
    });
    
    const response = await withRetry(() => structuredModel.invoke(messages));
    console.log('Successfully used withStructuredOutput() with retry logic');
    
    // Enhanced logging for debugging
    console.log('=== LANGCHAIN withStructuredOutput RESPONSE ===');
    console.log('Raw response from withStructuredOutput:', JSON.stringify(response, null, 2));
    console.log('Response type:', typeof response);
    console.log('Response data:', response?.data);
    console.log('Response config:', response?.config);
    console.log('=== END withStructuredOutput RESPONSE ===');
    
    // Validate and normalize the response
    const validatedResponse = validateAndNormalizeResponse(response);
    console.log('✅ withStructuredOutput response validated successfully');
    return validatedResponse;
    
  } catch (structuredError: any) {
    console.warn('withStructuredOutput() failed, falling back to JsonOutputParser:', structuredError.message);
    
    // Check if this is a known LangChain.js issue with Google Gemini structured output
    if (structuredError.message?.includes('No parseable tool calls') || 
        structuredError.message?.includes('withStructuredOutput') ||
        structuredError.message?.includes('GoogleGenerativeAIToolsOutputParser')) {
      console.log('Detected known LangChain.js Google Gemini structured output issue');
    }
    
    // Check if this is a rate limiting or API configuration error
    if (structuredError.message?.includes('API key not configured')) {
      throw structuredError; // Let configuration errors bubble up immediately
    }
    
    if (structuredError.message?.includes('rate limit') || 
        structuredError.message?.includes('quota exceeded') ||
        structuredError.message?.includes('429')) {
      console.log('Rate limiting detected, error will be handled by retry logic');
    }
    
    // Attempt 2: Fallback to JsonOutputParser (current method)
    try {
      console.log('Using fallback JsonOutputParser approach');
      const parser = new JsonOutputParser<AIChartResponse>();
      
      const chain = RunnableSequence.from([
        () => messages,
        model,
        parser
      ]);
      
      const response = await withRetry(() => chain.invoke({}));
      console.log('Successfully used JsonOutputParser fallback with retry logic');
      
      // Enhanced logging for debugging
      console.log('=== LANGCHAIN JsonOutputParser RESPONSE ===');
      console.log('Raw response from JsonOutputParser:', JSON.stringify(response, null, 2));
      console.log('Response type:', typeof response);
      console.log('Response data:', response?.data);
      console.log('Response config:', response?.config);
      console.log('=== END JsonOutputParser RESPONSE ===');
      
      // Validate and normalize the response
      const validatedResponse = validateAndNormalizeResponse(response);
      console.log('✅ JsonOutputParser response validated successfully');
      return validatedResponse;
      
    } catch (fallbackError: any) {
      console.error('Both structured output methods failed');
      console.error('withStructuredOutput error:', structuredError);
      console.error('JsonOutputParser fallback error:', fallbackError);
      
      // Provide specific error messages based on error types
      if (fallbackError.message?.includes('API key not configured')) {
        throw new Error('Gemini API key not configured');
      }
      
      if (fallbackError.message?.includes('rate limit') || 
          fallbackError.message?.includes('quota exceeded')) {
        throw new Error('API rate limit exceeded. Please try again later.');
      }
      
      if (fallbackError.message?.includes('400') || 
          fallbackError.message?.includes('Bad Request')) {
        throw new Error('Invalid request format. Please check your query and try again.');
      }
      
      throw new Error(`All structured output methods failed. Primary error: ${structuredError.message}. Fallback error: ${fallbackError.message}`);
    }
  }
}

/**
 * Validates and normalizes the response from either structured output method
 * Uses the same validation logic as the direct API calls for consistency
 */
function validateAndNormalizeResponse(response: any): AIChartResponse {
  try {
    // Use the same validation function as the direct API calls
    const validatedResponse = validateChartResponse(response as AIChartResponse);
    
    // Additional LangChain-specific validation for Zod schema compliance
    try {
      ChartResponseSchema.parse(validatedResponse);
      console.log('Response passed both validateChartResponse and Zod schema validation');
    } catch (zodError) {
      console.warn('Response passed validateChartResponse but failed Zod validation:', zodError);
      // Continue with the response since validateChartResponse already normalized it
    }
    
    return validatedResponse;
  } catch (validationError: any) {
    console.error('Response validation failed:', validationError);
    throw new Error(`Response validation failed: ${validationError?.message || validationError}`);
  }
}

/**
 * Enhanced retry wrapper for LangChain calls that matches direct API approach
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retryCount: number = 0
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`LangChain call failed (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < MAX_RETRIES) {
      const delay = getRetryDelayWithJitter(RETRY_DELAYS[retryCount]);
      console.log(`Retrying LangChain call in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retryCount + 1);
    }
    
    console.error(`Max retries (${MAX_RETRIES}) exceeded for LangChain call`);
    throw error;
  }
}