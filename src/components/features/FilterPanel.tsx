import { useState } from 'react';
import { DataQualityRecord } from '@/types';
import { getUniqueValues } from '@/lib/dataProcessor';

interface DateRange {
  start: string;
  end: string;
}

interface FilterPanelProps {
  data: DataQualityRecord[];
  filters: Record<string, string[] | DateRange>;
  onFiltersChange: (filters: Record<string, string[] | DateRange>) => void;
}

export function FilterPanel({ data, filters, onFiltersChange }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Determine which filters to show based on data
  const uniqueTenants = getUniqueValues(data, 'tenant_id');
  const showTenantFilter = uniqueTenants.length > 1;

  const filterConfig = [
    { key: 'source', label: 'Source System' },
    { key: 'dataset_name', label: 'Dataset Name' },
    { key: 'rule_type', label: 'Rule Type' },
    { key: 'dimension', label: 'Dimension' },
    { key: 'trend_flag', label: 'Trend Direction' },
    ...(showTenantFilter ? [{ key: 'tenant_id', label: 'Tenant' }] : [])
  ];

  const handleFilterChange = (filterKey: string, value: string, checked: boolean) => {
    const currentValues = filters[filterKey] as string[] || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);

    onFiltersChange({
      ...filters,
      [filterKey]: newValues
    });
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const currentDateRange = filters.dateRange as DateRange || { start: '', end: '' };
    const newDateRange = { ...currentDateRange, [field]: value };
    
    onFiltersChange({
      ...filters,
      dateRange: newDateRange
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const getFilterCount = () => {
    return Object.entries(filters).reduce((count, [key, values]) => {
      if (key === 'dateRange') {
        const dateRange = values as DateRange;
        return count + (dateRange.start || dateRange.end ? 1 : 0);
      }
      return count + (values as string[]).length;
    }, 0);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        <div className="flex items-center space-x-2">
          {getFilterCount() > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
              {getFilterCount()} active
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
        <div className="space-y-4">
          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="space-y-2">
              <input
                type="date"
                placeholder="Start Date"
                value={(filters.dateRange as DateRange)?.start || ''}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="date"
                placeholder="End Date"
                value={(filters.dateRange as DateRange)?.end || ''}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Other Filters */}
          {filterConfig.map((config) => {
            const values = getUniqueValues(data, config.key as keyof DataQualityRecord);
            const selectedValues = filters[config.key] as string[] || [];

            return (
              <div key={config.key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {config.label}
                </label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {values.map((value) => (
                    <label key={value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedValues.includes(value)}
                        onChange={(e) => handleFilterChange(config.key, value, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{value}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {getFilterCount() > 0 && (
            <button
              onClick={clearAllFilters}
              className="w-full text-sm text-gray-600 hover:text-gray-800 py-2 border-t pt-4"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}