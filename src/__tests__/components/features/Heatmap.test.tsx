import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Heatmap } from '../../../components/features/Heatmap';
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

describe('Heatmap', () => {
  it('should render heatmap title', () => {
    render(<Heatmap data={mockData} filters={{}} />);
    
    expect(screen.getByText('Data Quality Heatmap')).toBeInTheDocument();
  });

  it('should render heatmap subtitle', () => {
    render(<Heatmap data={mockData} filters={{}} />);
    
    expect(screen.getByText('Failure rates by source system and rule type')).toBeInTheDocument();
  });

  it('should render color legend', () => {
    render(<Heatmap data={mockData} filters={{}} />);
    
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('should display heatmap cells for data', () => {
    render(<Heatmap data={mockData} filters={{}} />);
    
    // Should render systems and rule types
    expect(screen.getByText('SYSTEM_A')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM_B')).toBeInTheDocument();
    expect(screen.getByText('completeness')).toBeInTheDocument();
    expect(screen.getByText('validity')).toBeInTheDocument();
  });

  it('should apply filters correctly', () => {
    const filters = { source: ['SYSTEM_A'] };
    render(<Heatmap data={mockData} filters={filters} />);
    
    expect(screen.getByText('SYSTEM_A')).toBeInTheDocument();
    // SYSTEM_B should not be present when filtered
  });

  it('should handle empty data gracefully', () => {
    render(<Heatmap data={[]} filters={{}} />);
    
    expect(screen.getByText('Data Quality Heatmap')).toBeInTheDocument();
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
});