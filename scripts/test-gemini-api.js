/**
 * Test script for Gemini API integration
 * This script tests the fixed API endpoint to verify the schema issues are resolved
 */

const API_URL = 'http://localhost:3000/api/gemini-query';

async function testGeminiAPI() {
  console.log('Testing Gemini API integration...');
  
  const testQueries = [
    'Show me datasets with highest failure rates',
    'What are the top 5 failing datasets?',
    'Which systems have the most issues?'
  ];
  
  const sampleData = [
    {
      dataset_name: 'Test Dataset 1',
      source: 'TEST_SYSTEM',
      tenant_id: 'tenant_001',
      rule_type: 'BUSINESS_RULE',
      dimension: 'Validity',
      fail_rate_1m: 0.8,
      fail_rate_3m: 0.6,
      fail_rate_12m: 0.4,
      trend_flag: 'up'
    },
    {
      dataset_name: 'Test Dataset 2',
      source: 'ANOTHER_SYSTEM',
      tenant_id: 'tenant_002',
      rule_type: 'ATTRIBUTE',
      dimension: 'Completeness',
      fail_rate_1m: 0.3,
      fail_rate_3m: 0.4,
      fail_rate_12m: 0.5,
      trend_flag: 'down'
    }
  ];

  for (const query of testQueries) {
    console.log(`\n🔍 Testing query: "${query}"`);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          dataContext: sampleData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ API Error (${response.status}):`, errorData);
        continue;
      }

      const result = await response.json();
      console.log('✅ API Response received');
      console.log('📊 Chart Type:', result.chartType);
      console.log('📝 Title:', result.title);
      console.log('📈 Data points:', result.data?.length || 0);
      console.log('🔧 Config:', JSON.stringify(result.config, null, 2));
      
      if (result.insights) {
        console.log('💡 Insights:', result.insights);
      }
      if (result.computation) {
        console.log('🧮 Computation performed:', !!result.computation.code);
      }
      
    } catch (error) {
      console.error(`❌ Request failed:`, error.message);
    }
  }
  
  console.log('\n✨ Test completed!');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testGeminiAPI().catch(console.error);
}

module.exports = { testGeminiAPI };