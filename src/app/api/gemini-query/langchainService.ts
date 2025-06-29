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
  if (typeof content === 'string') {
    return content;
  }
  
  if (Array.isArray(content)) {
    let responseText = '';
    for (const part of content) {
      if (typeof part === 'string') {
        responseText += part;
      } else if (part && typeof part === 'object' && 'text' in part) {
        responseText += part.text;
      }
    }
    if (responseText) {
      return responseText;
    }
  }
  
  // Fallback for other content types
  if (content && typeof content === 'object' && 'text' in content) {
    return content.text;
  }
  
  // Last resort - convert to string, but throw if empty
  const result = String(content || '');
  if (!result.trim()) {
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
 * Direct structured query without code execution using LangChain
 */
export async function callGeminiDirectStructuredLC(
  query: string,
  fileUri?: string
): Promise<AIChartResponse> {
  const model = getGeminiModel({ temperature: 0.5, maxOutputTokens: 4096 });
  
  // Use JSON output parser for simpler parsing
  const parser = new JsonOutputParser<AIChartResponse>();
  
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
  
  const chain = RunnableSequence.from([
    () => messages,
    model,
    parser
  ]);
  
  try {
    const response = await chain.invoke({});
    
    // Validate response structure
    if (!response.chartType || !response.title || !response.data || !response.config) {
      throw new Error('Invalid response structure from LangChain');
    }
    
    // Normalize filters
    if (!Array.isArray(response.filters)) {
      response.filters = [];
    } else {
      response.filters = response.filters.map((filter: any) => ({
        field: filter.field || '',
        label: filter.label || filter.field || 'Unknown',
        values: Array.isArray(filter.values) ? filter.values : []
      }));
    }
    
    return response as AIChartResponse;
  } catch (error) {
    console.error('LangChain direct structured error:', error);
    throw error;
  }
}

/**
 * Retry wrapper for LangChain calls
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Calculate delay with exponential backoff and jitter
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
      console.log(`Retry ${i + 1}/${maxRetries} after ${Math.round(delay)}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}