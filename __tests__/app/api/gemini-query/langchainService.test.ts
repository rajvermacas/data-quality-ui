/**
 * Tests for LangChain service
 */

// Mock dependencies BEFORE imports
jest.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: jest.fn()
}));
jest.mock('@/app/api/gemini-query/responseHandlers');
jest.mock('@/app/api/gemini-query/utils');
jest.mock('@google/generative-ai', () => ({
  HarmBlockThreshold: {
    BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH'
  },
  HarmCategory: {
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
  }
}));

import { 
  callGeminiWithStructuredOutputLC,
  callGeminiDirectStructuredLC,
  withRetry,
  ChartResponseType
} from '@/app/api/gemini-query/langchainService';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { validateChartResponse } from '@/app/api/gemini-query/responseHandlers';

// Mock LangChain modules
jest.mock('@langchain/core/prompts', () => ({
  ChatPromptTemplate: {
    fromMessages: jest.fn(() => ({
      pipe: jest.fn((next) => next)
    }))
  },
  SystemMessagePromptTemplate: {
    fromTemplate: jest.fn((template) => ({ template }))
  },
  HumanMessagePromptTemplate: {
    fromTemplate: jest.fn((template) => ({ template }))
  }
}));
jest.mock('@langchain/core/output_parsers', () => ({
  StructuredOutputParser: {
    fromZodSchema: jest.fn(() => ({
      getFormatInstructions: jest.fn(() => 'format instructions'),
      parse: jest.fn((text) => JSON.parse(text))
    }))
  },
  JsonOutputParser: jest.fn(() => ({
    parse: jest.fn((text) => JSON.parse(text))
  }))
}));
jest.mock('@langchain/core/runnables', () => ({
  RunnableSequence: {
    from: jest.fn((items) => ({
      invoke: jest.fn()
    }))
  }
}));

// Mock fetch for code execution tests
global.fetch = jest.fn();

describe('LangChain Service', () => {
  const mockApiKey = 'test-api-key';
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: mockApiKey };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('callGeminiWithStructuredOutputLC', () => {
    it('should return structured chart response', async () => {
      // Mock the chain invoke response
      const mockResponse: ChartResponseType = {
        chartType: 'bar',
        title: 'Test Chart',
        data: [{ x: 'A', y: 10 }, { x: 'B', y: 20 }],
        config: {
          xAxis: 'x',
          yAxis: ['y']
        },
        filters: [{
          field: 'category',
          label: 'Category',
          values: ['A', 'B']
        }],
        insights: 'Test insights'
      };

      // Mock the chain
      const mockInvoke = jest.fn().mockResolvedValue(mockResponse);
      const mockChain = { invoke: mockInvoke };
      
      // Mock RunnableSequence.from to return our mock chain
      const RunnableSequence = require('@langchain/core/runnables').RunnableSequence;
      RunnableSequence.from = jest.fn().mockReturnValue(mockChain);

      const result = await callGeminiWithStructuredOutputLC('test prompt', 'file://test.csv');

      expect(result).toEqual(mockResponse);
      expect(mockInvoke).toHaveBeenCalledWith({});
    });

    it('should normalize empty filters', async () => {
      const mockResponse = {
        chartType: 'line',
        title: 'Test Chart',
        data: [{ x: 1, y: 10 }],
        config: { xAxis: 'x', yAxis: ['y'] },
        filters: undefined // Invalid filters
      };

      const mockInvoke = jest.fn().mockResolvedValue(mockResponse);
      const mockChain = { invoke: mockInvoke };
      
      const RunnableSequence = require('@langchain/core/runnables').RunnableSequence;
      RunnableSequence.from = jest.fn().mockReturnValue(mockChain);

      const result = await callGeminiWithStructuredOutputLC('test prompt');

      expect(result.filters).toEqual([]); // Should be normalized to empty array
    });

    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      const mockInvoke = jest.fn().mockRejectedValue(mockError);
      const mockChain = { invoke: mockInvoke };
      
      const RunnableSequence = require('@langchain/core/runnables').RunnableSequence;
      RunnableSequence.from = jest.fn().mockReturnValue(mockChain);

      await expect(callGeminiWithStructuredOutputLC('test prompt'))
        .rejects.toThrow('API Error');
    });
  });

  describe('callGeminiDirectStructuredLC - Hybrid Approach', () => {
    const validResponse = {
      chartType: 'pie',
      title: 'Distribution Chart',
      data: [{ name: 'A', value: 30 }, { name: 'B', value: 70 }],
      config: { xAxis: 'name', yAxis: ['value'] },
      filters: []
    };

    beforeEach(() => {
      // Mock validateChartResponse to return the input (valid by default)
      (validateChartResponse as jest.Mock).mockImplementation((response) => response);
      
      // Mock utils
      const utils = require('@/app/api/gemini-query/utils');
      utils.MAX_RETRIES = 3;
      utils.RETRY_DELAYS = [100, 200, 400];
      utils.getRetryDelayWithJitter = jest.fn((delay) => delay);
    });

    describe('withStructuredOutput success path', () => {
      it('should use withStructuredOutput successfully when available', async () => {
        const mockStructuredModel = {
          invoke: jest.fn().mockResolvedValue(validResponse)
        };
        
        const mockModel = {
          withStructuredOutput: jest.fn().mockReturnValue(mockStructuredModel)
        };

        (ChatGoogleGenerativeAI as jest.Mock).mockReturnValue(mockModel);

        const result = await callGeminiDirectStructuredLC('Show distribution', 'file://data.csv');

        expect(mockModel.withStructuredOutput).toHaveBeenCalledWith(
          expect.any(Object), // ChartResponseSchema
          { name: "chart_response" }
        );
        expect(mockStructuredModel.invoke).toHaveBeenCalled();
        expect(validateChartResponse).toHaveBeenCalledWith(validResponse);
        expect(result).toEqual(validResponse);
      });

      it('should handle withStructuredOutput with retry logic', async () => {
        const mockStructuredModel = {
          invoke: jest.fn()
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce(validResponse)
        };
        
        const mockModel = {
          withStructuredOutput: jest.fn().mockReturnValue(mockStructuredModel)
        };

        (ChatGoogleGenerativeAI as jest.Mock).mockReturnValue(mockModel);

        const result = await callGeminiDirectStructuredLC('Show distribution');

        expect(mockStructuredModel.invoke).toHaveBeenCalledTimes(2);
        expect(result).toEqual(validResponse);
      });
    });

    describe('fallback to JsonOutputParser', () => {
      it('should fallback to JsonOutputParser when withStructuredOutput fails with known LangChain issue', async () => {
        const langchainError = new Error('No parseable tool calls provided to GoogleGenerativeAIToolsOutputParser');
        
        const mockStructuredModel = {
          invoke: jest.fn().mockRejectedValue(langchainError)
        };
        
        const mockModel = {
          withStructuredOutput: jest.fn().mockReturnValue(mockStructuredModel)
        };

        // Mock JsonOutputParser fallback
        const mockChain = {
          invoke: jest.fn().mockResolvedValue(validResponse)
        };
        
        const RunnableSequence = require('@langchain/core/runnables').RunnableSequence;
        RunnableSequence.from = jest.fn().mockReturnValue(mockChain);

        (ChatGoogleGenerativeAI as jest.Mock).mockReturnValue(mockModel);

        const result = await callGeminiDirectStructuredLC('test query');

        expect(mockModel.withStructuredOutput).toHaveBeenCalled();
        expect(RunnableSequence.from).toHaveBeenCalled();
        expect(mockChain.invoke).toHaveBeenCalled();
        expect(result).toEqual(validResponse);
      });

      it('should detect specific LangChain.js Google Gemini errors', async () => {
        const testCases = [
          'No parseable tool calls provided to GoogleGenerativeAIToolsOutputParser',
          'withStructuredOutput is not a function',
          'GoogleGenerativeAIToolsOutputParser failed'
        ];

        for (const errorMessage of testCases) {
          const langchainError = new Error(errorMessage);
          
          const mockStructuredModel = {
            invoke: jest.fn().mockRejectedValue(langchainError)
          };
          
          const mockModel = {
            withStructuredOutput: jest.fn().mockReturnValue(mockStructuredModel)
          };

          const mockChain = {
            invoke: jest.fn().mockResolvedValue(validResponse)
          };
          
          const RunnableSequence = require('@langchain/core/runnables').RunnableSequence;
          RunnableSequence.from = jest.fn().mockReturnValue(mockChain);

          (ChatGoogleGenerativeAI as jest.Mock).mockReturnValue(mockModel);

          const result = await callGeminiDirectStructuredLC('test query');
          expect(result).toEqual(validResponse);
        }
      });

      it('should handle fallback with retry logic', async () => {
        const langchainError = new Error('No parseable tool calls provided to GoogleGenerativeAIToolsOutputParser');
        
        const mockStructuredModel = {
          invoke: jest.fn().mockRejectedValue(langchainError)
        };
        
        const mockModel = {
          withStructuredOutput: jest.fn().mockReturnValue(mockStructuredModel)
        };

        const mockChain = {
          invoke: jest.fn()
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce(validResponse)
        };
        
        const RunnableSequence = require('@langchain/core/runnables').RunnableSequence;
        RunnableSequence.from = jest.fn().mockReturnValue(mockChain);

        (ChatGoogleGenerativeAI as jest.Mock).mockReturnValue(mockModel);

        const result = await callGeminiDirectStructuredLC('test query');

        expect(mockChain.invoke).toHaveBeenCalledTimes(2);
        expect(result).toEqual(validResponse);
      });
    });

    describe('error handling', () => {
      it('should immediately throw API key configuration errors', async () => {
        const configError = new Error('API key not configured');
        
        const mockStructuredModel = {
          invoke: jest.fn().mockRejectedValue(configError)
        };
        
        const mockModel = {
          withStructuredOutput: jest.fn().mockReturnValue(mockStructuredModel)
        };

        (ChatGoogleGenerativeAI as jest.Mock).mockReturnValue(mockModel);

        await expect(callGeminiDirectStructuredLC('test query'))
          .rejects.toThrow('API key not configured');
      });

      it('should provide specific error messages for different failure types', async () => {
        const langchainError = new Error('No parseable tool calls');
        const fallbackError = new Error('rate limit exceeded');
        
        const mockStructuredModel = {
          invoke: jest.fn().mockRejectedValue(langchainError)
        };
        
        const mockModel = {
          withStructuredOutput: jest.fn().mockReturnValue(mockStructuredModel)
        };

        const mockChain = {
          invoke: jest.fn().mockRejectedValue(fallbackError)
        };
        
        const RunnableSequence = require('@langchain/core/runnables').RunnableSequence;
        RunnableSequence.from = jest.fn().mockReturnValue(mockChain);

        (ChatGoogleGenerativeAI as jest.Mock).mockReturnValue(mockModel);

        await expect(callGeminiDirectStructuredLC('test query'))
          .rejects.toThrow('API rate limit exceeded. Please try again later.');
      });

      it('should handle validation errors from both structured output and fallback', async () => {
        const invalidResponse = { title: 'incomplete' };
        
        const mockStructuredModel = {
          invoke: jest.fn().mockResolvedValue(invalidResponse)
        };
        
        const mockModel = {
          withStructuredOutput: jest.fn().mockReturnValue(mockStructuredModel)
        };

        // Mock fallback chain to also fail validation
        const mockChain = {
          invoke: jest.fn().mockResolvedValue(invalidResponse)
        };
        
        const RunnableSequence = require('@langchain/core/runnables').RunnableSequence;
        RunnableSequence.from = jest.fn().mockReturnValue(mockChain);

        (ChatGoogleGenerativeAI as jest.Mock).mockReturnValue(mockModel);
        (validateChartResponse as jest.Mock).mockImplementation(() => {
          throw new Error('Invalid response structure');
        });

        await expect(callGeminiDirectStructuredLC('test query'))
          .rejects.toThrow('Invalid response structure');
      });
    });
  });

  describe('withRetry - Enhanced Retry Logic', () => {
    beforeEach(() => {
      // Mock utils with actual retry constants
      const utils = require('@/app/api/gemini-query/utils');
      utils.MAX_RETRIES = 3;
      utils.RETRY_DELAYS = [100, 200, 400];
      utils.getRetryDelayWithJitter = jest.fn((delay) => delay / 10); // Speed up tests
    });

    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValueOnce('Success!');

      const result = await withRetry(mockFn);

      expect(result).toBe('Success!');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry with exponential backoff and succeed', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce('Success on third try!');

      const result = await withRetry(mockFn);

      expect(result).toBe('Success on third try!');
      expect(mockFn).toHaveBeenCalledTimes(3);
      
      // Verify jitter function was called with proper delays
      const utils = require('@/app/api/gemini-query/utils');
      expect(utils.getRetryDelayWithJitter).toHaveBeenCalledWith(100); // First retry
      expect(utils.getRetryDelayWithJitter).toHaveBeenCalledWith(200); // Second retry
    });

    it('should throw error after MAX_RETRIES attempts', async () => {
      const utils = require('@/app/api/gemini-query/utils');
      utils.MAX_RETRIES = 2; // This means 2 retries after initial attempt = 3 total calls
      
      const mockFn = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(withRetry(mockFn)).rejects.toThrow('Always fails');
      
      expect(mockFn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('should use proper retry delays from RETRY_DELAYS array', async () => {
      const utils = require('@/app/api/gemini-query/utils');
      utils.MAX_RETRIES = 3;
      utils.RETRY_DELAYS = [500, 1000, 2000];
      utils.getRetryDelayWithJitter = jest.fn((delay) => delay);
      
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockRejectedValueOnce(new Error('Fail 3'))
        .mockResolvedValueOnce('Success');

      const result = await withRetry(mockFn);

      expect(result).toBe('Success');
      expect(utils.getRetryDelayWithJitter).toHaveBeenCalledWith(500);
      expect(utils.getRetryDelayWithJitter).toHaveBeenCalledWith(1000);
      expect(utils.getRetryDelayWithJitter).toHaveBeenCalledWith(2000);
    });

    it('should handle retryCount parameter correctly', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('Success');

      // Start with retryCount = 1 (second attempt)
      const result = await withRetry(mockFn, 1);

      expect(result).toBe('Success');
      expect(mockFn).toHaveBeenCalledTimes(2); // Original call + 1 retry
    });
  });

  describe('Environment Configuration', () => {
    it('should throw error when API key is not configured', async () => {
      delete process.env.GEMINI_API_KEY;

      await expect(callGeminiWithStructuredOutputLC('test'))
        .rejects.toThrow('Gemini API key not configured');
    });
  });
});