import { DataQualityRecord } from '@/types';

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
  currentFilters: Record<string, string[]>
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
  currentFilters: Record<string, string[]>,
  targetField: keyof DataQualityRecord
): string[] {
  // Create a copy of filters without the target field
  const filtersWithoutTarget = { ...currentFilters };
  delete filtersWithoutTarget[targetField as string];
  
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
  filters: Record<string, string[]>
): boolean {
  const filteredData = applyCurrentFilters(data, filters);
  return filteredData.length > 0;
}

/**
 * Get suggested alternative filters when current combination returns empty
 */
export function getSuggestedFilters(
  data: DataQualityRecord[],
  currentFilters: Record<string, string[]>
): { field: string; values: string[] }[] {
  const suggestions: { field: string; values: string[] }[] = [];
  
  // Try removing each filter one by one to find valid combinations
  const filterKeys = Object.keys(currentFilters);
  
  for (const key of filterKeys) {
    const modifiedFilters = { ...currentFilters };
    delete modifiedFilters[key];
    
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
export function shouldApplyHierarchicalFiltering(filters: Record<string, string[]>): boolean {
  const hierarchy = getFilterHierarchy();
  const activeFilters = Object.keys(filters).filter(key => filters[key]?.length > 0);
  
  // Apply hierarchical filtering if we have filters from different levels
  return hierarchy.some(level => activeFilters.includes(level));
}

/**
 * Apply current filters to data efficiently
 */
function applyCurrentFilters(
  data: DataQualityRecord[],
  filters: Record<string, string[]>
): DataQualityRecord[] {
  return data.filter(record => {
    return Object.entries(filters).every(([key, values]) => {
      if (!values || values.length === 0) return true;
      const recordValue = record[key as keyof DataQualityRecord] as string;
      return values.includes(recordValue);
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
  filters: Record<string, string[]>
): {
  totalRecords: number;
  filteredRecords: number;
  filterEfficiency: number;
  activeFilters: number;
} {
  const filteredData = applyCurrentFilters(data, filters);
  const activeFilters = Object.values(filters).reduce((count, values) => 
    count + (values?.length || 0), 0
  );
  
  return {
    totalRecords: data.length,
    filteredRecords: filteredData.length,
    filterEfficiency: data.length > 0 ? filteredData.length / data.length : 0,
    activeFilters
  };
}