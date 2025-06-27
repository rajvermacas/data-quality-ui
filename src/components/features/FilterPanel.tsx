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

  const filterConfig = [
    { key: 'source', label: 'Source System' },
    { key: 'rule_type', label: 'Rule Type' },
    { key: 'dimension', label: 'Dimension' },
    { key: 'trend_flag', label: 'Trend Direction' }
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
    return Object.values(filters).reduce((count, values) => count + values.length, 0);
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
          {filterConfig.map((config) => {
            const values = getUniqueValues(data, config.key as keyof DataQualityRecord);
            const selectedValues = filters[config.key] || [];

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