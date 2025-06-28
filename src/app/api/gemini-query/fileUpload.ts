/**
 * File upload functionality for Gemini API
 */

import { GoogleAIFileManager } from '@google/generative-ai/server';
import path from 'path';

// File upload cache - store uploaded file URI for reuse
let cachedFileUri: string | null = null;
let cachedFileExpiresAt: Date | null = null;

/**
 * Uploads the CSV file to Gemini and returns the file URI
 * Uses caching to avoid re-uploading the same file
 */
export async function uploadCSVToGemini(): Promise<string> {
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