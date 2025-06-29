import { DataQualityRecord } from '@/types';
import { filterData } from './dataProcessor';

/**
 * Filter Validation System
 * Provides validation and suggestions for filter combinations
 */

export interface FilterValidationResult {
  isValid: boolean;
  hasData: boolean;
  recordCount: number;
  suggestions?: FilterSuggestion[];
  warnings?: string[];
}

export interface FilterSuggestion {
  type: 'remove' | 'modify' | 'add';
  field: string;
  currentValue?: string;
  suggestedValue?: string;
  reason: string;
}

/**
 * Validate a filter combination and provide feedback
 */
export function validateFilterCombination(
  data: DataQualityRecord[],
  filters: Record<string, string[]>
): FilterValidationResult {
  const filteredData = filterData(data, filters);
  const hasData = filteredData.length > 0;
  
  const result: FilterValidationResult = {
    isValid: hasData,
    hasData,
    recordCount: filteredData.length,
  };

  // Always generate warnings for filter patterns
  result.warnings = generateWarnings(filters);
  
  // If no data, provide suggestions
  if (!hasData) {
    result.suggestions = generateSuggestions(data, filters);
  }

  return result;
}

/**
 * Generate suggestions when filters result in no data
 */
function generateSuggestions(
  data: DataQualityRecord[],
  filters: Record<string, string[]>
): FilterSuggestion[] {
  const suggestions: FilterSuggestion[] = [];
  const filterKeys = Object.keys(filters);

  // Try removing each filter to see which ones are causing the issue
  for (const key of filterKeys) {
    const filtersWithoutKey = { ...filters };
    delete filtersWithoutKey[key];
    
    const resultData = filterData(data, filtersWithoutKey);
    if (resultData.length > 0) {
      suggestions.push({
        type: 'remove',
        field: key,
        reason: `Removing this filter would return ${resultData.length} records`
      });
    }
  }

  // Try modifying individual filter values
  for (const [key, values] of Object.entries(filters)) {
    if (values.length > 1) {
      // Try with just the first value
      const modifiedFilters = { ...filters, [key]: [values[0]] };
      const resultData = filterData(data, modifiedFilters);
      
      if (resultData.length > 0) {
        suggestions.push({
          type: 'modify',
          field: key,
          currentValue: values.join(', '),
          suggestedValue: values[0],
          reason: `Using only "${values[0]}" would return ${resultData.length} records`
        });
      }
    }
  }

  // Suggest alternative values for problematic filters
  const alternativeSuggestions = generateAlternativeValues(data, filters);
  suggestions.push(...alternativeSuggestions);

  return suggestions.slice(0, 5); // Limit to top 5 suggestions
}

/**
 * Generate alternative filter values
 */
function generateAlternativeValues(
  data: DataQualityRecord[],
  filters: Record<string, string[]>
): FilterSuggestion[] {
  const suggestions: FilterSuggestion[] = [];
  
  // For each active filter, suggest the most common values in the data
  for (const [key, selectedValues] of Object.entries(filters)) {
    const filtersWithoutKey = { ...filters };
    delete filtersWithoutKey[key];
    
    const compatibleData = filterData(data, filtersWithoutKey);
    if (compatibleData.length > 0) {
      // Get value counts for this field
      const valueCounts: Record<string, number> = {};
      compatibleData.forEach(record => {
        const value = record[key as keyof DataQualityRecord] as string;
        valueCounts[value] = (valueCounts[value] || 0) + 1;
      });
      
      // Find most common value that's not already selected
      const sortedValues = Object.entries(valueCounts)
        .filter(([value]) => !selectedValues.includes(value))
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);
      
      for (const [value, count] of sortedValues) {
        suggestions.push({
          type: 'modify',
          field: key,
          currentValue: selectedValues.join(', '),
          suggestedValue: value,
          reason: `"${value}" appears in ${count} compatible records`
        });
      }
    }
  }
  
  return suggestions;
}

/**
 * Generate warnings for potentially problematic filter combinations
 */
function generateWarnings(filters: Record<string, string[]>): string[] {
  const warnings: string[] = [];
  
  // Too many active filters
  const activeFilterCount = Object.values(filters).reduce(
    (sum, values) => sum + values.length, 0
  );
  
  if (activeFilterCount > 8) {
    warnings.push('You have many active filters. Consider removing some to broaden your search.');
  }
  
  // Contradictory trend filters
  if (filters.trend_flag && filters.trend_flag.length > 2) {
    warnings.push('Multiple trend directions selected may limit results significantly.');
  }
  
  // Too specific dataset selection
  if (filters.dataset_name && filters.dataset_name.length > 5) {
    warnings.push('Selecting too many datasets may create conflicting constraints.');
  }
  
  return warnings;
}

/**
 * Check if a specific filter value would be compatible with current selection
 */
export function isFilterValueCompatible(
  data: DataQualityRecord[],
  currentFilters: Record<string, string[]>,
  targetField: string,
  targetValue: string
): boolean {
  const testFilters = {
    ...currentFilters,
    [targetField]: [...(currentFilters[targetField] || []), targetValue]
  };
  
  const resultData = filterData(data, testFilters);
  return resultData.length > 0;
}

/**
 * Get the minimum filter changes needed to get some data
 */
export function getMinimalViableFilters(
  data: DataQualityRecord[],
  filters: Record<string, string[]>
): Record<string, string[]> {
  // First check if current filters already work
  const currentData = filterData(data, filters);
  if (currentData.length > 0) {
    return filters;
  }
  
  const filterKeys = Object.keys(filters);
  
  // Try removing filters one by one until we get data
  for (let i = 1; i <= filterKeys.length; i++) {
    const combinations = getCombinations(filterKeys, filterKeys.length - i);
    
    for (const combination of combinations) {
      const reducedFilters: Record<string, string[]> = {};
      combination.forEach(key => {
        reducedFilters[key] = filters[key];
      });
      
      const resultData = filterData(data, reducedFilters);
      if (resultData.length > 0) {
        return reducedFilters;
      }
    }
  }
  
  return {}; // Return empty filters if nothing works
}

/**
 * Helper function to generate combinations
 */
function getCombinations<T>(arr: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (size > arr.length) return [];
  
  const result: T[][] = [];
  
  for (let i = 0; i < arr.length; i++) {
    const first = arr[i];
    const rest = arr.slice(i + 1);
    const restCombinations = getCombinations(rest, size - 1);
    
    for (const combination of restCombinations) {
      result.push([first, ...combination]);
    }
  }
  
  return result;
}

/**
 * Predict the impact of adding a new filter
 */
export function predictFilterImpact(
  data: DataQualityRecord[],
  currentFilters: Record<string, string[]>,
  newField: string,
  newValue: string
): {
  currentRecords: number;
  predictedRecords: number;
  impact: 'positive' | 'negative' | 'neutral';
  impactPercentage: number;
} {
  const currentData = filterData(data, currentFilters);
  const newFilters = {
    ...currentFilters,
    [newField]: [...(currentFilters[newField] || []), newValue]
  };
  const newData = filterData(data, newFilters);
  
  const currentRecords = currentData.length;
  const predictedRecords = newData.length;
  const impactPercentage = currentRecords > 0 
    ? ((predictedRecords - currentRecords) / currentRecords) * 100 
    : 0;
  
  let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (predictedRecords > currentRecords) impact = 'positive';
  else if (predictedRecords < currentRecords) impact = 'negative';
  
  return {
    currentRecords,
    predictedRecords,
    impact,
    impactPercentage
  };
}