import { DataQualityRecord, FilterState, IntervalFilter } from '@/types';

/**
 * Smart Filter Engine for dynamic filter option computation
 * Prevents filter combinations that would result in empty data
 */

export interface FilterOptions {
  [key: string]: string[];
}

export interface FilterDependencies {
  [filterKey: string]: Set<string>;
}

export interface SmartFilterResult {
  availableOptions: FilterOptions;
  totalRecords: number;
  hasData: boolean;
}

/**
 * Core function to get available filter options based on current data and filters
 */
export function getAvailableFilterOptions(
  data: DataQualityRecord[],
  currentFilters: FilterState
): SmartFilterResult {
  // First, filter data based on current selections
  const filteredData = applyCurrentFilters(data, currentFilters);
  
  if (filteredData.length === 0) {
    return {
      availableOptions: {},
      totalRecords: 0,
      hasData: false
    };
  }

  // Compute available options for each filter field
  const availableOptions: FilterOptions = {};
  
  // Data Source filters
  availableOptions.tenant_id = getUniqueValues(filteredData, 'tenant_id');
  availableOptions.source = getUniqueValues(filteredData, 'source');
  availableOptions.dataset_name = getUniqueValues(filteredData, 'dataset_name');
  
  // Data Quality filters
  availableOptions.trend_flag = getUniqueValues(filteredData, 'trend_flag');
  availableOptions.dimension = getUniqueValues(filteredData, 'dimension');
  availableOptions.rule_type = getUniqueValues(filteredData, 'rule_type');
  availableOptions.rule_name = getUniqueValues(filteredData, 'rule_name');

  return {
    availableOptions,
    totalRecords: filteredData.length,
    hasData: true
  };
}

/**
 * Get smart filter options for a specific field considering other active filters
 */
export function getSmartOptionsForField(
  data: DataQualityRecord[],
  currentFilters: FilterState,
  targetField: keyof DataQualityRecord
): string[] {
  // Create a copy of filters without the target field
  const filtersWithoutTarget = { ...currentFilters };
  delete (filtersWithoutTarget as any)[targetField as string];
  
  // Filter data without the target field
  const filteredData = applyCurrentFilters(data, filtersWithoutTarget);
  
  // Return unique values from filtered data
  return getUniqueValues(filteredData, targetField);
}

/**
 * Check if a specific filter combination would result in data
 */
export function validateFilterCombination(
  data: DataQualityRecord[],
  filters: FilterState
): boolean {
  const filteredData = applyCurrentFilters(data, filters);
  return filteredData.length > 0;
}

/**
 * Get suggested alternative filters when current combination returns empty
 */
export function getSuggestedFilters(
  data: DataQualityRecord[],
  currentFilters: FilterState
): { field: string; values: string[] }[] {
  const suggestions: { field: string; values: string[] }[] = [];
  
  // Try removing each filter one by one to find valid combinations
  const filterKeys = Object.keys(currentFilters);
  
  for (const key of filterKeys) {
    if (key === 'interval') continue; // Skip interval filter for suggestions
    
    const modifiedFilters = { ...currentFilters };
    delete (modifiedFilters as any)[key];
    
    const filteredData = applyCurrentFilters(data, modifiedFilters);
    if (filteredData.length > 0) {
      const availableValues = getUniqueValues(filteredData, key as keyof DataQualityRecord);
      if (availableValues.length > 0) {
        suggestions.push({
          field: key,
          values: availableValues
        });
      }
    }
  }
  
  return suggestions;
}

/**
 * Build relationship map for performance optimization
 */
export function buildFilterRelationshipMap(data: DataQualityRecord[]): Map<string, Set<string>> {
  const relationshipMap = new Map<string, Set<string>>();
  
  // Build relationships for common filter combinations
  const filterFields: (keyof DataQualityRecord)[] = [
    'tenant_id', 'source', 'dataset_name', 'rule_type', 'rule_name', 'dimension', 'trend_flag'
  ];
  
  filterFields.forEach(field => {
    const uniqueValues = getUniqueValues(data, field);
    relationshipMap.set(field as string, new Set(uniqueValues));
  });
  
  return relationshipMap;
}

/**
 * Get the hierarchical order of filters for cascading
 */
export function getFilterHierarchy(): string[] {
  return [
    'tenant_id',
    'source', 
    'dataset_name',
    'trend_flag',
    'dimension',
    'rule_type',
    'rule_name'
  ];
}

/**
 * Check if filters should be applied in hierarchical order
 */
export function shouldApplyHierarchicalFiltering(filters: FilterState): boolean {
  const hierarchy = getFilterHierarchy();
  const activeFilters = Object.keys(filters).filter(key => {
    if (key === 'interval') return (filters as any)[key] !== 'all';
    return Array.isArray((filters as any)[key]) && ((filters as any)[key] as string[]).length > 0;
  });
  
  // Apply hierarchical filtering if we have filters from different levels
  return hierarchy.some(level => activeFilters.includes(level));
}

/**
 * Apply current filters to data efficiently
 */
function applyCurrentFilters(
  data: DataQualityRecord[],
  filters: FilterState
): DataQualityRecord[] {
  return data.filter(record => {
    return Object.entries(filters).every(([key, values]) => {
      // Handle interval filter specially
      if (key === 'interval') {
        // For interval filtering, we don't filter out records
        // but rather determine which failure rate to use in visualizations
        return true;
      }
      
      // Handle regular array filters
      if (!values || (Array.isArray(values) && values.length === 0)) return true;
      if (Array.isArray(values)) {
        const recordValue = record[key as keyof DataQualityRecord] as string;
        return values.includes(recordValue);
      }
      
      return true;
    });
  });
}

/**
 * Get unique values for a field from data array
 */
function getUniqueValues(data: DataQualityRecord[], field: keyof DataQualityRecord): string[] {
  const values = data.map(item => item[field] as string);
  return [...new Set(values)].sort();
}

/**
 * Get filter statistics for debugging and monitoring
 */
export function getFilterStatistics(
  data: DataQualityRecord[],
  filters: FilterState
): {
  totalRecords: number;
  filteredRecords: number;
  filterEfficiency: number;
  activeFilters: number;
} {
  const filteredData = applyCurrentFilters(data, filters);
  const activeFilters = Object.entries(filters).reduce((count, [key, values]) => {
    if (key === 'interval') {
      return count + (values !== 'all' ? 1 : 0);
    }
    return count + (Array.isArray(values) ? (values as string[]).length : 0);
  }, 0);
  
  return {
    totalRecords: data.length,
    filteredRecords: filteredData.length,
    filterEfficiency: data.length > 0 ? filteredData.length / data.length : 0,
    activeFilters
  };
}