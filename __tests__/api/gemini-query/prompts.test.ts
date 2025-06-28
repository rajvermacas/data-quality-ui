/**
 * Tests for prompt creation functions
 */

import { 
  createGeminiPrompt,
  createStructuredFormattingPrompt,
  createDirectStructuredPrompt
} from '@/app/api/gemini-query/prompts';

describe('createGeminiPrompt', () => {
  it('should create prompt with file URI', () => {
    const query = 'Show me the worst performing datasets';
    const fileUri = 'gs://bucket/file.csv';
    const prompt = createGeminiPrompt(query, fileUri);
    
    expect(prompt).toContain('User Query: "Show me the worst performing datasets"');
    expect(prompt).toContain('The data is provided in the uploaded CSV file');
    expect(prompt).toContain('Please analyze the complete dataset from the file');
    expect(prompt).not.toContain('No data file available');
  });

  it('should create prompt without file URI', () => {
    const query = 'Show me the worst performing datasets';
    const prompt = createGeminiPrompt(query);
    
    expect(prompt).toContain('User Query: "Show me the worst performing datasets"');
    expect(prompt).toContain('No data file available');
    expect(prompt).toContain('Please provide guidance on what data would be needed');
    expect(prompt).not.toContain('uploaded CSV file');
  });

  it('should include all critical instructions', () => {
    const prompt = createGeminiPrompt('test query');
    
    expect(prompt).toContain('Generate ONLY a single, complete JSON object');
    expect(prompt).toContain('No markdown, no code blocks, no extra text');
    expect(prompt).toContain('Ensure JSON is properly closed with all brackets/braces');
    expect(prompt).toContain('Use Python code execution for calculations when needed');
    expect(prompt).toContain('Keep data array small (max 10 items)');
  });

  it('should include required JSON format', () => {
    const prompt = createGeminiPrompt('test query');
    
    expect(prompt).toContain('"chartType": "line|bar|pie|scatter|area|heatmap"');
    expect(prompt).toContain('"title": "Descriptive chart title"');
    expect(prompt).toContain('"xAxis": "field_name_for_x_axis"');
    expect(prompt).toContain('"yAxis": ["field_name_for_y_axis"]');
  });

  it('should include all available data fields', () => {
    const prompt = createGeminiPrompt('test query');
    
    expect(prompt).toContain('Available Data Fields (all 27 fields)');
    expect(prompt).toContain('source, tenant_id, dataset_uuid');
    expect(prompt).toContain('fail_rate_total, fail_rate_1m, fail_rate_3m, fail_rate_12m');
    expect(prompt).toContain('trend_flag (up/down/equal)');
  });

  it('should escape query properly', () => {
    const query = 'Show datasets with "high" failure rates';
    const prompt = createGeminiPrompt(query);
    
    expect(prompt).toContain('User Query: "Show datasets with "high" failure rates"');
  });
});

describe('createStructuredFormattingPrompt', () => {
  it('should create formatting prompt with analysis result', () => {
    const query = 'Show worst datasets';
    const rawResponse = 'Dataset A has 45% failure rate, Dataset B has 38% failure rate';
    const prompt = createStructuredFormattingPrompt(query, rawResponse);
    
    expect(prompt).toContain('Original Query: "Show worst datasets"');
    expect(prompt).toContain('Analysis Result: Dataset A has 45% failure rate');
    expect(prompt).toContain('Create a complete chart response with:');
  });

  it('should include data formatting instructions', () => {
    const prompt = createStructuredFormattingPrompt('test', 'result');
    
    expect(prompt).toContain('Each object MUST have exactly two properties: "x" (string) and "y" (number)');
    expect(prompt).toContain('Map your x-axis values to the "x" property');
    expect(prompt).toContain('Map your y-axis values to the "y" property');
    expect(prompt).toContain('Example: {"x": "Dataset A", "y": 0.25}');
  });

  it('should specify JSON-only output', () => {
    const prompt = createStructuredFormattingPrompt('test', 'result');
    
    expect(prompt).toContain('Generate ONLY valid JSON, no markdown or extra text');
  });

  it('should include all formatting requirements', () => {
    const prompt = createStructuredFormattingPrompt('test', 'result');
    
    expect(prompt).toContain('Appropriate chart type based on the analysis');
    expect(prompt).toContain('Clean, formatted data array (limit to 10 items max)');
    expect(prompt).toContain('Proper axis configuration');
    expect(prompt).toContain('Any relevant filters');
    expect(prompt).toContain('Insights from the analysis');
  });
});

describe('createDirectStructuredPrompt', () => {
  it('should create direct structured prompt', () => {
    const query = 'Show top 5 failing datasets';
    const prompt = createDirectStructuredPrompt(query);
    
    expect(prompt).toContain('Analyze the data quality metrics in the uploaded CSV file');
    expect(prompt).toContain('to answer this query: "Show top 5 failing datasets"');
  });

  it('should include JSON format specification', () => {
    const prompt = createDirectStructuredPrompt('test');
    
    expect(prompt).toContain('"chartType": "bar" | "line" | "scatter" | "pie" | "table"');
    expect(prompt).toContain('"title": "Descriptive title for the visualization"');
    expect(prompt).toContain('"xAxis": "field name for x-axis"');
    expect(prompt).toContain('"yAxis": ["array of field names for y-axis"]');
  });

  it('should include analysis focus', () => {
    const prompt = createDirectStructuredPrompt('test');
    
    expect(prompt).toContain('Focus on providing meaningful insights based on patterns in the data');
    expect(prompt).toContain('For queries about "worst" or "best" datasets, analyze failure rates and trends');
  });

  it('should escape query quotes properly', () => {
    const query = 'Find datasets with "critical" status';
    const prompt = createDirectStructuredPrompt(query);
    
    expect(prompt).toContain('"Find datasets with "critical" status"');
  });
});