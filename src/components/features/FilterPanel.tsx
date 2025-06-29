import { useState } from 'react';
import { DataQualityRecord } from '@/types';
import { getUniqueValues } from '@/lib/dataProcessor';

interface FilterPanelProps {
  data: DataQualityRecord[];
  filters: Record<string, string[]>;
  onFiltersChange: (filters: Record<string, string[]>) => void;
}

export function FilterPanel({ data, filters, onFiltersChange }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Determine which filters to show based on data
  const uniqueTenants = getUniqueValues(data, 'tenant_id');
  const showTenantFilter = uniqueTenants.length > 1;

  const dataSourceFilters = [
    ...(showTenantFilter ? [{ key: 'tenant_id', label: 'Tenant' }] : []),
    { key: 'source', label: 'Source System' },
    { key: 'dataset_name', label: 'Dataset Name' }
  ];

  const dataQualityFilters = [
    { key: 'trend_flag', label: 'Trend Direction' },
    { key: 'dimension', label: 'Dimension' },
    { key: 'rule_type', label: 'Rule Type' },
    { key: 'rule_name', label: 'Rule Name' }
  ];

  const handleFilterChange = (filterKey: string, value: string, checked: boolean) => {
    const currentValues = filters[filterKey] || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);

    onFiltersChange({
      ...filters,
      [filterKey]: newValues
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const getFilterCount = () => {
    return Object.entries(filters).reduce((count, [key, values]) => {
      return count + values.length;
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
        <div className="max-h-[600px] overflow-y-auto">
          <div className="space-y-6">
            {/* Data Source Filters */}
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3 pb-1 border-b border-gray-300">
                Data Source
              </h4>
              <div className="space-y-4">
                {dataSourceFilters.map((config) => {
                  const values = getUniqueValues(data, config.key as keyof DataQualityRecord);
                  const selectedValues = filters[config.key] || [];

                  return (
                    <div key={config.key}>
                      <label className="block text-sm font-medium text-gray-800 mb-2">
                        {config.label}
                      </label>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {values.map((value) => (
                          <label key={value} className="flex items-center hover:bg-gray-100 rounded px-1 py-0.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedValues.includes(value)}
                              onChange={(e) => handleFilterChange(config.key, value, e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2 flex-shrink-0"
                            />
                            <span className="text-sm text-gray-800 min-w-0">{value}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Data Quality Filters */}
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3 pb-1 border-b border-gray-300">
                Data Quality
              </h4>
              <div className="space-y-4">
                {dataQualityFilters.map((config) => {
                  const values = getUniqueValues(data, config.key as keyof DataQualityRecord);
                  const selectedValues = filters[config.key] || [];

                  return (
                    <div key={config.key}>
                      <label className="block text-sm font-medium text-gray-800 mb-2">
                        {config.label}
                      </label>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {values.map((value) => (
                          <label key={value} className="flex items-center hover:bg-gray-100 rounded px-1 py-0.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedValues.includes(value)}
                              onChange={(e) => handleFilterChange(config.key, value, e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2 flex-shrink-0"
                            />
                            <span className="text-sm text-gray-800 min-w-0">{value}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {getFilterCount() > 0 && (
            <button
              onClick={clearAllFilters}
              className="w-full text-sm text-gray-600 hover:text-gray-800 py-2 border-t border-gray-200 mt-4 font-medium"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}