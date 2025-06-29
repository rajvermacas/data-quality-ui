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
 * Extracts JSON from text that might be wrapped in markdown code blocks or concatenated JSON objects
 */
export function extractJSONFromText(text: string): string {
  console.log('=== JSON EXTRACTION DEBUG ===');
  console.log('Input text length:', text.length);
  console.log('Input text preview:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
  
  // Check if the text contains markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  
  if (codeBlockMatch) {
    console.log('Found markdown code block');
    return codeBlockMatch[1].trim();
  }
  
  // Handle concatenated JSON objects from LangChain code execution
  // Look for the pattern where multiple JSON objects are concatenated
  const trimmedText = text.trim();
  
  // Check if this looks like concatenated JSON objects (starts with { and has }{)
  if (trimmedText.startsWith('{') && trimmedText.includes('}{')) {
    console.log('Detected concatenated JSON objects');
    
    // Find all JSON object boundaries by looking for }{ pattern
    const jsonObjects = [];
    let currentStart = 0;
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < trimmedText.length; i++) {
      const char = trimmedText[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          
          // When we reach a complete JSON object (braceCount = 0)
          if (braceCount === 0) {
            const jsonCandidate = trimmedText.substring(currentStart, i + 1);
            jsonObjects.push(jsonCandidate);
            currentStart = i + 1;
          }
        }
      }
    }
    
    console.log(`Found ${jsonObjects.length} JSON objects`);
    
    // Try to find the JSON object that contains chart data
    const chartJsonPattern = /"chartType"\s*:\s*"[^"]+"/;
    for (let i = jsonObjects.length - 1; i >= 0; i--) {
      const jsonObj = jsonObjects[i].trim();
      if (jsonObj && chartJsonPattern.test(jsonObj)) {
        console.log(`Using JSON object ${i + 1} as chart response`);
        console.log('Extracted JSON preview:', jsonObj.substring(0, 200) + (jsonObj.length > 200 ? '...' : ''));
        return jsonObj;
      }
    }
    
    console.log('No chart JSON found in objects, using last object');
    if (jsonObjects.length > 0) {
      const lastObject = jsonObjects[jsonObjects.length - 1].trim();
      console.log('Last object preview:', lastObject.substring(0, 200) + (lastObject.length > 200 ? '...' : ''));
      return lastObject;
    }
  }
  
  console.log('No special patterns found, returning original text');
  // If no special patterns found, return the text as is
  return trimmedText;
}