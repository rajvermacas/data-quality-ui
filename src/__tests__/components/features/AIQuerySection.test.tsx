import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIQuerySection } from '@/components/features/AIQuerySection';

// Mock fetch
global.fetch = jest.fn();

// mockData removed - AIQuerySection no longer needs data prop
// CSV file is now uploaded directly on the server
/*
const mockData: DataQualityRecord[] = [
  {
    source: 'DataLake',
    tenant_id: 'tenant1',
    dataset_uuid: 'uuid1',
    dataset_name: 'Dataset A',
    rule_code: 'RULE001',
    rule_name: 'Validity Check',
    rule_type: 'validity',
    dimension: 'Completeness',
    rule_description: 'Check for completeness',
    category: 'Data Quality',
    business_date_latest: '2024-01-01',
    dataset_record_count_latest: 1000,
    filtered_record_count_latest: 950,
    pass_count_total: 900,
    fail_count_total: 50,
    pass_count_1m: 450,
    fail_count_1m: 25,
    pass_count_3m: 850,
    fail_count_3m: 45,
    pass_count_12m: 900,
    fail_count_12m: 50,
    fail_rate_total: 0.05,
    fail_rate_1m: 0.05,
    fail_rate_3m: 0.05,
    fail_rate_12m: 0.05,
    trend_flag: 'equal',
    last_execution_level: 'SUCCESS'
  }
];
*/

describe('AIQuerySection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the AI query interface', () => {
    render(<AIQuerySection />);
    
    expect(screen.getByText('AI Query Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask a question about your data/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask ai/i })).toBeInTheDocument();
  });

  it('displays example queries', () => {
    render(<AIQuerySection />);
    
    expect(screen.getByText(/Show me datasets with high failure rates/)).toBeInTheDocument();
    expect(screen.getByText(/What's the trend for dataset XYZ?/)).toBeInTheDocument();
    expect(screen.getByText(/Which validity rules are failing most often?/)).toBeInTheDocument();
  });

  it('validates query length', async () => {
    const user = userEvent.setup();
    render(<AIQuerySection />);
    
    const input = screen.getByPlaceholderText(/Ask a question about your data/);
    const longQuery = 'a'.repeat(501);
    
    // Directly set the value instead of typing to avoid timeout
    fireEvent.change(input, { target: { value: longQuery } });
    await user.click(screen.getByRole('button', { name: /ask ai/i }));
    
    expect(screen.getByText('Query must be 500 characters or less')).toBeInTheDocument();
  });

  it('shows loading state during query processing', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed response
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({
          chartType: 'bar',
          title: 'Test Chart',
          data: [],
          config: { xAxis: 'dataset_name', yAxis: ['fail_rate_1m'] },
          filters: [],
          insights: 'Test insights'
        })
      }), 100))
    );

    render(<AIQuerySection />);
    
    const input = screen.getByPlaceholderText(/Ask a question about your data/);
    await user.type(input, 'Show me datasets');
    await user.click(screen.getByRole('button', { name: /ask ai/i }));
    
    expect(screen.getByText('Processing your query...')).toBeInTheDocument();
  });

  it('successfully processes a query and displays chart', async () => {
    const user = userEvent.setup();
    
    const mockResponse = {
      chartType: 'bar',
      title: 'Datasets with High Failure Rates',
      data: [
        { dataset_name: 'Dataset A', fail_rate_1m: 0.15 }
      ],
      config: {
        xAxis: 'dataset_name',
        yAxis: ['fail_rate_1m']
      },
      filters: [],
      insights: 'Dataset A has a high failure rate'
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<AIQuerySection />);
    
    const input = screen.getByPlaceholderText(/Ask a question about your data/);
    await user.type(input, 'Show me datasets with high failure rates');
    await user.click(screen.getByRole('button', { name: /ask ai/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Datasets with High Failure Rates')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Dataset A has a high failure rate')).toBeInTheDocument();
  });

  it('displays error message on API failure', async () => {
    const user = userEvent.setup();
    
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<AIQuerySection />);
    
    const input = screen.getByPlaceholderText(/Ask a question about your data/);
    await user.type(input, 'Show me datasets');
    await user.click(screen.getByRole('button', { name: /ask ai/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it('allows clicking example queries to populate input', async () => {
    const user = userEvent.setup();
    render(<AIQuerySection />);
    
    const exampleQuery = screen.getByText('Show me datasets with high failure rates');
    await user.click(exampleQuery);
    
    const input = screen.getByPlaceholderText(/Ask a question about your data/) as HTMLInputElement;
    expect(input.value).toBe('Show me datasets with high failure rates');
  });

  it('clears previous results when new query is submitted', async () => {
    const user = userEvent.setup();
    
    // First query
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        chartType: 'bar',
        title: 'First Chart',
        data: [],
        config: { xAxis: 'dataset_name', yAxis: ['fail_rate_1m'] },
        filters: [],
        insights: 'First insights'
      })
    });

    render(<AIQuerySection />);
    
    const input = screen.getByPlaceholderText(/Ask a question about your data/);
    await user.type(input, 'First query');
    await user.click(screen.getByRole('button', { name: /ask ai/i }));
    
    await waitFor(() => {
      expect(screen.getByText('First Chart')).toBeInTheDocument();
    });

    // Second query
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        chartType: 'line',
        title: 'Second Chart',
        data: [],
        config: { xAxis: 'date', yAxis: ['value'] },
        filters: [],
        insights: 'Second insights'
      })
    });

    await user.clear(input);
    await user.type(input, 'Second query');
    await user.click(screen.getByRole('button', { name: /ask ai/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Second Chart')).toBeInTheDocument();
    });

    expect(screen.queryByText('First Chart')).not.toBeInTheDocument();
  });

  it('handles keyboard Enter key to submit query', async () => {
    const user = userEvent.setup();
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        chartType: 'bar',
        title: 'Keyboard Test',
        data: [],
        config: { xAxis: 'dataset_name', yAxis: ['fail_rate_1m'] },
        filters: [],
        insights: 'Keyboard test'
      })
    });

    render(<AIQuerySection />);
    
    const input = screen.getByPlaceholderText(/Ask a question about your data/);
    await user.type(input, 'Test query{enter}');
    
    await waitFor(() => {
      expect(screen.getByText('Keyboard Test')).toBeInTheDocument();
    });
  });
});