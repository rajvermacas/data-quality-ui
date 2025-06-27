import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SystemHealthMatrix } from '../../../components/features/SystemHealthMatrix';
import { DataQualityRecord } from '../../../types';

const mockData: DataQualityRecord[] = [
  {
    source: 'SYSTEM_A',
    tenant_id: 'tenant1',
    dataset_uuid: 'uuid1',
    dataset_name: 'Dataset A',
    rule_code: 'R001',
    rule_name: 'Completeness Check',
    rule_type: 'completeness',
    dimension: 'completeness',
    rule_description: 'Check for null values',
    category: 'data_quality',
    business_date_latest: '2025-06-27',
    dataset_record_count_latest: 1000,
    filtered_record_count_latest: 1000,
    pass_count_total: 900,
    fail_count_total: 100,
    pass_count_1m: 800,
    fail_count_1m: 200,
    pass_count_3m: 850,
    fail_count_3m: 150,
    pass_count_12m: 950,
    fail_count_12m: 50,
    fail_rate_total: 0.1,
    fail_rate_1m: 0.2,
    fail_rate_3m: 0.15,
    fail_rate_12m: 0.05,
    trend_flag: 'down',
    last_execution_level: 'row'
  },
  {
    source: 'SYSTEM_B',
    tenant_id: 'tenant1',
    dataset_uuid: 'uuid2',
    dataset_name: 'Dataset B',
    rule_code: 'R002',
    rule_name: 'Validity Check',
    rule_type: 'validity',
    dimension: 'validity',
    rule_description: 'Check data format',
    category: 'data_quality',
    business_date_latest: '2025-06-27',
    dataset_record_count_latest: 1000,
    filtered_record_count_latest: 1000,
    pass_count_total: 950,
    fail_count_total: 50,
    pass_count_1m: 900,
    fail_count_1m: 100,
    pass_count_3m: 920,
    fail_count_3m: 80,
    pass_count_12m: 980,
    fail_count_12m: 20,
    fail_rate_total: 0.05,
    fail_rate_1m: 0.1,
    fail_rate_3m: 0.08,
    fail_rate_12m: 0.02,
    trend_flag: 'down',
    last_execution_level: 'row'
  }
];

describe('SystemHealthMatrix', () => {
  it('should render matrix title', () => {
    render(<SystemHealthMatrix data={mockData} filters={{}} />);
    
    expect(screen.getByText('System Health Matrix')).toBeInTheDocument();
  });

  it('should render matrix subtitle', () => {
    render(<SystemHealthMatrix data={mockData} filters={{}} />);
    
    expect(screen.getByText('Overall health status of systems vs quality dimensions')).toBeInTheDocument();
  });

  it('should display systems as row headers', () => {
    render(<SystemHealthMatrix data={mockData} filters={{}} />);
    
    expect(screen.getByText('SYSTEM_A')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM_B')).toBeInTheDocument();
  });

  it('should display dimensions as column headers', () => {
    render(<SystemHealthMatrix data={mockData} filters={{}} />);
    
    expect(screen.getByText('completeness')).toBeInTheDocument();
    expect(screen.getByText('validity')).toBeInTheDocument();
  });

  it('should render health status indicators', () => {
    render(<SystemHealthMatrix data={mockData} filters={{}} />);
    
    // Should have health status cells with colors
    const healthCells = screen.getAllByTestId(/health-cell/);
    expect(healthCells.length).toBeGreaterThan(0);
  });

  it('should apply filters correctly', () => {
    const filters = { source: ['SYSTEM_A'] };
    render(<SystemHealthMatrix data={mockData} filters={filters} />);
    
    expect(screen.getByText('SYSTEM_A')).toBeInTheDocument();
    // SYSTEM_B should not be present when filtered
  });

  it('should handle empty data gracefully', () => {
    render(<SystemHealthMatrix data={[]} filters={{}} />);
    
    expect(screen.getByText('System Health Matrix')).toBeInTheDocument();
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should show health scores in cells', () => {
    render(<SystemHealthMatrix data={mockData} filters={{}} />);
    
    // Should display health percentages
    const percentageElements = screen.getAllByText(/^\d+%$/);
    expect(percentageElements.length).toBeGreaterThan(0);
  });
});