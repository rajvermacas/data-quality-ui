import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPanel } from '@/components/features/FilterPanel';
import { DataQualityRecord } from '@/types';

// Mock the getUniqueValues function
jest.mock('@/lib/dataProcessor', () => ({
  getUniqueValues: jest.fn((data, field) => {
    if (field === 'source') return ['SYSTEM_A', 'SYSTEM_B'];
    if (field === 'dataset_name') return ['Test Dataset 1', 'Compliance Data'];
    if (field === 'rule_type') return ['BUSINESS_RULE', 'ATTRIBUTE'];
    if (field === 'dimension') return ['Validity', 'Completeness'];
    if (field === 'trend_flag') return ['up', 'down', 'equal'];
    if (field === 'tenant_id') {
      // Return unique tenant_ids from the actual data passed to it
      const uniqueTenants = [...new Set(data.map(item => item.tenant_id))];
      return uniqueTenants;
    }
    return [];
  })
}));

const mockData: DataQualityRecord[] = [
  {
    source: 'SYSTEM_A',
    tenant_id: 'tenant_001',
    dataset_uuid: 'ds001',
    dataset_name: 'Test Dataset 1',
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

describe('FilterPanel', () => {
  const mockOnFiltersChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render filter sections', () => {
    render(
      <FilterPanel
        data={mockData}
        filters={{}}
        onFiltersChange={mockOnFiltersChange}
      />
    );
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Source System')).toBeInTheDocument();
    expect(screen.getByText('Dataset Name')).toBeInTheDocument();
    expect(screen.getByText('Rule Type')).toBeInTheDocument();
    expect(screen.getByText('Dimension')).toBeInTheDocument();
    expect(screen.getByText('Trend Direction')).toBeInTheDocument();
  });

  it('should render filter options from data', () => {
    render(
      <FilterPanel
        data={mockData}
        filters={{}}
        onFiltersChange={mockOnFiltersChange}
      />
    );
    
    expect(screen.getByText('SYSTEM_A')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM_B')).toBeInTheDocument();
    expect(screen.getByText('Test Dataset 1')).toBeInTheDocument();
    expect(screen.getByText('Compliance Data')).toBeInTheDocument();
    expect(screen.getByText('BUSINESS_RULE')).toBeInTheDocument();
    expect(screen.getByText('ATTRIBUTE')).toBeInTheDocument();
    expect(screen.getByText('Validity')).toBeInTheDocument();
    expect(screen.getByText('Completeness')).toBeInTheDocument();
  });

  it('should handle filter selection', () => {
    render(
      <FilterPanel
        data={mockData}
        filters={{}}
        onFiltersChange={mockOnFiltersChange}
      />
    );
    
    const systemACheckbox = screen.getByLabelText('SYSTEM_A');
    fireEvent.click(systemACheckbox);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      source: ['SYSTEM_A']
    });
  });

  it('should handle filter deselection', () => {
    render(
      <FilterPanel
        data={mockData}
        filters={{ source: ['SYSTEM_A', 'SYSTEM_B'] }}
        onFiltersChange={mockOnFiltersChange}
      />
    );
    
    const systemACheckbox = screen.getByLabelText('SYSTEM_A');
    fireEvent.click(systemACheckbox);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      source: ['SYSTEM_B']
    });
  });

  it('should show active filter count', () => {
    render(
      <FilterPanel
        data={mockData}
        filters={{ source: ['SYSTEM_A'], rule_type: ['BUSINESS_RULE'] }}
        onFiltersChange={mockOnFiltersChange}
      />
    );
    
    expect(screen.getByText('2 active')).toBeInTheDocument();
  });

  it('should handle clear all filters', () => {
    render(
      <FilterPanel
        data={mockData}
        filters={{ source: ['SYSTEM_A'], rule_type: ['BUSINESS_RULE'] }}
        onFiltersChange={mockOnFiltersChange}
      />
    );
    
    const clearButton = screen.getByText('Clear All Filters');
    fireEvent.click(clearButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  });

  it('should toggle panel visibility', () => {
    render(
      <FilterPanel
        data={mockData}
        filters={{}}
        onFiltersChange={mockOnFiltersChange}
      />
    );
    
    const toggleButton = screen.getByText('▼');
    fireEvent.click(toggleButton);
    
    expect(screen.queryByText('Source System')).not.toBeInTheDocument();
    
    const reopenButton = screen.getByText('▶');
    fireEvent.click(reopenButton);
    
    expect(screen.getByText('Source System')).toBeInTheDocument();
  });

  it('should not show clear button when no filters are active', () => {
    render(
      <FilterPanel
        data={mockData}
        filters={{}}
        onFiltersChange={mockOnFiltersChange}
      />
    );
    
    expect(screen.queryByText('Clear All Filters')).not.toBeInTheDocument();
  });

  it('should handle dataset name filter selection', () => {
    render(
      <FilterPanel
        data={mockData}
        filters={{}}
        onFiltersChange={mockOnFiltersChange}
      />
    );
    
    const complianceDataCheckbox = screen.getByLabelText('Compliance Data');
    fireEvent.click(complianceDataCheckbox);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      dataset_name: ['Compliance Data']
    });
  });

  it('should show active filter count with dataset name filter', () => {
    render(
      <FilterPanel
        data={mockData}
        filters={{ dataset_name: ['Compliance Data'], source: ['SYSTEM_A'] }}
        onFiltersChange={mockOnFiltersChange}
      />
    );
    
    expect(screen.getByText('2 active')).toBeInTheDocument();
  });

  // Stage 2 Enhancement Tests - Date Range Picker
  it('should render date range picker section', () => {
    render(
      <FilterPanel
        data={mockData}
        filters={{}}
        onFiltersChange={mockOnFiltersChange}
      />
    );
    
    expect(screen.getByText('Date Range')).toBeInTheDocument();
    const dateInputs = screen.getAllByDisplayValue('');
    expect(dateInputs).toHaveLength(2); // Start and end date inputs
  });

  it('should handle date range filter changes', () => {
    render(
      <FilterPanel
        data={mockData}
        filters={{}}
        onFiltersChange={mockOnFiltersChange}
      />
    );
    
    const dateInputs = screen.getAllByDisplayValue('');
    const startDateInput = dateInputs[0];
    const endDateInput = dateInputs[1];
    
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      dateRange: { start: '2024-01-01', end: '' }
    });
    
    fireEvent.change(endDateInput, { target: { value: '2024-12-31' } });
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      dateRange: { start: '', end: '2024-12-31' }
    });
  });

  it('should show tenant filter for multi-tenant support', () => {
    const multiTenantData = [
      ...mockData,
      { ...mockData[0], tenant_id: 'tenant_002' }
    ];
    
    render(
      <FilterPanel
        data={multiTenantData}
        filters={{}}
        onFiltersChange={mockOnFiltersChange}
      />
    );
    
    expect(screen.getByText('Tenant')).toBeInTheDocument();
  });
});