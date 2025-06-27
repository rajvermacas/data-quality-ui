import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '@/components/Dashboard';

const mockData = [
  {
    source: 'TEST_SYSTEM',
    tenant_id: 'tenant_001',
    dataset_uuid: 'ds001',
    dataset_name: 'Test Dataset',
    rule_code: '1',
    rule_name: 'TEST_RULE',
    rule_type: 'BUSINESS_RULE',
    dimension: 'Validity',
    rule_description: 'Test rule description',
    category: 'C1',
    business_date_latest: '2024-01-01',
    dataset_record_count_latest: 1000,
    filtered_record_count_latest: 900,
    pass_count_total: 80,
    fail_count_total: 20,
    pass_count_1m: 40,
    fail_count_1m: 10,
    pass_count_3m: 70,
    fail_count_3m: 15,
    pass_count_12m: 80,
    fail_count_12m: 20,
    fail_rate_total: 0.2,
    fail_rate_1m: 0.2,
    fail_rate_3m: 0.176,
    fail_rate_12m: 0.2,
    trend_flag: 'down',
    last_execution_level: 'DATASET'
  }
];

// Mock the data processor
jest.mock('@/lib/dataProcessor', () => ({
  processCSVData: jest.fn(() => mockData),
  calculateDashboardMetrics: jest.fn(() => ({
    totalDatasets: 1,
    urgentAttentionCount: 1,
    averageFailRate: 0.2,
    trendingDown: 1,
    trendingUp: 0,
    stable: 0
  })),
  getUrgentAttentionItems: jest.fn(() => [
    {
      dataset_name: 'Test Dataset',
      source: 'TEST_SYSTEM',
      dimension: 'Validity',
      fail_rate_1m: 0.2,
      fail_rate_3m: 0.176,
      fail_rate_12m: 0.2,
      trend_flag: 'down'
    }
  ]),
  getUniqueValues: jest.fn((data, field) => {
    if (field === 'source') return ['TEST_SYSTEM'];
    if (field === 'rule_type') return ['BUSINESS_RULE'];
    if (field === 'dimension') return ['Validity'];
    if (field === 'trend_flag') return ['down'];
    return [];
  }),
  filterData: jest.fn(() => mockData)
}));

// Mock fetch for CSV data
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve('mock,csv,data')
  })
) as jest.Mock;

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dashboard header', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Data Quality Dashboard')).toBeInTheDocument();
    });
  });

  it('should display loading state initially', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('Loading dashboard data...')).toBeInTheDocument();
  });

  it('should render dashboard metrics after data loads', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Datasets')).toBeInTheDocument();
    });
  });

  it('should render urgent attention widget', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Urgent Attention Required')).toBeInTheDocument();
    });
  });

  it('should handle fetch error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Error loading dashboard data')).toBeInTheDocument();
    });
  });
});