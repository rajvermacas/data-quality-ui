/**
 * Tests for LangChain orchestrator
 */

import { callGeminiAPILangChain } from '@/app/api/gemini-query/langchainOrchestrator';
import * as langchainService from '@/app/api/gemini-query/langchainService';
import * as utils from '@/app/api/gemini-query/utils';
import * as responseHandlers from '@/app/api/gemini-query/responseHandlers';
import { AIChartResponse } from '@/types';

// Mock dependencies
jest.mock('@/app/api/gemini-query/langchainService');
jest.mock('@/app/api/gemini-query/utils');
jest.mock('@/app/api/gemini-query/responseHandlers');
jest.mock('@/app/api/gemini-query/prompts');

describe('LangChain Orchestrator', () => {
  const mockPrompt = 'Analyze the data and create a chart';
  const mockQuery = 'Show sales by region';
  const mockFileUri = 'file://test.csv';

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mocks
    (utils.isAskingForClarification as jest.Mock).mockReturnValue(false);
    (utils.isEmptyPartsError as jest.Mock).mockReturnValue(false);
  });

  describe('callGeminiAPILangChain', () => {
    it('should return valid JSON from Step 1 without needing Step 2', async () => {
      const validJsonResponse = JSON.stringify({
        chartType: 'bar',
        title: 'Sales by Region',
        data: [{ region: 'North', sales: 100 }],
        config: { xAxis: 'region', yAxis: ['sales'] },
        filters: []
      });

      (langchainService.withRetry as jest.Mock).mockImplementation(
        async (fn) => fn()
      );
      (langchainService.callGeminiWithCodeExecutionLC as jest.Mock)
        .mockResolvedValue(validJsonResponse);
      (utils.extractJSONFromText as jest.Mock).mockReturnValue(validJsonResponse);

      const result = await callGeminiAPILangChain(mockPrompt, mockQuery, mockFileUri);

      expect(result).toMatchObject({
        chartType: 'bar',
        title: 'Sales by Region',
        data: [{ region: 'North', sales: 100 }],
        config: { xAxis: 'region', yAxis: ['sales'] },
        filters: []
      });

      // Should not call Step 2
      expect(langchainService.callGeminiWithStructuredOutputLC).not.toHaveBeenCalled();
    });

    it('should handle clarification responses', async () => {
      const clarificationText = 'Which specific region are you interested in?';
      const mockClarificationResponse: AIChartResponse = {
        chartType: 'bar',
        title: 'Clarification Needed',
        data: [],
        config: { xAxis: '', yAxis: [] },
        filters: [],
        insights: clarificationText
      };

      (langchainService.withRetry as jest.Mock).mockImplementation(
        async (fn) => fn()
      );
      (langchainService.callGeminiWithCodeExecutionLC as jest.Mock)
        .mockResolvedValue(clarificationText);
      (utils.isAskingForClarification as jest.Mock).mockReturnValue(true);
      (responseHandlers.createClarificationResponse as jest.Mock)
        .mockReturnValue(mockClarificationResponse);

      const result = await callGeminiAPILangChain(mockPrompt, mockQuery);

      expect(utils.isAskingForClarification).toHaveBeenCalledWith(clarificationText);
      expect(responseHandlers.createClarificationResponse).toHaveBeenCalledWith(clarificationText);
      expect(result).toEqual(mockClarificationResponse);
    });

    it('should use Step 2 when Step 1 returns non-JSON', async () => {
      const nonJsonResponse = 'Here is the analysis: The data shows interesting trends...';
      const structuredResponse: AIChartResponse = {
        chartType: 'line',
        title: 'Trend Analysis',
        data: [{ x: 1, y: 10 }],
        config: { xAxis: 'x', yAxis: ['y'] },
        filters: [],
        insights: 'Structured insights'
      };

      (langchainService.withRetry as jest.Mock).mockImplementation(
        async (fn) => fn()
      );
      (langchainService.callGeminiWithCodeExecutionLC as jest.Mock)
        .mockResolvedValue(nonJsonResponse);
      (utils.extractJSONFromText as jest.Mock).mockReturnValue(nonJsonResponse);
      (langchainService.callGeminiWithStructuredOutputLC as jest.Mock)
        .mockResolvedValue(structuredResponse);

      const result = await callGeminiAPILangChain(mockPrompt, mockQuery);

      expect(langchainService.callGeminiWithStructuredOutputLC).toHaveBeenCalled();
      expect(result).toEqual(structuredResponse);
    });

    it('should fallback to direct structured call on empty parts error', async () => {
      const emptyPartsError = new Error('Empty parts array in response');
      const fallbackResponse: AIChartResponse = {
        chartType: 'pie',
        title: 'Fallback Chart',
        data: [{ label: 'A', value: 60 }],
        config: { xAxis: 'label', yAxis: ['value'] },
        filters: []
      };

      (langchainService.withRetry as jest.Mock).mockImplementation(
        async (fn) => fn()
      );
      (langchainService.callGeminiWithCodeExecutionLC as jest.Mock)
        .mockRejectedValue(emptyPartsError);
      (utils.isEmptyPartsError as jest.Mock).mockReturnValue(true);
      (langchainService.callGeminiDirectStructuredLC as jest.Mock)
        .mockResolvedValue(fallbackResponse);

      const result = await callGeminiAPILangChain(mockPrompt, mockQuery);

      expect(langchainService.callGeminiDirectStructuredLC).toHaveBeenCalledWith(mockQuery, undefined);
      expect(result).toEqual(fallbackResponse);
    });

    it('should handle API key configuration errors', async () => {
      const apiKeyError = new Error('Gemini API key not configured');

      (langchainService.withRetry as jest.Mock).mockImplementation(
        async (fn) => fn()
      );
      (langchainService.callGeminiWithCodeExecutionLC as jest.Mock)
        .mockRejectedValue(apiKeyError);

      await expect(callGeminiAPILangChain(mockPrompt, mockQuery))
        .rejects.toThrow('Gemini API key not configured');
    });

    it('should return configuration error response for bad requests', async () => {
      const badRequestError = new Error('400 Bad Request');
      const configErrorResponse: AIChartResponse = {
        chartType: 'bar',
        title: 'Configuration Error',
        data: [],
        config: { xAxis: '', yAxis: [] },
        filters: []
      };

      (langchainService.withRetry as jest.Mock).mockImplementation(
        async (fn) => fn()
      );
      (langchainService.callGeminiWithCodeExecutionLC as jest.Mock)
        .mockRejectedValue(badRequestError);
      (responseHandlers.createConfigurationErrorResponse as jest.Mock)
        .mockReturnValue(configErrorResponse);

      const result = await callGeminiAPILangChain(mockPrompt, mockQuery);

      expect(responseHandlers.createConfigurationErrorResponse).toHaveBeenCalled();
      expect(result).toEqual(configErrorResponse);
    });

    it('should normalize filters in Step 1 response', async () => {
      const responseWithBadFilters = JSON.stringify({
        chartType: 'bar',
        title: 'Test Chart',
        data: [{ x: 1, y: 10 }],
        config: { xAxis: 'x', yAxis: ['y'] },
        filters: [
          { field: 'category' }, // Missing label and values
          { field: 'status', label: 'Status', values: ['active', 'inactive'] }
        ]
      });

      (langchainService.withRetry as jest.Mock).mockImplementation(
        async (fn) => fn()
      );
      (langchainService.callGeminiWithCodeExecutionLC as jest.Mock)
        .mockResolvedValue(responseWithBadFilters);
      (utils.extractJSONFromText as jest.Mock).mockReturnValue(responseWithBadFilters);

      const result = await callGeminiAPILangChain(mockPrompt, mockQuery);

      expect(result.filters).toEqual([
        { field: 'category', label: 'category', values: [] },
        { field: 'status', label: 'Status', values: ['active', 'inactive'] }
      ]);
    });
  });
});