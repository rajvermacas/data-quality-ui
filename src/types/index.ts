export interface DataQualityRecord {
  source: string;
  tenant_id: string;
  dataset_uuid: string;
  dataset_name: string;
  rule_code: string;
  rule_name: string;
  rule_type: string;
  dimension: string;
  rule_description: string;
  category: string;
  business_date_latest: string;
  dataset_record_count_latest: number;
  filtered_record_count_latest: number;
  pass_count_total: number;
  fail_count_total: number;
  pass_count_1m: number;
  fail_count_1m: number;
  pass_count_3m: number;
  fail_count_3m: number;
  pass_count_12m: number;
  fail_count_12m: number;
  fail_rate_total: number;
  fail_rate_1m: number;
  fail_rate_3m: number;
  fail_rate_12m: number;
  trend_flag: 'up' | 'down' | 'equal';
  last_execution_level: string;
}

export interface FilterState {
  source?: string[];
  dataset_name?: string[];
  rule_type?: string[];
  dimension?: string[];
  tenant_id?: string[];
  trend_flag?: string[];
}

export interface TrendData {
  period: string;
  value: number;
  label: string;
}

export interface UrgentAttentionItem {
  dataset_name: string;
  source: string;
  dimension: string;
  fail_rate_1m: number;
  fail_rate_3m: number;
  fail_rate_12m: number;
  trend_flag: 'down';
}

export interface DashboardMetrics {
  totalDatasets: number;
  urgentAttentionCount: number;
  averageFailRate: number;
  trendingDown: number;
  trendingUp: number;
  stable: number;
}