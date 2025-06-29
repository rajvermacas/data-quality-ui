/**
 * Tests for LangChain service
 */

import { 
  callGeminiWithStructuredOutputLC,
  callGeminiDirectStructuredLC,
  withRetry,
  ChartResponseType
} from '@/app/api/gemini-query/langchainService';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

// Mock LangChain modules
jest.mock('@langchain/google-genai');
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
      expect(mockInvoke).toHaveBeenCalledWith({ input: 'test prompt' });
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

  describe('callGeminiDirectStructuredLC', () => {
    it('should return structured response without code execution', async () => {
      const mockResponse = {
        chartType: 'pie',
        title: 'Distribution Chart',
        data: [{ name: 'A', value: 30 }, { name: 'B', value: 70 }],
        config: { xAxis: 'name', yAxis: ['value'] },
        filters: []
      };

      const mockInvoke = jest.fn().mockResolvedValue(mockResponse);
      const mockParser = {
        parse: jest.fn().mockReturnValue(mockResponse)
      };
      const mockChain = { 
        invoke: mockInvoke,
        pipe: jest.fn().mockReturnThis()
      };
      const mockModel = { 
        pipe: jest.fn().mockReturnValue({ 
          invoke: mockInvoke 
        })
      };

      (ChatGoogleGenerativeAI as jest.Mock).mockReturnValue(mockModel);

      const ChatPromptTemplate = require('@langchain/core/prompts').ChatPromptTemplate;
      const JsonOutputParser = require('@langchain/core/output_parsers').JsonOutputParser;
      
      ChatPromptTemplate.fromMessages.mockReturnValue({ 
        pipe: jest.fn().mockReturnValue({
          pipe: jest.fn().mockReturnValue(mockChain)
        })
      });
      JsonOutputParser.mockReturnValue(mockParser);

      const result = await callGeminiDirectStructuredLC('Show distribution', 'file://data.csv');

      expect(result).toEqual(mockResponse);
      expect(mockInvoke).toHaveBeenCalledWith({ input: 'Show distribution' });
    });

    it('should throw error for invalid response structure', async () => {
      const invalidResponse = {
        // Missing required fields
        title: 'Test Chart'
      };

      const mockInvoke = jest.fn().mockResolvedValue(invalidResponse);
      const mockParser = {
        parse: jest.fn().mockReturnValue(invalidResponse)
      };
      const mockChain = { 
        invoke: mockInvoke
      };
      const mockModel = { 
        pipe: jest.fn().mockReturnValue({ 
          invoke: mockInvoke 
        })
      };

      (ChatGoogleGenerativeAI as jest.Mock).mockReturnValue(mockModel);

      const ChatPromptTemplate = require('@langchain/core/prompts').ChatPromptTemplate;
      const JsonOutputParser = require('@langchain/core/output_parsers').JsonOutputParser;
      
      ChatPromptTemplate.fromMessages.mockReturnValue({ 
        pipe: jest.fn().mockReturnValue({
          pipe: jest.fn().mockReturnValue(mockChain)
        })
      });
      JsonOutputParser.mockReturnValue(mockParser);

      await expect(callGeminiDirectStructuredLC('test query'))
        .rejects.toThrow('Invalid response structure from LangChain');
    });
  });

  describe('withRetry', () => {
    it('should retry on failure and succeed', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce('Success!');

      const result = await withRetry(mockFn, 3, 10);

      expect(result).toBe('Success!');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const mockFn = jest.fn()
        .mockRejectedValue(new Error('Always fails'));

      await expect(withRetry(mockFn, 3, 10))
        .rejects.toThrow('Always fails');
      
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should return immediately on success', async () => {
      const mockFn = jest.fn().mockResolvedValueOnce('Immediate success');

      const result = await withRetry(mockFn, 3, 10);

      expect(result).toBe('Immediate success');
      expect(mockFn).toHaveBeenCalledTimes(1);
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