/**
 * Tests for file upload functionality
 */

// Mock modules before any imports
jest.mock('@google/generative-ai/server');
jest.mock('path');

describe('uploadCSVToGemini', () => {
  const mockFileUri = 'gs://test-bucket/test-file.csv';
  const mockUploadResult = {
    file: {
      uri: mockFileUri,
      displayName: 'Data Quality Summary',
      mimeType: 'text/csv',
      sizeBytes: 12345
    }
  };

  let mockUploadFile: jest.Mock;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let originalEnv: NodeJS.ProcessEnv;
  let GoogleAIFileManager: any;
  let path: any;
  let uploadCSVToGemini: any;

  beforeEach(() => {
    // Clear all module caches
    jest.clearAllMocks();
    jest.resetModules();
    
    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Save and set env
    originalEnv = process.env;
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-api-key' };
    
    // Get mocked modules
    GoogleAIFileManager = require('@google/generative-ai/server').GoogleAIFileManager;
    path = require('path');
    
    // Set up path mock
    path.join = jest.fn().mockReturnValue('/test/path/full_summary.csv');
    
    // Set up GoogleAIFileManager mock
    mockUploadFile = jest.fn().mockResolvedValue(mockUploadResult);
    GoogleAIFileManager.mockImplementation(() => ({
      uploadFile: mockUploadFile
    }));
    
    // Import the module after mocks are set up
    const module = require('@/app/api/gemini-query/fileUpload');
    uploadCSVToGemini = module.uploadCSVToGemini;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('should upload file successfully when no cache exists', async () => {
    const result = await uploadCSVToGemini();
    
    expect(result).toBe(mockFileUri);
    expect(GoogleAIFileManager).toHaveBeenCalledWith('test-api-key');
    expect(mockUploadFile).toHaveBeenCalledWith(
      '/test/path/full_summary.csv',
      {
        mimeType: 'text/csv',
        displayName: 'Data Quality Summary'
      }
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Uploading CSV file from:',
      '/test/path/full_summary.csv'
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'File uploaded successfully:',
      {
        uri: mockFileUri,
        displayName: 'Data Quality Summary',
        mimeType: 'text/csv',
        sizeBytes: 12345
      }
    );
  });

  it('should use cached file URI when not expired', async () => {
    // First call - uploads file
    const result1 = await uploadCSVToGemini();
    expect(result1).toBe(mockFileUri);
    expect(mockUploadFile).toHaveBeenCalledTimes(1);
    
    // Reset mock to ensure we can track cache behavior
    jest.clearAllMocks();
    
    // Second call - should use cache
    const result2 = await uploadCSVToGemini();
    expect(result2).toBe(mockFileUri);
    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Using cached file URI:',
      mockFileUri
    );
  });

  it('should re-upload when cache is expired', async () => {
    jest.useFakeTimers();
    
    // First call - uploads file
    await uploadCSVToGemini();
    expect(mockUploadFile).toHaveBeenCalledTimes(1);
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Advance time by 48 hours
    jest.advanceTimersByTime(48 * 60 * 60 * 1000);
    
    // Second call - should re-upload
    await uploadCSVToGemini();
    expect(mockUploadFile).toHaveBeenCalledTimes(1);
    
    jest.useRealTimers();
  });

  it('should throw error when API key is not configured', async () => {
    process.env.GEMINI_API_KEY = '';
    
    // Re-import the module with new env
    jest.resetModules();
    const module = require('@/app/api/gemini-query/fileUpload');
    
    await expect(module.uploadCSVToGemini()).rejects.toThrow(
      'Gemini API key not configured'
    );
  });

  it('should throw error when upload fails', async () => {
    mockUploadFile.mockRejectedValue(new Error('Network error'));
    
    await expect(uploadCSVToGemini()).rejects.toThrow(
      'Failed to upload data file to AI service'
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to upload CSV file:',
      expect.any(Error)
    );
  });

  it('should construct correct CSV path', async () => {
    // Mock process.cwd
    const originalCwd = process.cwd;
    process.cwd = jest.fn().mockReturnValue('/test');
    
    // Clear and re-setup path mock
    path.join = jest.fn((...args) => {
      if (args.length === 4 && args[3] === 'full_summary.csv') {
        return '/test/path/full_summary.csv';
      }
      return args.join('/');
    });
    
    await uploadCSVToGemini();
    
    expect(path.join).toHaveBeenCalledWith(
      '/test',
      'resources',
      'artifacts',
      'full_summary.csv'
    );
    
    process.cwd = originalCwd;
  });
});