'use client';

import { useState, KeyboardEvent } from 'react';
import { AIChartResponse } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { IssueCreationModal } from './IssueCreationModal';

interface AIQuerySectionProps {
  // data prop removed - CSV file is now uploaded directly on the server
}

interface QueryState {
  query: string;
  loading: boolean;
  result: AIChartResponse | null;
  error: string | null;
}

const EXAMPLE_QUERIES = [
  'Show me datasets with high failure rates',
  'What\'s the trend for dataset XYZ?',
  'Which validity rules are failing most often?',
  'Compare failure rates between tenant A and tenant B',
  'Show me trending failure rates over time'
];

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

export function AIQuerySection({}: AIQuerySectionProps) {
  const [state, setState] = useState<QueryState>({
    query: '',
    loading: false,
    result: null,
    error: null
  });
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  const handleQuerySubmit = async () => {
    if (!state.query.trim()) return;

    if (state.query.length > 500) {
      setState(prev => ({ ...prev, error: 'Query must be 500 characters or less' }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      result: null 
    }));

    try {
      const response = await fetch('/api/gemini-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: state.query
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process query');
      }

      const result: AIChartResponse = await response.json();
      
      // Enhanced logging for debugging graph rendering issues
      console.log('=== AI QUERY RESPONSE DEBUG ===');
      console.log('Full API Response:', JSON.stringify(result, null, 2));
      console.log('Chart Type:', result.chartType);
      console.log('Chart Title:', result.title);
      console.log('Chart Data Array:', result.data);
      console.log('Chart Data Length:', result.data?.length || 0);
      console.log('Chart Config:', result.config);
      console.log('Chart Filters:', result.filters);
      console.log('Chart Insights:', result.insights);
      
      // Validate chart data structure
      if (result.data && Array.isArray(result.data)) {
        console.log('Data structure validation:');
        console.log('- Is array:', Array.isArray(result.data));
        console.log('- Array length:', result.data.length);
        if (result.data.length > 0) {
          console.log('- First data item:', result.data[0]);
          console.log('- Data keys:', Object.keys(result.data[0] || {}));
        }
      } else {
        console.warn('❌ Chart data is not a valid array:', result.data);
      }
      
      // Validate config structure
      if (result.config) {
        console.log('Config validation:');
        console.log('- xAxis field:', result.config.xAxis);
        console.log('- yAxis fields:', result.config.yAxis);
        console.log('- groupBy field:', result.config.groupBy);
        
        // Check if data contains the required fields
        if (result.data && result.data.length > 0) {
          const firstItem = result.data[0];
          const hasXAxis = result.config.xAxis in firstItem;
          const hasYAxis = result.config.yAxis.every(field => field in firstItem);
          console.log('- Data contains xAxis field:', hasXAxis);
          console.log('- Data contains all yAxis fields:', hasYAxis);
          
          if (!hasXAxis) {
            console.warn('❌ xAxis field not found in data:', result.config.xAxis);
          }
          if (!hasYAxis) {
            console.warn('❌ Some yAxis fields not found in data:', result.config.yAxis);
          }
        }
      } else {
        console.warn('❌ Chart config is missing:', result.config);
      }
      console.log('=== END DEBUG ===');
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        result,
        error: null 
      }));

    } catch (error) {
      console.error('Query error:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to process your query. Please try again.',
        result: null
      }));
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleQuerySubmit();
    }
  };

  const handleExampleClick = (example: string) => {
    setState(prev => ({ ...prev, query: example, error: null }));
  };

  const renderChart = (result: AIChartResponse) => {
    const { chartType, data: chartData, config, title } = result;
    
    // Debug logging for chart rendering
    console.log('=== CHART RENDERING DEBUG ===');
    console.log('Rendering chart with type:', chartType);
    console.log('Chart data for rendering:', chartData);
    console.log('Chart config for rendering:', config);
    console.log('Chart title:', title);
    
    // Validate data before rendering
    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
      console.warn('❌ Chart data is empty or invalid for rendering');
      return (
        <div className="p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
          <p className="text-yellow-800">No data available to display in chart</p>
          <p className="text-sm text-yellow-600 mt-1">
            Data: {JSON.stringify(chartData)}
          </p>
        </div>
      );
    }
    
    console.log('✅ Chart data validation passed, proceeding with rendering');
    console.log('=== END CHART RENDERING DEBUG ===');

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={config.xAxis} 
                label={{ value: config.xAxis, position: 'insideBottom', offset: -20 }}
              />
              <YAxis 
                label={{ value: config.yAxis.join(', '), angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              {config.yAxis.map((yField, index) => (
                <Bar 
                  key={yField} 
                  dataKey={yField} 
                  fill={COLORS[index % COLORS.length]} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={450}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={config.xAxis} 
                label={{ value: config.xAxis, position: 'insideBottom', offset: -20 }}
              />
              <YAxis 
                label={{ value: config.yAxis.join(', '), angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              {config.yAxis.map((yField, index) => (
                <Line 
                  key={yField} 
                  type="monotone" 
                  dataKey={yField} 
                  stroke={COLORS[index % COLORS.length]} 
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={120}
                fill="#8884d8"
                dataKey={config.yAxis[0]}
                nameKey={config.xAxis}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <div className="p-4 bg-gray-100 rounded-lg">
            <p>Chart type &apos;{chartType}&apos; not yet implemented</p>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Query Assistant</h2>
        <p className="text-gray-600">
          Ask questions about your data quality metrics in natural language
        </p>
      </div>

      {/* Query Input */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={state.query}
            onChange={(e) => setState(prev => ({ ...prev, query: e.target.value, error: null }))}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your data quality metrics..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={state.loading}
          />
          <button
            onClick={handleQuerySubmit}
            disabled={state.loading || !state.query.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {state.loading ? 'Processing...' : 'Ask AI'}
          </button>
          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 flex items-center gap-2 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Create Issue
          </button>
        </div>
        
        {state.error && (
          <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {state.error}
          </div>
        )}
        
        <div className="mt-2 text-sm text-gray-500">
          {state.query.length}/500 characters
        </div>
      </div>

      {/* Example Queries */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Example Queries:</h3>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((example, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(example)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {state.loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Processing your query...</p>
        </div>
      )}

      {/* Results */}
      {state.result && !state.loading && (
        <div className="border-t pt-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {state.result.title}
          </h3>
          
          {/* Chart */}
          <div className="mb-2">
            {renderChart(state.result)}
          </div>

          {/* Insights */}
          {state.result.insights && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">AI Insights</h4>
              <p className="text-blue-800">{state.result.insights}</p>
            </div>
          )}

          {/* Filters */}
          {state.result.filters && state.result.filters.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">Applied Filters</h4>
              <div className="flex flex-wrap gap-2">
                {state.result.filters.map((filter, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                  >
                    {filter.label}: {filter.values ? filter.values.join(', ') : 'None'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Issue Creation Modal */}
      <IssueCreationModal 
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
      />
    </div>
  );
}