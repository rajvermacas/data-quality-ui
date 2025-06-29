import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPanel } from '@/components/features/FilterPanel';
import { DataQualityRecord } from '@/types';

// Mock the smart filter functions
jest.mock('@/lib/dataProcessor', () => ({
  getSmartFilterOptions: jest.fn().mockReturnValue({
    availableOptions: {
      tenant_id: ['tenant_001', 'tenant_002'],
      source: ['HR_SYSTEM', 'FINANCE_SYSTEM'],
      dataset_name: ['Employee Directory', 'Financial Accounts'],
      trend_flag: ['up', 'down'],
      dimension: ['Completeness', 'Validity'],
      rule_type: ['ATTRIBUTE', 'BUSINESS_RULE'],
      rule_name: ['COMPLETENESS_CHECK', 'RANGE_CHECK']
    },
    totalRecords: 2,
    hasData: true
  }),
  getFilterValueCounts: jest.fn().mockReturnValue({})
}));

// Mock data for testing
const mockData: DataQualityRecord[] = [
  {
    source: 'HR_SYSTEM',
    tenant_id: 'tenant_001',
    dataset_uuid: 'ds001',
    dataset_name: 'Employee Directory',
    rule_code: '1',
    rule_name: 'COMPLETENESS_CHECK',
    rule_type: 'ATTRIBUTE',
    dimension: 'Completeness',
    rule_description: 'Test rule',
    category: 'C1',
    business_date_latest: '2024-01-01',
    dataset_record_count_latest: 1000,
    filtered_record_count_latest: 950,
    pass_count_total: 900,
    fail_count_total: 50,
    pass_count_1m: 800,
    fail_count_1m: 10,
    pass_count_3m: 850,
    fail_count_3m: 25,
    pass_count_12m: 900,
    fail_count_12m: 50,
    fail_rate_total: 0.05,
    fail_rate_1m: 0.012,
    fail_rate_3m: 0.028,
    fail_rate_12m: 0.053,
    trend_flag: 'up',
    last_execution_level: 'ATTRIBUTE'
  },
  {
    source: 'FINANCE_SYSTEM',
    tenant_id: 'tenant_002',
    dataset_uuid: 'ds002',
    dataset_name: 'Financial Accounts',
    rule_code: '2',
    rule_name: 'RANGE_CHECK',
    rule_type: 'BUSINESS_RULE',
    dimension: 'Validity',
    rule_description: 'Test rule 2',
    category: 'C2',
    business_date_latest: '2024-01-01',
    dataset_record_count_latest: 2000,
    filtered_record_count_latest: 1800,
    pass_count_total: 1700,
    fail_count_total: 100,
    pass_count_1m: 1600,
    fail_count_1m: 20,
    pass_count_3m: 1650,
    fail_count_3m: 50,
    pass_count_12m: 1700,
    fail_count_12m: 100,
    fail_rate_total: 0.056,
    fail_rate_1m: 0.012,
    fail_rate_3m: 0.029,
    fail_rate_12m: 0.056,
    trend_flag: 'down',
    last_execution_level: 'RECORD'
  }
];

describe('FilterPanel', () => {
  const mockOnFiltersChange = jest.fn();

  beforeEach(() => {
    mockOnFiltersChange.mockClear();
  });

  it('should show tenant filter section with multiple tenants', () => {
    render(
      <FilterPanel 
        data={mockData} 
        filters={{}} 
        onFiltersChange={mockOnFiltersChange} 
      />
    );

    expect(screen.getByText('Tenant')).toBeInTheDocument();
    expect(screen.getByText('tenant_001')).toBeInTheDocument();
    expect(screen.getByText('tenant_002')).toBeInTheDocument();
  });

  it('should keep tenant filter visible when tenant is selected', () => {
    const filters = { tenant_id: ['tenant_001'] };
    
    render(
      <FilterPanel 
        data={mockData} 
        filters={filters} 
        onFiltersChange={mockOnFiltersChange} 
      />
    );

    // Tenant section should still be visible
    expect(screen.getByText('Tenant')).toBeInTheDocument();
  });

  it('should not show record counts next to filter options', () => {
    render(
      <FilterPanel 
        data={mockData} 
        filters={{}} 
        onFiltersChange={mockOnFiltersChange} 
      />
    );

    // Check that individual filter values don't have counts
    const tenant001 = screen.getByText('tenant_001');
    expect(tenant001.textContent).toBe('tenant_001'); // No count after it
    
    const tenant002 = screen.getByText('tenant_002');
    expect(tenant002.textContent).toBe('tenant_002'); // No count after it
  });

  it('should handle filter selection correctly', () => {
    render(
      <FilterPanel 
        data={mockData} 
        filters={{}} 
        onFiltersChange={mockOnFiltersChange} 
      />
    );

    const tenant001Checkbox = screen.getByRole('checkbox', { name: /tenant_001/ });
    fireEvent.click(tenant001Checkbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      tenant_id: ['tenant_001']
    });
  });

  it('should handle filter deselection correctly', () => {
    const filters = { tenant_id: ['tenant_001'] };
    
    render(
      <FilterPanel 
        data={mockData} 
        filters={filters} 
        onFiltersChange={mockOnFiltersChange} 
      />
    );

    const tenant001Checkbox = screen.getByRole('checkbox', { name: /tenant_001/ });
    expect(tenant001Checkbox).toBeChecked();
    
    fireEvent.click(tenant001Checkbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  });
});