import Papa from 'papaparse';
import { DataQualityRecord, DashboardMetrics, UrgentAttentionItem } from '@/types';
import { getAvailableFilterOptions, SmartFilterResult } from './smartFilterEngine';

export function processCSVData(csvString: string): DataQualityRecord[] {
  if (!csvString.trim()) {
    return [];
  }

  try {
    const result = Papa.parse<DataQualityRecord>(csvString, {
      header: true,
      skipEmptyLines: true,
      transform: (value: string, header: string) => {
        // Convert numeric fields
        if ([
          'dataset_record_count_latest',
          'filtered_record_count_latest',
          'pass_count_total',
          'fail_count_total',
          'pass_count_1m',
          'fail_count_1m',
          'pass_count_3m',
          'fail_count_3m',
          'pass_count_12m',
          'fail_count_12m',
          'fail_rate_total',
          'fail_rate_1m',
          'fail_rate_3m',
          'fail_rate_12m'
        ].includes(header)) {
          return parseFloat(value) || 0;
        }
        return value;
      }
    });

    if (result.errors.length > 0) {
      console.warn('CSV parsing warnings:', result.errors);
    }

    return result.data;
  } catch (error) {
    console.error('Error parsing CSV data:', error);
    return [];
  }
}

export function calculateDashboardMetrics(data: DataQualityRecord[]): DashboardMetrics {
  if (data.length === 0) {
    return {
      totalDatasets: 0,
      urgentAttentionCount: 0,
      averageFailRate: 0,
      trendingDown: 0,
      trendingUp: 0,
      stable: 0
    };
  }

  const urgentAttentionCount = data.filter(item => {
    // Check if 1-month failure rate is 20% or higher
    return item.fail_rate_1m >= 0.2;
  }).length;
  const trendingDown = data.filter(item => item.trend_flag === 'down').length;
  const trendingUp = data.filter(item => item.trend_flag === 'up').length;
  const stable = data.filter(item => item.trend_flag === 'equal').length;
  
  const totalFailRate = data.reduce((sum, item) => sum + item.fail_rate_1m, 0);
  const averageFailRate = totalFailRate / data.length;

  return {
    totalDatasets: data.length,
    urgentAttentionCount,
    averageFailRate,
    trendingDown,
    trendingUp,
    stable
  };
}

export function getUrgentAttentionItems(data: DataQualityRecord[]): UrgentAttentionItem[] {
  return data
    .filter(item => {
      // Check if 1-month failure rate is 20% or higher
      return item.fail_rate_1m >= 0.2;
    })
    .map(item => ({
      dataset_name: item.dataset_name,
      source: item.source,
      dimension: item.dimension,
      fail_rate_1m: item.fail_rate_1m,
      fail_rate_3m: item.fail_rate_3m,
      fail_rate_12m: item.fail_rate_12m,
      trend_flag: item.trend_flag
    }))
    .sort((a, b) => b.fail_rate_1m - a.fail_rate_1m);
}

export function filterData(data: DataQualityRecord[], filters: Record<string, string[] | undefined>): DataQualityRecord[] {
  return data.filter(item => {
    return Object.entries(filters).every(([key, values]) => {
      if (!values || values.length === 0) return true;
      return values.includes(item[key as keyof DataQualityRecord] as string);
    });
  });
}

export function getUniqueValues(data: DataQualityRecord[], field: keyof DataQualityRecord): string[] {
  const values = data.map(item => item[field] as string);
  return [...new Set(values)].sort();
}

/**
 * Get filtered unique values based on current filter context
 * This is used for smart filtering where options depend on other active filters
 */
export function getFilteredUniqueValues(
  data: DataQualityRecord[], 
  field: keyof DataQualityRecord,
  currentFilters: Record<string, string[]>
): string[] {
  // First apply existing filters (excluding the target field)
  const filtersWithoutTarget = { ...currentFilters };
  delete filtersWithoutTarget[field as string];
  
  const filteredData = filterData(data, filtersWithoutTarget);
  return getUniqueValues(filteredData, field);
}

/**
 * Get smart filter options with statistics
 */
export function getSmartFilterOptions(
  data: DataQualityRecord[],
  currentFilters: Record<string, string[]>
): SmartFilterResult {
  return getAvailableFilterOptions(data, currentFilters);
}

/**
 * Check if a filter combination would yield any results
 */
export function hasDataForFilters(
  data: DataQualityRecord[],
  filters: Record<string, string[]>
): boolean {
  const filteredData = filterData(data, filters);
  return filteredData.length > 0;
}

/**
 * Get count of records for each filter value
 * Useful for showing data counts next to filter options
 */
export function getFilterValueCounts(
  data: DataQualityRecord[],
  field: keyof DataQualityRecord,
  currentFilters: Record<string, string[]>
): Record<string, number> {
  const filtersWithoutTarget = { ...currentFilters };
  delete filtersWithoutTarget[field as string];
  
  const filteredData = filterData(data, filtersWithoutTarget);
  const counts: Record<string, number> = {};
  
  filteredData.forEach(item => {
    const value = item[field] as string;
    counts[value] = (counts[value] || 0) + 1;
  });
  
  return counts;
}