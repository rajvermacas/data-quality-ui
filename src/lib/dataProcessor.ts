import Papa from 'papaparse';
import { DataQualityRecord, DashboardMetrics, UrgentAttentionItem, FilterState, IntervalFilter } from '@/types';
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
      trendingFlat: 0
    };
  }

  const urgentAttentionCount = data.filter(item => {
    // Check if 1-month failure rate is 20% or higher
    return item.fail_rate_1m >= 0.2;
  }).length;
  const trendingDown = data.filter(item => item.trend_flag === 'down').length;
  const trendingUp = data.filter(item => item.trend_flag === 'up').length;
  const trendingFlat = data.filter(item => item.trend_flag === 'equal').length;
  
  const totalFailRate = data.reduce((sum, item) => sum + item.fail_rate_1m, 0);
  const averageFailRate = totalFailRate / data.length;

  return {
    totalDatasets: data.length,
    urgentAttentionCount,
    averageFailRate,
    trendingDown,
    trendingUp,
    trendingFlat
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

export function filterData(data: DataQualityRecord[], filters: FilterState): DataQualityRecord[] {
  return data.filter(item => {
    return Object.entries(filters).every(([key, values]) => {
      // Handle interval filter specially
      if (key === 'interval') {
        return applyIntervalFilter(item, values as IntervalFilter);
      }
      
      // Handle regular array filters
      if (!values || (Array.isArray(values) && values.length === 0)) return true;
      if (Array.isArray(values)) {
        return values.includes(item[key as keyof DataQualityRecord] as string);
      }
      
      return true;
    });
  });
}

/**
 * Apply interval filter to determine which failure rate to use
 */
function applyIntervalFilter(item: DataQualityRecord, interval: IntervalFilter): boolean {
  // For 'all', we don't filter out any records
  if (interval === 'all') return true;
  
  // For specific intervals, we're not filtering records out,
  // but rather indicating which failure rate column to prioritize in visualizations
  // The actual filtering is handled in the chart components
  return true;
}

/**
 * Get the appropriate failure rate based on interval filter
 */
export function getFailureRateForInterval(item: DataQualityRecord, interval: IntervalFilter): number {
  switch (interval) {
    case '1m':
      return item.fail_rate_1m;
    case '3m':
      return item.fail_rate_3m;
    case '12m':
      return item.fail_rate_12m;
    case 'all':
    default:
      return item.fail_rate_total;
  }
}

/**
 * Get the appropriate pass/fail counts based on interval filter
 */
export function getCountsForInterval(item: DataQualityRecord, interval: IntervalFilter): { passCount: number; failCount: number } {
  switch (interval) {
    case '1m':
      return { passCount: item.pass_count_1m, failCount: item.fail_count_1m };
    case '3m':
      return { passCount: item.pass_count_3m, failCount: item.fail_count_3m };
    case '12m':
      return { passCount: item.pass_count_12m, failCount: item.fail_count_12m };
    case 'all':
    default:
      return { passCount: item.pass_count_total, failCount: item.fail_count_total };
  }
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
  currentFilters: FilterState
): string[] {
  // First apply existing filters (excluding the target field)
  const filtersWithoutTarget = { ...currentFilters };
  delete (filtersWithoutTarget as any)[field as string];
  
  const filteredData = filterData(data, filtersWithoutTarget);
  return getUniqueValues(filteredData, field);
}

/**
 * Get smart filter options with statistics
 */
export function getSmartFilterOptions(
  data: DataQualityRecord[],
  currentFilters: FilterState
): SmartFilterResult {
  return getAvailableFilterOptions(data, currentFilters);
}

/**
 * Check if a filter combination would yield any results
 */
export function hasDataForFilters(
  data: DataQualityRecord[],
  filters: FilterState
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
  currentFilters: FilterState
): Record<string, number> {
  const filtersWithoutTarget = { ...currentFilters };
  delete (filtersWithoutTarget as any)[field as string];
  
  const filteredData = filterData(data, filtersWithoutTarget);
  const counts: Record<string, number> = {};
  
  filteredData.forEach(item => {
    const value = item[field] as string;
    counts[value] = (counts[value] || 0) + 1;
  });
  
  return counts;
}