import { NextRequest, NextResponse } from 'next/server';
import { AIQueryRequest, AIChartResponse, APIErrorResponse } from '@/types';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import path from 'path';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff delays in ms

// File upload cache - store uploaded file URI for reuse
let cachedFileUri: string | null = null;
let cachedFileExpiresAt: Date | null = null;

interface GeminiResponsePart {
  text?: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<GeminiResponsePart>;
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
 * Uploads the CSV file to Gemini and returns the file URI
 * Uses caching to avoid re-uploading the same file
 */
async function uploadCSVToGemini(): Promise<string> {
  // Check if we have a cached file URI that hasn't expired
  if (cachedFileUri && cachedFileExpiresAt && new Date() < cachedFileExpiresAt) {
    console.log('Using cached file URI:', cachedFileUri);
    return cachedFileUri;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const fileManager = new GoogleAIFileManager(apiKey);
    
    // Get the path to the CSV file
    const csvPath = path.join(process.cwd(), 'resources', 'artifacts', 'full_summary.csv');
    console.log('Uploading CSV file from:', csvPath);
    
    // Upload the file
    const uploadResult = await fileManager.uploadFile(csvPath, {
      mimeType: 'text/csv',
      displayName: 'Data Quality Summary'
    });
    
    console.log('File uploaded successfully:', {
      uri: uploadResult.file.uri,
      displayName: uploadResult.file.displayName,
      mimeType: uploadResult.file.mimeType,
      sizeBytes: uploadResult.file.sizeBytes
    });
    
    // Cache the file URI (files expire after 48 hours)
    cachedFileUri = uploadResult.file.uri;
    cachedFileExpiresAt = new Date(Date.now() + 47 * 60 * 60 * 1000); // 47 hours
    
    return uploadResult.file.uri;
  } catch (error) {
    console.error('Failed to upload CSV file:', error);
    throw new Error('Failed to upload data file to AI service');
  }
}

/**
 * Creates the prompt for Gemini API with structured output requirements
 */
function createGeminiPrompt(query: string, fileUri?: string): string {
  console.log('Creating prompt with file URI:', fileUri);
  
  // If we have a file URI, reference it; otherwise fall back to text
  const dataReference = fileUri 
    ? `The data is provided in the uploaded CSV file. Please analyze the complete dataset from the file.`
    : `No data file available. Please provide guidance on what data would be needed.`;
  
  return `You are a data visualization expert. Analyze the user query and data to create a chart response.

User Query: "${query}"
Data Context: ${dataReference}

CRITICAL INSTRUCTIONS:
1. **Generate ONLY a single, complete JSON object**
2. **No markdown, no code blocks, no extra text**
3. **Ensure JSON is properly closed with all brackets/braces**
4. **Use Python code execution for calculations when needed**
5. **Keep data array small (max 10 items)**
6. **Data objects should contain ONLY the fields needed for x-axis and y-axis**

Required JSON format (must be complete and valid):

{
  "chartType": "line|bar|pie|scatter|area|heatmap",
  "title": "Descriptive chart title",
  "data": [
    {
      "xAxisField": value,
      "yAxisField": value
    }
  ],
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

Chart Types:
- "bar": comparisons, high/low values
- "line": trends over time
- "pie": proportions/percentages
- "scatter": correlations

Available Data Fields (all 27 fields):
- Identifiers: source, tenant_id, dataset_uuid, dataset_name, rule_code, rule_name
- Classification: rule_type, dimension, rule_description, category, last_execution_level
- Dates: business_date_latest
- Counts: dataset_record_count_latest, filtered_record_count_latest
- Pass/Fail counts: pass_count_total, fail_count_total, pass_count_1m, fail_count_1m, pass_count_3m, fail_count_3m, pass_count_12m, fail_count_12m
- Failure rates: fail_rate_total, fail_rate_1m, fail_rate_3m, fail_rate_12m
- Trends: trend_flag (up/down/equal)

IMPORTANT: 
- Data array objects should ONLY contain the fields specified in config.xAxis and config.yAxis
- Do NOT include computation details in the response
- Generate one complete JSON object. Start with "{" and end with "}". No additional text.`;
}

/**
 * Detects if the response is asking for clarification rather than providing analysis
 */
function isAskingForClarification(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const clarificationPhrases = [
    'need to know',
    'please specify',
    'which dataset',
    'clarifying question',
    'could you please',
    'need more information',
    'which specific',
    'can you specify',
    'need to ask',
    'more details',
    'which one',
    'be more specific',
    'please provide'
  ];
  
  const lowerText = text.toLowerCase();
  return clarificationPhrases.some(phrase => lowerText.includes(phrase));
}

/**
 * Creates a clarification response without fake data
 */
function createClarificationResponse(clarificationText: string): AIChartResponse {
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
 * Extracts JSON from text that might be wrapped in markdown code blocks
 */
function extractJSONFromText(text: string): string {
  // Check if the text contains markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // If no code blocks, return the text as is
  return text.trim();
}


/**
 * Makes API call to Gemini with code execution capabilities
 * Returns the raw response text
 */
async function callGeminiAPIWithCodeExecution(prompt: string, fileUri?: string, retryCount = 0): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  try {
    // Build the parts array with text and optional file
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
        tools: [{
          codeExecution: {}
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
          thinkingConfig: {
            thinkingBudget: 0  // Disable thinking for faster responses in MVP
          }
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    
    // Debug log raw response for problematic queries
    if (prompt.toLowerCase().includes('worst dataset')) {
      console.log('Debug: Raw Gemini response for "worst dataset" query:', JSON.stringify(data, null, 2));
    }
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error('Invalid Gemini response structure:', JSON.stringify(data, null, 2));
      throw new Error('No response candidates from Gemini API');
    }

    // Add safety check for content
    if (!data.candidates[0].content) {
      console.error('No content in first candidate:', JSON.stringify(data.candidates[0], null, 2));
      throw new Error('No content in Gemini API response candidate');
    }

    const responseParts = data.candidates[0].content.parts;
    
    // Validate that parts exist
    if (!responseParts) {
      throw new Error('No content parts in Gemini API response');
    }
    
    // Debug log the response structure for problematic queries
    if (prompt.toLowerCase().includes('worst dataset')) {
      console.log('Debug: Response structure for "worst dataset" query:', {
        hasContent: !!data.candidates[0].content,
        hasParts: !!responseParts,
        partsType: typeof responseParts,
        isArray: Array.isArray(responseParts),
        partsLength: Array.isArray(responseParts) ? responseParts.length : 'N/A',
        firstPart: responseParts[0] || 'undefined'
      });
    }
    
    // Process all response parts
    let responseText = '';
    
    // Ensure parts is an array (sometimes API returns a single object)
    const partsArray = Array.isArray(responseParts) ? responseParts : [responseParts];
    
    // Check if parts array is empty
    if (partsArray.length === 0) {
      throw new Error('Empty parts array in Gemini API response');
    }
    
    for (const part of partsArray) {
      // More defensive checks
      if (part && typeof part === 'object' && 'text' in part) {
        responseText += part.text;
      } else if (prompt.toLowerCase().includes('worst dataset')) {
        console.log('Debug: Invalid part structure:', { 
          part, 
          type: typeof part,
          hasText: part ? 'text' in part : 'part is null/undefined'
        });
      }
    }
    
    // Ensure we got some text
    if (!responseText) {
      console.error('No text found in any parts. Parts structure:', JSON.stringify(partsArray, null, 2));
      throw new Error('No text content found in Gemini API response parts');
    }
    
    // Return raw response text
    return responseText;
    
  } catch (error) {
    console.error(`Gemini API call failed (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < MAX_RETRIES) {
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]));
      return callGeminiAPIWithCodeExecution(prompt, fileUri, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * Makes API call to Gemini with structured output (guaranteed JSON)
 */
async function callGeminiAPIWithStructuredOutput(prompt: string, fileUri?: string, retryCount = 0): Promise<AIChartResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  // console.log('Structured output prompt:', prompt, 'Retry count:', retryCount);
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  try {
    // Build the parts array with text and optional file
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
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: {
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
          },
          thinkingConfig: {
            thinkingBudget: 0  // Disable thinking for faster responses in MVP
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

    // For structured output, response should be clean JSON
    const structuredParts = data.candidates[0].content.parts;
    
    // Validate that parts exist
    if (!structuredParts) {
      throw new Error('No content parts in Gemini API structured response');
    }
    
    // Debug log for problematic queries
    if (prompt.toLowerCase().includes('worst dataset')) {
      console.log('Debug: Structured response for "worst dataset" query:', {
        hasContent: !!data.candidates[0].content,
        hasParts: !!structuredParts,
        partsType: typeof structuredParts,
        isArray: Array.isArray(structuredParts),
        partsLength: Array.isArray(structuredParts) ? structuredParts.length : 'N/A',
        firstPart: structuredParts[0] || 'undefined'
      });
    }
    
    // Ensure parts is an array (sometimes API returns a single object)
    const structuredPartsArray = Array.isArray(structuredParts) ? structuredParts : [structuredParts];
    
    // Check if parts array is empty
    if (structuredPartsArray.length === 0) {
      throw new Error('Empty parts array in Gemini API structured response');
    }
    
    // Safely access the first part's text
    const firstPart = structuredPartsArray[0];
    if (!firstPart || typeof firstPart !== 'object') {
      throw new Error('Invalid part structure in Gemini API response');
    }
    
    // Check if text property exists before accessing it
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
      
      // Ensure filters is an array
      if (!Array.isArray(chartResponse.filters)) {
        console.warn('Filters is not an array, defaulting to empty array');
        chartResponse.filters = [];
      }
      
      return chartResponse;
    } catch (parseError) {
      console.error('Raw Gemini response (structured):', responseText);
      throw new Error(`Failed to parse structured Gemini response as JSON: ${parseError}`);
    }
    
  } catch (error) {
    console.error(`Gemini API call failed (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < MAX_RETRIES) {
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]));
      return callGeminiAPIWithStructuredOutput(prompt, fileUri, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * Two-step API call: code execution + structured output
 */
async function callGeminiAPI(prompt: string, query: string, fileUri?: string): Promise<AIChartResponse> {
  console.log('Starting two-step Gemini API call for query:', query);
  
  let rawResponseText = '';
  
  try {
    // Step 1: Get raw response with code execution
    console.log('Step 1: Using code execution for analysis');
    rawResponseText = await callGeminiAPIWithCodeExecution(prompt, fileUri);
    
    console.log('Raw Gemini code execution response:', rawResponseText);
    
    // Check if the response is asking for clarification
    if (isAskingForClarification(rawResponseText)) {
      console.log('Detected clarifying question, skipping Step 2 to preserve clarification');
      return createClarificationResponse(rawResponseText);
    }
    
    // Try to parse the response as JSON first
    try {
      // Extract JSON from potential markdown code blocks
      const cleanedResponse = extractJSONFromText(rawResponseText);
      const parsedResponse: AIChartResponse = JSON.parse(cleanedResponse);
      
      // Validate that it has the required structure
      if (parsedResponse.chartType && parsedResponse.title && parsedResponse.data && parsedResponse.config) {
        console.log('Step 1 returned valid JSON, skipping Step 2');
        return parsedResponse;
      }
    } catch (parseError) {
      console.log('Step 1 response is not valid JSON, proceeding to Step 2');
    }
    
  } catch (codeExecError: any) {
    console.log('Step 1 encountered an error:', codeExecError);
    throw codeExecError;
  }
  
  try {
    // Step 2: Only use structured output if Step 1 didn't return valid JSON
    console.log('Step 2: Using structured output to format the response');
    
    // Create a prompt for structured output that includes the code execution results
    const structuredPrompt = `Format this data analysis result into a proper chart response.

Original Query: "${query}"
Analysis Result: ${rawResponseText}

Create a complete chart response with:
1. Appropriate chart type based on the analysis
2. Clean, formatted data array (limit to 10 items max)
3. Proper axis configuration
4. Any relevant filters
5. Insights from the analysis

CRITICAL for data array:
- Each object MUST have exactly two properties: "x" (string) and "y" (number)
- Map your x-axis values to the "x" property
- Map your y-axis values to the "y" property
- Example: {"x": "Dataset A", "y": 0.25}
- Do NOT use actual field names like "dataset_name" or "fail_rate_1m" in data objects

Generate ONLY valid JSON, no markdown or extra text`;

    const structuredResponse = await callGeminiAPIWithStructuredOutput(structuredPrompt, fileUri);
    
    console.log('Two-step process successful!');
    return structuredResponse;
    
  } catch (error: any) {
    console.error('Two-step API call failed:', error);
    
    // Provide fallback responses for different error types
    if (error instanceof Error) {
      if (error.message.includes('API key not configured')) {
        throw error; // Let this bubble up as a configuration issue
      }
      
      if (error.message.includes('400 Bad Request') || error.message.includes('Invalid request')) {
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
    }
    
    // Generic fallback
    return {
      chartType: 'bar' as const,
      title: 'Query Processing Error',
      data: [],
      config: {
        xAxis: 'dataset_name',
        yAxis: ['fail_rate_1m']
      },
      filters: [],
      insights: `Unable to process the query "${query}". Please try a different question or try again later.`
    };
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
    
    // Upload CSV file to Gemini (or use cached URI)
    let fileUri: string | undefined;
    try {
      fileUri = await uploadCSVToGemini();
    } catch (uploadError) {
      console.error('Failed to upload CSV file, proceeding without file:', uploadError);
      // Continue without file - the prompt will handle this gracefully
    }
    
    // Create prompt for Gemini
    const prompt = createGeminiPrompt(sanitizedQuery, fileUri);
    
    // Call Gemini API with smart routing
    const chartResponse = await callGeminiAPI(prompt, sanitizedQuery, fileUri);
    
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
      
      // Handle specific Gemini response structure errors
      if (error.message.includes('No content parts') || 
          error.message.includes('Empty parts array') ||
          error.message.includes('No text property') ||
          error.message.includes('No text content found')) {
        return NextResponse.json(
          { error: 'Gemini API returned an invalid response structure. Please try again.' },
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