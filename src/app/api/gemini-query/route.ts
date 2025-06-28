/**
 * API route handler for Gemini queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { AIQueryRequest, AIChartResponse, APIErrorResponse } from '@/types';
import { validateQuery, sanitizeQuery } from './validation';
import { uploadCSVToGemini } from './fileUpload';
import { createGeminiPrompt } from './prompts';
import { callGeminiAPI } from './orchestrator';

/**
 * Handles POST requests to the Gemini query API
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<AIChartResponse | APIErrorResponse>> {
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