/**
 * Type definitions for Gemini API
 */

export interface GeminiResponsePart {
  text?: string;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<GeminiResponsePart>;
    };
  }>;
}

export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';