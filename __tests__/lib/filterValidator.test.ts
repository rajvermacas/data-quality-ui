import {
  validateFilterCombination,
  isFilterValueCompatible,
  getMinimalViableFilters,
  predictFilterImpact
} from '@/lib/filterValidator';
import { DataQualityRecord } from '@/types';

// Mock data for testing
const mockData: DataQualityRecord[] = [
  {
    source: 'HR_SYSTEM',
    tenant_id: 'tenant_001',
    dataset_uuid: 'ds001',
    dataset_name: 'Employee Directory',
    rule_code: '1',
    rule_name: 'COMPLETENESS_CHECK',
    rule_type: 'ATTRIBUTE',
    dimension: 'Completeness',
    rule_description: 'Test rule',
    category: 'C1',
    business_date_latest: '2024-01-01',
    dataset_record_count_latest: 1000,
    filtered_record_count_latest: 950,
    pass_count_total: 900,
    fail_count_total: 50,
    pass_count_1m: 800,
    fail_count_1m: 10,
    pass_count_3m: 850,
    fail_count_3m: 25,
    pass_count_12m: 900,
    fail_count_12m: 50,
    fail_rate_total: 0.05,
    fail_rate_1m: 0.012,
    fail_rate_3m: 0.028,
    fail_rate_12m: 0.053,
    trend_flag: 'up',
    last_execution_level: 'ATTRIBUTE'
  },
  {
    source: 'FINANCE_SYSTEM',
    tenant_id: 'tenant_002',
    dataset_uuid: 'ds002',
    dataset_name: 'Financial Accounts',
    rule_code: '2',
    rule_name: 'RANGE_CHECK',
    rule_type: 'BUSINESS_RULE',
    dimension: 'Validity',
    rule_description: 'Test rule 2',
    category: 'C2',
    business_date_latest: '2024-01-01',
    dataset_record_count_latest: 2000,
    filtered_record_count_latest: 1800,
    pass_count_total: 1700,
    fail_count_total: 100,
    pass_count_1m: 1600,
    fail_count_1m: 20,
    pass_count_3m: 1650,
    fail_count_3m: 50,
    pass_count_12m: 1700,
    fail_count_12m: 100,
    fail_rate_total: 0.056,
    fail_rate_1m: 0.012,
    fail_rate_3m: 0.029,
    fail_rate_12m: 0.056,
    trend_flag: 'down',
    last_execution_level: 'RECORD'
  }
];

describe('Filter Validator', () => {
  describe('validateFilterCombination', () => {
    it('should validate working filter combinations', () => {
      const filters = { tenant_id: ['tenant_001'] };
      const result = validateFilterCombination(mockData, filters);
      
      expect(result.isValid).toBe(true);
      expect(result.hasData).toBe(true);
      expect(result.recordCount).toBe(1);
      expect(result.suggestions).toBeUndefined();
      expect(result.warnings).toBeDefined(); // Warnings are always generated
    });

    it('should provide suggestions for invalid combinations', () => {
      const filters = { tenant_id: ['tenant_001'], source: ['FINANCE_SYSTEM'] };
      const result = validateFilterCombination(mockData, filters);
      
      expect(result.isValid).toBe(false);
      expect(result.hasData).toBe(false);
      expect(result.recordCount).toBe(0);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it('should generate warnings for problematic filter patterns', () => {
      const manyFilters = {
        tenant_id: ['tenant_001', 'tenant_002'],
        source: ['HR_SYSTEM', 'FINANCE_SYSTEM'],
        dataset_name: ['Employee Directory', 'Financial Accounts'],
        rule_type: ['ATTRIBUTE', 'BUSINESS_RULE'],
        trend_flag: ['up', 'down', 'equal']
      };
      
      const result = validateFilterCombination(mockData, manyFilters);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });
  });

  describe('isFilterValueCompatible', () => {
    it('should check if filter value is compatible', () => {
      const currentFilters = { tenant_id: ['tenant_001'] };
      const isCompatible = isFilterValueCompatible(
        mockData,
        currentFilters,
        'source',
        'HR_SYSTEM'
      );
      
      expect(isCompatible).toBe(true);
    });

    it('should return false for incompatible combinations', () => {
      const currentFilters = { tenant_id: ['tenant_001'] };
      const isCompatible = isFilterValueCompatible(
        mockData,
        currentFilters,
        'source',
        'FINANCE_SYSTEM'
      );
      
      expect(isCompatible).toBe(false);
    });
  });

  describe('getMinimalViableFilters', () => {
    it('should return original filters if they work', () => {
      const filters = { tenant_id: ['tenant_001'] };
      const minimal = getMinimalViableFilters(mockData, filters);
      
      expect(minimal).toEqual(filters);
    });

    it('should reduce filters to minimal working set', () => {
      const filters = { 
        tenant_id: ['tenant_001'], 
        source: ['FINANCE_SYSTEM'] // This combination doesn't work
      };
      const minimal = getMinimalViableFilters(mockData, filters);
      
      // Should return a subset that works
      expect(Object.keys(minimal).length).toBeLessThan(Object.keys(filters).length);
    });

    it('should return empty filters if nothing works', () => {
      const filters = { 
        tenant_id: ['nonexistent_tenant'],
        source: ['NONEXISTENT_SYSTEM']
      };
      const minimal = getMinimalViableFilters(mockData, filters);
      
      expect(minimal).toEqual({});
    });
  });

  describe('predictFilterImpact', () => {
    it('should predict negative impact for restrictive filters', () => {
      const currentFilters = {};
      const impact = predictFilterImpact(
        mockData,
        currentFilters,
        'tenant_id',
        'tenant_001'
      );
      
      expect(impact.currentRecords).toBe(2);
      expect(impact.predictedRecords).toBe(1);
      expect(impact.impact).toBe('negative');
      expect(impact.impactPercentage).toBe(-50);
    });

    it('should predict neutral impact for compatible filters', () => {
      const currentFilters = { tenant_id: ['tenant_001'] };
      const impact = predictFilterImpact(
        mockData,
        currentFilters,
        'source',
        'HR_SYSTEM'
      );
      
      expect(impact.currentRecords).toBe(1);
      expect(impact.predictedRecords).toBe(1);
      expect(impact.impact).toBe('neutral');
      expect(impact.impactPercentage).toBe(0);
    });

    it('should handle empty current data', () => {
      const currentFilters = { tenant_id: ['nonexistent'] };
      const impact = predictFilterImpact(
        mockData,
        currentFilters,
        'source',
        'HR_SYSTEM'
      );
      
      expect(impact.currentRecords).toBe(0);
      expect(impact.predictedRecords).toBe(0);
      expect(impact.impactPercentage).toBe(0);
    });
  });
});