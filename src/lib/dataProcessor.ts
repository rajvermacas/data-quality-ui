import Papa from 'papaparse';
import { DataQualityRecord, DashboardMetrics, UrgentAttentionItem } from '@/types';

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

  const urgentAttentionCount = data.filter(item => item.trend_flag === 'down').length;
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
    .filter(item => item.trend_flag === 'down')
    .map(item => ({
      dataset_name: item.dataset_name,
      source: item.source,
      dimension: item.dimension,
      fail_rate_1m: item.fail_rate_1m,
      fail_rate_3m: item.fail_rate_3m,
      fail_rate_12m: item.fail_rate_12m,
      trend_flag: 'down' as const
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