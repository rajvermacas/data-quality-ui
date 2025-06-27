'use client';

import { useState, KeyboardEvent } from 'react';
import { DataQualityRecord, AIChartResponse } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface AIQuerySectionProps {
  data: DataQualityRecord[];
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

export function AIQuerySection({ data }: AIQuerySectionProps) {
  const [state, setState] = useState<QueryState>({
    query: '',
    loading: false,
    result: null,
    error: null
  });

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
      // Prepare data context with all available fields
      const dataContext = data;

      const response = await fetch('/api/gemini-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: state.query,
          dataContext
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process query');
      }

      const result: AIChartResponse = await response.json();
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

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xAxis} />
              <YAxis />
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
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xAxis} />
              <YAxis />
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
          <div className="mb-6">
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
                    {filter.label}: {filter.values.join(', ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}