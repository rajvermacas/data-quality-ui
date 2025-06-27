import { NextRequest, NextResponse } from 'next/server';
import { AIQueryRequest, AIChartResponse, APIErrorResponse, DataQualityRecord } from '@/types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff delays in ms

interface GeminiResponsePart {
  text?: string;
  executableCode?: {
    language: string;
    code: string;
  };
  codeExecutionResult?: {
    outcome: string;
    output: string;
  };
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
 * Creates the prompt for Gemini API with structured output requirements
 */
function createGeminiPrompt(query: string, dataContext?: any[]): string {
  console.log('Data context received:', dataContext ? `${dataContext.length} records` : 'No data');
  if (dataContext && Array.isArray(dataContext) && dataContext.length > 0) {
    console.log('First row of dataContext (ALL FIELDS):', dataContext[0]);
  }
  
  // Use all available data context without truncation
  const fullContext = dataContext || [];
  const contextData = JSON.stringify(fullContext);
  
  return `You are a data visualization expert. Analyze the user query and data to create a chart response.

User Query: "${query}"
Data Context (${fullContext.length} complete records with all fields): ${contextData}

CRITICAL INSTRUCTIONS:
1. **Generate ONLY a single, complete JSON object**
2. **No markdown, no code blocks, no extra text**
3. **Ensure JSON is properly closed with all brackets/braces**
4. **Use Python code execution ONLY for calculations when needed**
5. **Keep data array small (max 10 items)**

Required JSON format (must be complete and valid):

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
  "insights": "Brief insights about the data shown",
  "computation": {
    "code": "python code if executed",
    "result": "computation result if performed"
  }
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

IMPORTANT: Generate one complete JSON object. Start with "{" and end with "}". No additional text.`;
}

/**
 * Makes API call to Gemini with code execution capabilities
 * Returns the raw response text and computation details
 */
async function callGeminiAPIWithCodeExecution(prompt: string, retryCount = 0): Promise<{ rawResponseText: string; computationCode: string; computationResult: string }> {
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
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response candidates from Gemini API');
    }

    const parts = data.candidates[0].content.parts;
    
    // Process all response parts
    let responseText = '';
    let computationCode = '';
    let computationResult = '';
    
    // Ensure parts is an array (sometimes API returns a single object)
    const partsArray = Array.isArray(parts) ? parts : [parts];
    
    for (const part of partsArray) {
      if (part.text) {
        responseText += part.text;
      }
      if (part.executableCode) {
        computationCode = part.executableCode.code;
        console.log('Generated code:', computationCode);
      }
      if (part.codeExecutionResult) {
        computationResult = part.codeExecutionResult.output;
        console.log('Code execution result:', computationResult);
      }
    }
    
    // Return raw response without parsing
    return {
      rawResponseText: responseText,
      computationCode,
      computationResult
    };
    
  } catch (error) {
    console.error(`Gemini API call failed (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < MAX_RETRIES) {
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]));
      return callGeminiAPIWithCodeExecution(prompt, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * Makes API call to Gemini with structured output (guaranteed JSON)
 */
async function callGeminiAPIWithStructuredOutput(prompt: string, retryCount = 0): Promise<AIChartResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Structured output prompt:', prompt, 'Retry count:', retryCount);
  
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
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              chartType: {
                type: "string",
                enum: ["line", "bar", "pie", "scatter", "area", "heatmap"]
              },
              title: {
                type: "string"
              },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    source: { type: "string" },
                    tenant_id: { type: "string" },
                    dataset_uuid: { type: "string" },
                    dataset_name: { type: "string" },
                    rule_code: { type: "string" },
                    rule_name: { type: "string" },
                    rule_type: { type: "string" },
                    dimension: { type: "string" },
                    rule_description: { type: "string" },
                    category: { type: "string" },
                    business_date_latest: { type: "string" },
                    dataset_record_count_latest: { type: "number" },
                    filtered_record_count_latest: { type: "number" },
                    pass_count_total: { type: "number" },
                    fail_count_total: { type: "number" },
                    pass_count_1m: { type: "number" },
                    fail_count_1m: { type: "number" },
                    pass_count_3m: { type: "number" },
                    fail_count_3m: { type: "number" },
                    pass_count_12m: { type: "number" },
                    fail_count_12m: { type: "number" },
                    fail_rate_total: { type: "number" },
                    fail_rate_1m: { type: "number" },
                    fail_rate_3m: { type: "number" },
                    fail_rate_12m: { type: "number" },
                    trend_flag: { type: "string", enum: ["up", "down", "equal"] },
                    last_execution_level: { type: "string" }
                  }
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
      throw new Error('No response candidates from Gemini API');
    }

    // For structured output, response should be clean JSON
    const parts = data.candidates[0].content.parts;
    
    // Ensure parts is an array (sometimes API returns a single object)
    const partsArray = Array.isArray(parts) ? parts : [parts];
    const responseText = partsArray[0]?.text;

    console.log('Gemini structured output responseText:', responseText);
    
    if (!responseText) {
      throw new Error('No text response from Gemini API');
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
      return callGeminiAPIWithStructuredOutput(prompt, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * Two-step API call: code execution + structured output
 */
async function callGeminiAPI(prompt: string, query: string): Promise<AIChartResponse> {
  console.log('Starting two-step Gemini API call for query:', query);
  console.log('Prompt sent to Gemini:', prompt);
  console.log('Original user query:', query);
  
  let rawResponseText = '';
  let computationCode = '';
  let computationResult = '';
  
  try {
    // Step 1: Get raw response with code execution
    console.log('Step 1: Using code execution for analysis');
    const codeExecResponse = await callGeminiAPIWithCodeExecution(prompt);
    
    // Extract the data from the response
    rawResponseText = codeExecResponse.rawResponseText;
    computationCode = codeExecResponse.computationCode;
    computationResult = codeExecResponse.computationResult;

    console.log('Raw Gemini code execution response:', {
      rawResponseText,
      computationCode,
      computationResult
    });
    
  } catch (codeExecError: any) {
    console.log('Step 1 encountered an error:', codeExecError);
    throw codeExecError;
  }
  
  try {
    // Step 2: Always pass the output to structured output for cleaning/formatting
    console.log('Step 2: Using structured output to format the response');
    
    // Create a prompt for structured output that includes the code execution results
    const structuredPrompt = `Format this data analysis result into a proper chart response.

Original Query: "${query}"
Code Execution Output: ${rawResponseText}
${computationCode ? `\nComputation Code: ${computationCode}` : ''}
${computationResult ? `\nComputation Result: ${computationResult}` : ''}

Create a complete chart response with:
1. Appropriate chart type based on the analysis
2. Clean, formatted data array (limit to 10 items max)
3. Proper axis configuration
4. Any relevant filters
5. Insights from the analysis

The response should analyze datasets with high failure rates as requested.

IMPORTANT: Generate ONLY valid JSON, no markdown or extra text.`;

    const structuredResponse = await callGeminiAPIWithStructuredOutput(structuredPrompt);
    
    // Add computation details if they exist
    if (computationCode || computationResult) {
      structuredResponse.computation = {
        code: computationCode,
        result: computationResult
      };
    }
    
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
          data: [] as DataQualityRecord[],
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
      data: [] as DataQualityRecord[],
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
    
    // Create prompt for Gemini
    const prompt = createGeminiPrompt(sanitizedQuery, body.dataContext);
    
    // Call Gemini API with smart routing
    const chartResponse = await callGeminiAPI(prompt, sanitizedQuery);
    
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