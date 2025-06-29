/**
 * Test script to validate JSON extraction from concatenated LangChain responses
 */

// Copy the function directly for testing (since we can't import TS modules in Node.js directly)
function extractJSONFromText(text) {
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
  const trimmedText = text.trim();
  
  // Check if this looks like concatenated JSON objects (starts with { and has }{)
  if (trimmedText.startsWith('{') && trimmedText.includes('}{')) {
    console.log('Detected concatenated JSON objects');
    
    // Find all JSON object boundaries
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
  return trimmedText;
}

// Example of the actual concatenated response from your debug output
const realWorldExample = 
  '{"type":"executableCode","executableCode":{"language":"PYTHON","code":"import pandas as pd\\n\\n# Load the CSV file\\ndf = pd.read_csv(\\"input_file_0.csv\\")\\n\\n# Print dataframe information to understand its structure\\nprint(df.info())\\n\\n# Print the head of the dataframe to see sample data\\nprint(df.head())\\n"}}' +
  '{"type":"codeExecutionResult","codeExecutionResult":{"outcome":"OUTCOME_OK","output":"<class \'pandas.core.frame.DataFrame\'>\\nRangeIndex: 315 entries, 0 to 314\\nData columns (total 27 columns):\\n #   Column                        Non-Null Count  Dtype  \\n---  ------                        --------------  -----  \\n 0   source                        315 non-null    object \\n 1   tenant_id                     315 non-null    object \\n..."}}' +
  '{"type":"executableCode","executableCode":{"language":"PYTHON","code":"# Sort by \'fail_rate_total\' in descending order and select top 10\\ntop_datasets = df.sort_values(by=\'fail_rate_total\', ascending=False).head(10)\\n\\n# Prepare data for the chart\\nchart_data = top_datasets[[\'dataset_name\', \'fail_rate_total\']].to_dict(orient=\'records\')\\n\\n# Get unique dataset names for filters\\nunique_dataset_names = top_datasets[\'dataset_name\'].unique().tolist()\\n\\nprint(chart_data)\\nprint(unique_dataset_names)\\n"}}' +
  '{"type":"codeExecutionResult","codeExecutionResult":{"outcome":"OUTCOME_OK","output":"[{\'dataset_name\': \'Support Tickets\', \'fail_rate_total\': 0.625}, {\'dataset_name\': \'Vendor Information\', \'fail_rate_total\': 0.5555555555555556}]"}}' +
  '{"chartType":"bar","title":"Top 10 Datasets with Highest Failure Rates","data":[{"dataset_name":"Support Tickets","fail_rate_total":0.625},{"dataset_name":"Vendor Information","fail_rate_total":0.5555555555555556}],"config":{"xAxis":"dataset_name","yAxis":["fail_rate_total"]},"filters":[{"field":"dataset_name","label":"Dataset Name","values":["Support Tickets","Vendor Information"]}],"insights":"The chart displays the top 10 datasets with the highest total failure rates."}';

console.log('Testing JSON extraction with real-world LangChain response...');
console.log('Input length:', realWorldExample.length);

try {
  const extractedJSON = extractJSONFromText(realWorldExample);
  console.log('✅ Extraction successful!');
  
  const parsed = JSON.parse(extractedJSON);
  console.log('✅ JSON parsing successful!');
  
  console.log('Chart Type:', parsed.chartType);
  console.log('Title:', parsed.title);
  console.log('Data Items:', parsed.data?.length || 0);
  console.log('Has Config:', !!parsed.config);
  console.log('Has Insights:', !!parsed.insights);
  
  // Validate it's the chart JSON we expect
  if (parsed.chartType === 'bar' && parsed.title === 'Top 10 Datasets with Highest Failure Rates') {
    console.log('🎉 SUCCESS: Extracted the correct chart JSON from concatenated response!');
    console.log('This means the "Step 1 response is not valid JSON" issue should now be resolved.');
  } else {
    console.log('❌ ERROR: Extracted JSON but it\'s not the expected chart data');
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}