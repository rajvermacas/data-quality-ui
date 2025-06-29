import { processCSVData, calculateDashboardMetrics, getUrgentAttentionItems, filterData, getUniqueValues } from '@/lib/dataProcessor';
import { DataQualityRecord } from '@/types';

const mockData: DataQualityRecord[] = [
  {
    source: 'TEST_SYSTEM',
    tenant_id: 'tenant_001',
    dataset_uuid: 'ds001',
    dataset_name: 'Test Dataset 1',
    rule_code: '1',
    rule_name: 'TEST_RULE',
    rule_type: 'BUSINESS_RULE',
    dimension: 'Validity',
    rule_description: 'Test rule description',
    category: 'C1',
    business_date_latest: '2024-01-01',
    dataset_record_count_latest: 1000,
    filtered_record_count_latest: 900,
    pass_count_total: 80,
    fail_count_total: 20,
    pass_count_1m: 40,
    fail_count_1m: 10,
    pass_count_3m: 70,
    fail_count_3m: 15,
    pass_count_12m: 80,
    fail_count_12m: 20,
    fail_rate_total: 0.2,
    fail_rate_1m: 0.25,
    fail_rate_3m: 0.2,
    fail_rate_12m: 0.2,
    trend_flag: 'down',
    last_execution_level: 'DATASET'
  },
  {
    source: 'TEST_SYSTEM_2',
    tenant_id: 'tenant_002',
    dataset_uuid: 'ds002',
    dataset_name: 'Test Dataset 2',
    rule_code: '2',
    rule_name: 'TEST_RULE_2',
    rule_type: 'ATTRIBUTE',
    dimension: 'Completeness',
    rule_description: 'Test rule description 2',
    category: 'C2',
    business_date_latest: '2024-01-02',
    dataset_record_count_latest: 2000,
    filtered_record_count_latest: 1800,
    pass_count_total: 90,
    fail_count_total: 10,
    pass_count_1m: 45,
    fail_count_1m: 5,
    pass_count_3m: 85,
    fail_count_3m: 8,
    pass_count_12m: 90,
    fail_count_12m: 10,
    fail_rate_total: 0.1,
    fail_rate_1m: 0.1,
    fail_rate_3m: 0.1,
    fail_rate_12m: 0.1,
    trend_flag: 'up',
    last_execution_level: 'RECORD'
  }
];

describe('DataProcessor', () => {
  describe('processCSVData', () => {
    it('should convert CSV string to DataQualityRecord array', () => {
      const csvData = `source,tenant_id,dataset_uuid,dataset_name,rule_code,rule_name,rule_type,dimension,rule_description,category,business_date_latest,dataset_record_count_latest,filtered_record_count_latest,pass_count_total,fail_count_total,pass_count_1m,fail_count_1m,pass_count_3m,fail_count_3m,pass_count_12m,fail_count_12m,fail_rate_total,fail_rate_1m,fail_rate_3m,fail_rate_12m,trend_flag,last_execution_level
TEST_SYSTEM,tenant_001,ds001,Test Dataset,1,TEST_RULE,BUSINESS_RULE,Validity,Test description,C1,2024-01-01,1000,900,80,20,40,10,70,15,80,20,0.2,0.2,0.176,0.2,down,DATASET`;
      
      const result = processCSVData(csvData);
      
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('TEST_SYSTEM');
      expect(result[0].fail_rate_1m).toBe(0.2);
      expect(result[0].trend_flag).toBe('down');
    });

    it('should handle empty CSV data', () => {
      const result = processCSVData('');
      expect(result).toEqual([]);
    });

    it('should handle malformed CSV data gracefully', () => {
      const csvData = 'invalid,csv,data';
      expect(() => processCSVData(csvData)).not.toThrow();
    });
  });

  describe('calculateDashboardMetrics', () => {
    it('should calculate correct dashboard metrics', () => {
      const metrics = calculateDashboardMetrics(mockData);
      
      expect(metrics.totalDatasets).toBe(2);
      expect(metrics.urgentAttentionCount).toBe(1); // Only one with >= 20% failure rate
      expect(metrics.trendingDown).toBe(1);
      expect(metrics.trendingUp).toBe(1);
      expect(metrics.stable).toBe(0);
    });

    it('should handle empty data array', () => {
      const metrics = calculateDashboardMetrics([]);
      
      expect(metrics.totalDatasets).toBe(0);
      expect(metrics.urgentAttentionCount).toBe(0);
      expect(metrics.averageFailRate).toBe(0);
    });
  });

  describe('getUrgentAttentionItems', () => {
    it('should return items with 20% or higher 1-month failure rate', () => {
      const urgentItems = getUrgentAttentionItems(mockData);
      
      expect(urgentItems).toHaveLength(1);
      expect(urgentItems[0].dataset_name).toBe('Test Dataset 1');
      // 0.25 = 25% failure rate (>= 20% threshold)
      expect(urgentItems[0].fail_rate_1m).toBe(0.25);
    });

    it('should not return items with failure rate below 20%', () => {
      const dataWithLowRate = [{
        ...mockData[0],
        dataset_name: 'Low Rate Dataset',
        fail_rate_1m: 0.15 // 15% failure rate (< 20% threshold)
      }];
      
      const urgentItems = getUrgentAttentionItems(dataWithLowRate);
      
      expect(urgentItems).toHaveLength(0);
    });

    it('should return items with exactly 20% failure rate', () => {
      const dataWithExactThreshold = [{
        ...mockData[0],
        dataset_name: 'Threshold Dataset',
        fail_rate_1m: 0.2 // Exactly 20% failure rate
      }];
      
      const urgentItems = getUrgentAttentionItems(dataWithExactThreshold);
      
      expect(urgentItems).toHaveLength(1);
      expect(urgentItems[0].dataset_name).toBe('Threshold Dataset');
      expect(urgentItems[0].fail_rate_1m).toBe(0.2);
    });

    it('should sort by fail_rate_1m in descending order', () => {
      const dataWithMultipleUrgent = [
        {
          ...mockData[0],
          dataset_name: 'High Priority Dataset',
          fail_rate_1m: 0.6 // 60% failure rate
        },
        {
          ...mockData[0],
          dataset_name: 'Medium Priority Dataset',
          fail_rate_1m: 0.3 // 30% failure rate
        }
      ];
      
      const urgentItems = getUrgentAttentionItems(dataWithMultipleUrgent);
      
      expect(urgentItems[0].fail_rate_1m).toBe(0.6);
      expect(urgentItems[0].dataset_name).toBe('High Priority Dataset');
      expect(urgentItems[1].fail_rate_1m).toBe(0.3);
      expect(urgentItems[1].dataset_name).toBe('Medium Priority Dataset');
    });

    it('should handle empty data array', () => {
      const urgentItems = getUrgentAttentionItems([]);
      expect(urgentItems).toEqual([]);
    });
  });

  describe('filterData', () => {
    it('should filter by string array filters', () => {
      const filters = { source: ['TEST_SYSTEM'] };
      const result = filterData(mockData, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('TEST_SYSTEM');
    });

    it('should filter by multiple criteria', () => {
      const filters = { 
        source: ['TEST_SYSTEM'], 
        trend_flag: ['down'] 
      };
      const result = filterData(mockData, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('TEST_SYSTEM');
      expect(result[0].trend_flag).toBe('down');
    });


    it('should return all data when no filters applied', () => {
      const result = filterData(mockData, {});
      expect(result).toHaveLength(2);
    });

    it('should return all data when empty filter arrays', () => {
      const filters = { source: [] };
      const result = filterData(mockData, filters);
      expect(result).toHaveLength(2);
    });
  });

  describe('getUniqueValues', () => {
    it('should return unique values for a field', () => {
      const result = getUniqueValues(mockData, 'source');
      expect(result).toEqual(['TEST_SYSTEM', 'TEST_SYSTEM_2']);
    });

    it('should return sorted unique values', () => {
      const result = getUniqueValues(mockData, 'trend_flag');
      expect(result).toEqual(['down', 'up']);
    });

    it('should handle empty data array', () => {
      const result = getUniqueValues([], 'source');
      expect(result).toEqual([]);
    });
  });
});