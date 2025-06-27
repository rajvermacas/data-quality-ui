import { render, screen } from '@testing-library/react';
import { TrendChart } from '@/components/features/TrendChart';
import { DataQualityRecord } from '@/types';

// Mock the dataProcessor functions
jest.mock('@/lib/dataProcessor', () => ({
  filterData: jest.fn((data, filters) => {
    if (Object.keys(filters).length === 0) return data;
    return data.filter(item => {
      return Object.entries(filters).every(([key, values]) => {
        if (!values || values.length === 0) return true;
        return values.includes(item[key as keyof DataQualityRecord] as string);
      });
    });
  })
}));

const mockData: DataQualityRecord[] = [
  {
    source: 'SYSTEM_A',
    tenant_id: 'tenant_001',
    dataset_uuid: 'ds001',
    dataset_name: 'Dataset A',
    rule_code: '1',
    rule_name: 'TEST_RULE_A',
    rule_type: 'BUSINESS_RULE',
    dimension: 'Validity',
    rule_description: 'Test rule A description',
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
    fail_rate_1m: 0.05,
    fail_rate_3m: 0.08,
    fail_rate_12m: 0.12,
    trend_flag: 'down',
    last_execution_level: 'DATASET'
  },
  {
    source: 'SYSTEM_B',
    tenant_id: 'tenant_002',
    dataset_uuid: 'ds002',
    dataset_name: 'Dataset B',
    rule_code: '2',
    rule_name: 'TEST_RULE_B',
    rule_type: 'ATTRIBUTE',
    dimension: 'Completeness',
    rule_description: 'Test rule B description',
    category: 'C2',
    business_date_latest: '2024-01-01',
    dataset_record_count_latest: 800,
    filtered_record_count_latest: 750,
    pass_count_total: 60,
    fail_count_total: 15,
    pass_count_1m: 30,
    fail_count_1m: 8,
    pass_count_3m: 55,
    fail_count_3m: 12,
    pass_count_12m: 60,
    fail_count_12m: 15,
    fail_rate_total: 0.15,
    fail_rate_1m: 0.03,
    fail_rate_3m: 0.06,
    fail_rate_12m: 0.09,
    trend_flag: 'up',
    last_execution_level: 'DATASET'
  }
];

describe('TrendChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render chart title and subtitle', () => {
    render(<TrendChart data={mockData} filters={{}} />);
    
    expect(screen.getByText('Dataset Failure Rate Trends Over Time')).toBeInTheDocument();
    expect(screen.getByText('Progression from 12 months to current month')).toBeInTheDocument();
  });

  it('should render export button', () => {
    render(<TrendChart data={mockData} filters={{}} />);
    
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });

  it('should show dataset count in footer', () => {
    render(<TrendChart data={mockData} filters={{}} />);
    
    expect(screen.getByText(/Showing \d+ datasets/)).toBeInTheDocument();
  });

  it('should show no data message when data is empty', () => {
    render(<TrendChart data={[]} filters={{}} />);
    
    expect(screen.getByText('No data available for current filters')).toBeInTheDocument();
  });

  it('should apply filters correctly', () => {
    const filters = { source: ['SYSTEM_A'] };
    render(<TrendChart data={mockData} filters={filters} />);
    
    // Should still render the chart
    expect(screen.getByText('Dataset Failure Rate Trends Over Time')).toBeInTheDocument();
  });

  it('should handle empty filters', () => {
    render(<TrendChart data={mockData} filters={{}} />);
    
    expect(screen.getByText('Dataset Failure Rate Trends Over Time')).toBeInTheDocument();
    expect(screen.getByText(/Showing \d+ datasets/)).toBeInTheDocument();
  });
});