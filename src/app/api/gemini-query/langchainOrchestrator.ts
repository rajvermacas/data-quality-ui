/**
 * LangChain-based orchestrator for two-step API calls
 */

import { AIChartResponse } from '@/types';
import { 
  callGeminiWithCodeExecutionLC,
  callGeminiWithStructuredOutputLC,
  callGeminiDirectStructuredLC,
  withRetry
} from './langchainService';
import { isAskingForClarification, extractJSONFromText, isEmptyPartsError } from './utils';
import { createClarificationResponse, createConfigurationErrorResponse, createErrorResponse } from './responseHandlers';
import { createStructuredFormattingPrompt } from './prompts';

/**
 * Two-step API call using LangChain: code execution + structured output
 */
export async function callGeminiAPILangChain(
  prompt: string, 
  query: string, 
  fileUri?: string
): Promise<AIChartResponse> {
  console.log('Starting two-step LangChain Gemini API call for query:', query);
  
  let rawResponseText = '';
  
  try {
    // Step 1: Get raw response with code execution (using hybrid approach)
    console.log('Step 1: Using code execution for analysis');
    rawResponseText = await withRetry(
      () => callGeminiWithCodeExecutionLC(prompt, fileUri),
      3,
      1000
    );
    
    console.log('Raw LangChain Gemini code execution response:', rawResponseText);
    
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
      if (parsedResponse.chartType && parsedResponse.title && 
          parsedResponse.data && parsedResponse.config) {
        // Validate and normalize filters before returning
        if (!Array.isArray(parsedResponse.filters)) {
          parsedResponse.filters = [];
        } else {
          parsedResponse.filters = parsedResponse.filters.map(filter => ({
            field: filter.field || '',
            label: filter.label || filter.field || 'Unknown',
            values: Array.isArray(filter.values) ? filter.values : []
          }));
        }
        console.log('Step 1 returned valid JSON, skipping Step 2');
        return parsedResponse;
      }
    } catch (parseError) {
      console.log('Step 1 response is not valid JSON, proceeding to Step 2');
    }
    
  } catch (codeExecError: any) {
    console.log('Step 1 encountered an error:', codeExecError);
    
    // Check if this is an empty parts error that we should handle with fallback
    if (isEmptyPartsError(codeExecError)) {
      console.log('Code execution failed due to empty parts response, falling back to direct structured query');
      
      try {
        // Fallback to direct structured API call without code execution
        const fallbackResponse = await withRetry(
          () => callGeminiDirectStructuredLC(query, fileUri),
          3,
          1000
        );
        console.log('Fallback LangChain Gemini API response:', fallbackResponse);
        console.log('Fallback succeeded, returning response');
        return fallbackResponse;
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        throw codeExecError; // Throw original error if fallback fails
      }
    }
    
    // For other errors, continue with the original flow
    throw codeExecError;
  }
  
  try {
    // Step 2: Only use structured output if Step 1 didn't return valid JSON
    console.log('Step 2: Using LangChain structured output to format the response');
    
    // Create a prompt for structured output that includes the code execution results
    const structuredPrompt = createStructuredFormattingPrompt(query, rawResponseText);
    const structuredResponse = await withRetry(
      () => callGeminiWithStructuredOutputLC(structuredPrompt, fileUri),
      3,
      1000
    );
    
    console.log('Two-step LangChain process successful!');
    return structuredResponse;
    
  } catch (error: any) {
    console.error('Two-step LangChain API call failed:', error);
    
    // Provide fallback responses for different error types
    if (error instanceof Error) {
      if (error.message.includes('API key not configured')) {
        throw error; // Let this bubble up as a configuration issue
      }
      
      if (error.message.includes('400 Bad Request') || 
          error.message.includes('Invalid request')) {
        return createConfigurationErrorResponse();
      }
    }
    
    // Generic fallback
    return createErrorResponse('Unable to process the query', 
      `Unable to process the query "${query}". Please try a different question or try again later.`);
  }
}