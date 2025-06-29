/**
 * Prompt creation and formatting functions for Gemini API
 */

/**
 * Creates the prompt for Gemini API with structured output requirements
 */
export function createGeminiPrompt(query: string, fileUri?: string): string {
  console.log('Creating prompt with file URI:', fileUri);
  
  // If we have a file URI, reference it; otherwise fall back to text
  const dataReference = fileUri 
    ? `The data is provided in the uploaded CSV file. Please analyze the complete dataset from the file.`
    : `No data file available. Please provide guidance on what data would be needed.`;
  
  return `You are a data visualization expert. Analyze the user query and data to create a chart response.

User Query: "${query}"
Data Context: ${dataReference}

CRITICAL INSTRUCTIONS:
1. **Generate ONLY a single, complete JSON object**
2. **No markdown, no code blocks, no extra text**
3. **Ensure JSON is properly closed with all brackets/braces**
4. **Use Python code execution for calculations when needed**
5. **Keep data array small (max 10 items)**
6. **Data objects should contain ONLY the fields needed for x-axis and y-axis**

Required JSON format (must be complete and valid):

{
  "chartType": "line|bar|pie|scatter|area|heatmap",
  "title": "Descriptive chart title",
  "data": [
    {
      "field_name_for_x_axis": value,
      "field_name_for_y_axis": value
    }
  ],
  "config": {
    "xAxis": "field_name_for_x_axis",
    "yAxis": ["field_name_for_y_axis"]
  },
  "filters": [
    {
      "field": "field_name",
      "label": "Display Label", 
      "values": ["filter_values"]
    }
  ],
  "insights": "Brief insights about the data shown"
}

Chart Types:
- "bar": comparisons, high/low values
- "line": trends over time
- "pie": proportions/percentages
- "scatter": correlations

Available Data Fields (all 27 fields):
- Identifiers: source, tenant_id, dataset_uuid, dataset_name, rule_code, rule_name
- Classification: rule_type, dimension, rule_description, category, last_execution_level
- Dates: business_date_latest
- Counts: dataset_record_count_latest, filtered_record_count_latest
- Pass/Fail counts: pass_count_total, fail_count_total, pass_count_1m, fail_count_1m, pass_count_3m, fail_count_3m, pass_count_12m, fail_count_12m
- Failure rates: fail_rate_total, fail_rate_1m, fail_rate_3m, fail_rate_12m
- Trends: trend_flag (up/down/equal)

IMPORTANT: 
- Data array objects should ONLY contain the fields specified in config.xAxis and config.yAxis
- Do NOT include computation details in the response
- Generate one complete JSON object. Start with "{" and end with "}". No additional text.`;
}

/**
 * Creates a structured prompt for formatting code execution results
 */
export function createStructuredFormattingPrompt(query: string, rawResponseText: string): string {
  return `Format this data analysis result into a proper chart response.

Original Query: "${query}"
Analysis Result: ${rawResponseText}

Create a complete chart response with:
1. Appropriate chart type based on the analysis
2. Clean, formatted data array (limit to 10 items max)
3. Proper axis configuration
4. Any relevant filters
5. Insights from the analysis

CRITICAL for data array:
- Each data object MUST use the exact field names specified in config.xAxis and config.yAxis
- The data object keys must EXACTLY match the field names in the config
- Example: If config has "xAxis": "Dataset", "yAxis": ["Failure Rate"], then data should be: {"Dataset": "Dataset A", "Failure Rate": 0.25}
- Data field names and config field names MUST be identical for proper chart rendering

Generate ONLY valid JSON, no markdown or extra text`;
}

/**
 * Creates a direct structured prompt without code execution
 */
export function createDirectStructuredPrompt(query: string): string {
  return `Analyze the data quality metrics in the uploaded CSV file to answer this query: "${query}"

Please provide a response in the following JSON format:
{
  "chartType": "bar" | "line" | "scatter" | "pie" | "table",
  "title": "Descriptive title for the visualization",
  "data": [array of data objects with x/y or appropriate fields],
  "config": {
    "xAxis": "field name for x-axis",
    "yAxis": ["array of field names for y-axis"]
  },
  "filters": [array of applied filters],
  "insights": "Key insights and analysis"
}

Focus on providing meaningful insights based on patterns in the data. For queries about "worst" or "best" datasets, analyze failure rates and trends.`;
}