import { useState, useMemo } from 'react';
import { DataQualityRecord, FilterState, IntervalFilter } from '@/types';
import { getFilteredUniqueValues, getFilterValueCounts, getSmartFilterOptions } from '@/lib/dataProcessor';

interface FilterPanelProps {
  data: DataQualityRecord[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

interface FilterConfig {
  key: string;
  label: string;
  priority: number;
}

export function FilterPanel({ data, filters, onFiltersChange }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Get smart filter options based on current selections
  const smartFilterResult = useMemo(() => {
    return getSmartFilterOptions(data, filters);
  }, [data, filters]);

  // Define filter configurations with priority for smart ordering
  const dataSourceFilters: FilterConfig[] = [
    { key: 'tenant_id', label: 'Tenant', priority: 1 },
    { key: 'source', label: 'Source System', priority: 2 },
    { key: 'dataset_name', label: 'Dataset Name', priority: 3 }
  ];

  const dataQualityFilters: FilterConfig[] = [
    { key: 'trend_flag', label: 'Trend Direction', priority: 4 },
    { key: 'dimension', label: 'Dimension', priority: 5 },
    { key: 'rule_type', label: 'Rule Type', priority: 6 },
    { key: 'rule_name', label: 'Rule Name', priority: 7 }
  ];

  // Determine which filters to show based on original data and current selections
  const shouldShowTenantFilter = useMemo(() => {
    // Show tenant filter if:
    // 1. Multiple tenants exist in original data, OR
    // 2. A tenant is already selected (so user can change/remove it)
    const originalTenants = [...new Set(data.map(item => item.tenant_id))];
    const hasSelectedTenant = filters.tenant_id && filters.tenant_id.length > 0;
    return originalTenants.length > 1 || hasSelectedTenant;
  }, [data, filters.tenant_id]);

  const handleFilterChange = (filterKey: string, value: string, checked: boolean) => {
    if (filterKey === 'interval') return; // Handle interval separately
    
    const currentValues = (filters[filterKey as keyof FilterState] as string[]) || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);

    const updatedFilters = { ...filters };
    if (newValues.length > 0) {
      (updatedFilters as any)[filterKey] = newValues;
    } else {
      delete (updatedFilters as any)[filterKey];
    }
    
    onFiltersChange(updatedFilters);
  };

  const handleIntervalChange = (interval: IntervalFilter) => {
    onFiltersChange({ ...filters, interval });
  };

  const clearAllFilters = () => {
    onFiltersChange({ interval: 'all' });
  };

  const getFilterCount = () => {
    return Object.entries(filters).reduce((count, [key, values]) => {
      if (key === 'interval') {
        return count + (values !== 'all' ? 1 : 0);
      }
      return count + (Array.isArray(values) ? values.length : 0);
    }, 0);
  };

  // Component for rendering individual filter section
  const FilterSection = ({ 
    config, 
    availableValues, 
    selectedValues,
    showCounts = false 
  }: { 
    config: FilterConfig;
    availableValues: string[];
    selectedValues: string[];
    showCounts?: boolean;
  }) => {
    const valueCounts = useMemo(() => {
      return showCounts ? getFilterValueCounts(data, config.key as keyof DataQualityRecord, filters) : {};
    }, [config.key, showCounts]);

    if (availableValues.length === 0) {
      return null; // Hide filter section if no options available
    }

    return (
      <div key={config.key}>
        <label className="block text-sm font-medium text-gray-800 mb-2">
          {config.label}
          {availableValues.length > 0 && (
            <span className="text-xs text-gray-500 ml-1">({availableValues.length})</span>
          )}
        </label>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {availableValues.map((value) => {
            const count = valueCounts[value];
            const isSelected = selectedValues.includes(value);
            
            return (
              <label 
                key={value} 
                className={`flex items-center hover:bg-gray-100 rounded px-1 py-0.5 cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleFilterChange(config.key, value, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2 flex-shrink-0"
                />
                <span className="text-sm text-gray-800 min-w-0 flex-1">{value}</span>
                {showCounts && count !== undefined && (
                  <span className="text-xs text-gray-500 ml-2">({count})</span>
                )}
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  // Filter sections to show based on available data
  const visibleDataSourceFilters = dataSourceFilters.filter(config => {
    if (config.key === 'tenant_id') {
      return shouldShowTenantFilter;
    }
    const availableOptions = smartFilterResult.availableOptions[config.key] || [];
    return availableOptions.length > 0;
  });

  const visibleDataQualityFilters = dataQualityFilters.filter(config => {
    const availableOptions = smartFilterResult.availableOptions[config.key] || [];
    return availableOptions.length > 0;
  });

  if (!smartFilterResult.hasData && getFilterCount() > 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <div className="flex items-center space-x-2">
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">
              No data
            </span>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-500 hover:text-gray-700"
            >
              {isOpen ? '▼' : '▶'}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="text-center py-4">
            <div className="text-yellow-600 text-sm mb-3">
              ⚠️ Current filter combination returns no data
            </div>
            <button
              onClick={clearAllFilters}
              className="btn-primary text-sm"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Smart Filters</h3>
        <div className="flex items-center space-x-2">
          {getFilterCount() > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
              {getFilterCount()} active
            </span>
          )}
          {smartFilterResult.hasData && (
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
              {smartFilterResult.totalRecords} records
            </span>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isOpen ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="max-h-[600px] overflow-y-auto">
          <div className="space-y-6">
            {/* Interval Filter */}
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3 pb-1 border-b border-blue-300">
                ⏱️ Time Interval
              </h4>
              <div className="space-y-2">
                {[
                  { value: 'all' as IntervalFilter, label: 'All Periods', description: 'Show data from all time periods' },
                  { value: '1m' as IntervalFilter, label: '1 Month', description: 'Last 1 month data only' },
                  { value: '3m' as IntervalFilter, label: '3 Months', description: 'Last 3 months data only' },
                  { value: '12m' as IntervalFilter, label: '12 Months', description: 'Last 12 months data only' }
                ].map((option) => (
                  <label 
                    key={option.value}
                    className={`flex items-start hover:bg-blue-100 rounded px-2 py-2 cursor-pointer transition-colors ${
                      filters.interval === option.value ? 'bg-blue-100 border border-blue-300' : 'border border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="interval"
                      value={option.value}
                      checked={filters.interval === option.value}
                      onChange={() => handleIntervalChange(option.value)}
                      className="mt-0.5 mr-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">{option.label}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Data Source Filters */}
            {visibleDataSourceFilters.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3 pb-1 border-b border-gray-300">
                  Data Source
                </h4>
                <div className="space-y-4">
                  {visibleDataSourceFilters.map((config) => {
                    let availableValues = smartFilterResult.availableOptions[config.key] || [];
                    const selectedValues = (filters[config.key as keyof FilterState] as string[]) || [];

                    // Special handling for tenant filter - use original data if smart filter returns empty
                    if (config.key === 'tenant_id' && availableValues.length === 0) {
                      availableValues = [...new Set(data.map(item => item.tenant_id))].sort();
                    }

                    return (
                      <FilterSection
                        key={config.key}
                        config={config}
                        availableValues={availableValues}
                        selectedValues={selectedValues}
                        showCounts={false}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Data Quality Filters */}
            {visibleDataQualityFilters.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3 pb-1 border-b border-gray-300">
                  Data Quality
                </h4>
                <div className="space-y-4">
                  {visibleDataQualityFilters.map((config) => {
                    const availableValues = smartFilterResult.availableOptions[config.key] || [];
                    const selectedValues = (filters[config.key as keyof FilterState] as string[]) || [];

                    return (
                      <FilterSection
                        key={config.key}
                        config={config}
                        availableValues={availableValues}
                        selectedValues={selectedValues}
                        showCounts={false}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* No visible filters message */}
            {visibleDataSourceFilters.length === 0 && visibleDataQualityFilters.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No filter options available for current data
              </div>
            )}
          </div>

          {getFilterCount() > 0 && (
            <button
              onClick={clearAllFilters}
              className="w-full text-sm text-gray-600 hover:text-gray-800 py-2 border-t border-gray-200 mt-4 font-medium transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}