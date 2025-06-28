/**
 * API call functions for Gemini integration
 */

import { AIChartResponse } from '@/types';
import { GEMINI_API_URL, GeminiResponse } from './types';
import { MAX_RETRIES, RETRY_DELAYS, getRetryDelayWithJitter, extractJSONFromText } from './utils';
import { validateChartResponse } from './responseHandlers';

/**
 * Builds request parts for Gemini API
 */
function buildRequestParts(prompt: string, fileUri?: string): any[] {
  const parts: any[] = [{ text: prompt }];
  
  if (fileUri) {
    parts.push({
      fileData: {
        mimeType: 'text/csv',
        fileUri: fileUri
      }
    });
  }
  
  return parts;
}

/**
 * Processes Gemini response parts to extract text
 */
function extractTextFromResponse(data: GeminiResponse): string {
  if (!data.candidates || data.candidates.length === 0) {
    console.error('Invalid Gemini response structure:', JSON.stringify(data, null, 2));
    throw new Error('No response candidates from Gemini API');
  }

  if (!data.candidates[0].content) {
    console.error('No content in first candidate:', JSON.stringify(data.candidates[0], null, 2));
    throw new Error('No content in Gemini API response candidate');
  }

  const responseParts = data.candidates[0].content.parts;
  
  if (!responseParts) {
    throw new Error('No content parts in Gemini API response');
  }
  
  let responseText = '';
  const partsArray = Array.isArray(responseParts) ? responseParts : [responseParts];
  
  if (partsArray.length === 0) {
    throw new Error('Empty parts array in Gemini API response');
  }
  
  for (const part of partsArray) {
    if (part && typeof part === 'object' && 'text' in part) {
      responseText += part.text;
    }
  }
  
  if (!responseText) {
    console.error('No text found in any parts. Parts structure:', JSON.stringify(partsArray, null, 2));
    throw new Error('No text content found in Gemini API response parts');
  }
  
  return responseText;
}

/**
 * Makes API call to Gemini with code execution capabilities
 * Returns the raw response text
 */
export async function callGeminiAPIWithCodeExecution(
  prompt: string, 
  fileUri?: string, 
  retryCount = 0
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const parts = buildRequestParts(prompt, fileUri);
    
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
          temperature: 0.5,
          topK: 1,
          topP: 1,
          maxOutputTokens: 4096,
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
    return extractTextFromResponse(data);
    
  } catch (error) {
    console.error(`Gemini API call failed (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < MAX_RETRIES) {
      const delay = getRetryDelayWithJitter(RETRY_DELAYS[retryCount]);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGeminiAPIWithCodeExecution(prompt, fileUri, retryCount + 1);
    }
    
    throw error;
  }
}