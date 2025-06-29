/**
 * Utility functions for Gemini API interactions
 */

export const MAX_RETRIES = 5;
export const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff delays in ms

/**
 * Checks if the error is due to empty parts in Gemini response
 */
export function isEmptyPartsError(error: any): boolean {
  const errorMessage = error?.message || '';
  return errorMessage.includes('No content parts in Gemini API response') ||
         errorMessage.includes('Empty parts array in Gemini API response') ||
         errorMessage.includes('No text content found in Gemini API response parts');
}

/**
 * Adds jitter to retry delay to prevent synchronized retries
 */
export function getRetryDelayWithJitter(baseDelay: number): number {
  const jitterRange = 0.2; // ±20% jitter
  const minDelay = baseDelay * (1 - jitterRange);
  const maxDelay = baseDelay * (1 + jitterRange);
  return Math.floor(Math.random() * (maxDelay - minDelay) + minDelay);
}

/**
 * Detects if the response is asking for clarification rather than providing analysis
 */
export function isAskingForClarification(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const clarificationPhrases = [
    'need to know',
    'please specify',
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
  const matchedPhrase = clarificationPhrases.find(phrase => lowerText.includes(phrase));
  
  if (matchedPhrase) {
    console.log(`Clarification detected - matched phrase: "${matchedPhrase}"`);
    return true;
  }
  
  return false;
}

/**
 * Extracts JSON from text that might be wrapped in markdown code blocks
 */
export function extractJSONFromText(text: string): string {
  // Check if the text contains markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // If no code blocks, return the text as is
  return text.trim();
}