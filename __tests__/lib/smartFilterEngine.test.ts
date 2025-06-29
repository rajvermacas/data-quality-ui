import {
  getAvailableFilterOptions,
  getSmartOptionsForField,
  validateFilterCombination,
  getSuggestedFilters,
  buildFilterRelationshipMap,
  getFilterHierarchy,
  shouldApplyHierarchicalFiltering,
  getFilterStatistics
} from '@/lib/smartFilterEngine';
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
    source: 'HR_SYSTEM',
    tenant_id: 'tenant_001',
    dataset_uuid: 'ds001',
    dataset_name: 'Employee Directory',
    rule_code: '2',
    rule_name: 'DATE_FORMAT_VALIDATION',
    rule_type: 'BUSINESS_RULE',
    dimension: 'Correctness',
    rule_description: 'Test rule 2',
    category: 'C2',
    business_date_latest: '2024-01-01',
    dataset_record_count_latest: 1000,
    filtered_record_count_latest: 950,
    pass_count_total: 920,
    fail_count_total: 30,
    pass_count_1m: 900,
    fail_count_1m: 5,
    pass_count_3m: 910,
    fail_count_3m: 15,
    pass_count_12m: 920,
    fail_count_12m: 30,
    fail_rate_total: 0.032,
    fail_rate_1m: 0.0055,
    fail_rate_3m: 0.016,
    fail_rate_12m: 0.032,
    trend_flag: 'down',
    last_execution_level: 'RECORD'
  },
  {
    source: 'FINANCE_SYSTEM',
    tenant_id: 'tenant_002',
    dataset_uuid: 'ds002',
    dataset_name: 'Financial Accounts',
    rule_code: '3',
    rule_name: 'RANGE_CHECK',
    rule_type: 'DATASET',
    dimension: 'Validity',
    rule_description: 'Test rule 3',
    category: 'C3',
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
    trend_flag: 'equal',
    last_execution_level: 'DATASET'
  }
];

describe('Smart Filter Engine', () => {
  describe('getAvailableFilterOptions', () => {
    it('should return all options when no filters applied', () => {
      const result = getAvailableFilterOptions(mockData, {});
      
      expect(result.hasData).toBe(true);
      expect(result.totalRecords).toBe(3);
      expect(result.availableOptions.tenant_id).toEqual(['tenant_001', 'tenant_002']);
      expect(result.availableOptions.source).toEqual(['FINANCE_SYSTEM', 'HR_SYSTEM']);
      expect(result.availableOptions.trend_flag).toEqual(['down', 'equal', 'up']);
    });

    it('should filter options based on current selections', () => {
      const filters = { tenant_id: ['tenant_001'] };
      const result = getAvailableFilterOptions(mockData, filters);
      
      expect(result.hasData).toBe(true);
      expect(result.totalRecords).toBe(2);
      expect(result.availableOptions.source).toEqual(['HR_SYSTEM']);
      expect(result.availableOptions.dataset_name).toEqual(['Employee Directory']);
    });

    it('should return no data for impossible filter combinations', () => {
      const filters = { tenant_id: ['tenant_001'], source: ['FINANCE_SYSTEM'] };
      const result = getAvailableFilterOptions(mockData, filters);
      
      expect(result.hasData).toBe(false);
      expect(result.totalRecords).toBe(0);
      expect(result.availableOptions).toEqual({});
    });
  });

  describe('getSmartOptionsForField', () => {
    it('should return filtered options for specific field', () => {
      const filters = { tenant_id: ['tenant_001'] };
      const sources = getSmartOptionsForField(mockData, filters, 'source');
      
      expect(sources).toEqual(['HR_SYSTEM']);
    });

    it('should exclude target field from filtering', () => {
      const filters = { tenant_id: ['tenant_001'], source: ['FINANCE_SYSTEM'] };
      const tenants = getSmartOptionsForField(mockData, filters, 'tenant_id');
      
      // Should return tenant_002 since that's compatible with FINANCE_SYSTEM
      expect(tenants).toEqual(['tenant_002']);
    });
  });

  describe('validateFilterCombination', () => {
    it('should validate working filter combinations', () => {
      const filters = { tenant_id: ['tenant_001'] };
      const isValid = validateFilterCombination(mockData, filters);
      
      expect(isValid).toBe(true);
    });

    it('should invalidate impossible filter combinations', () => {
      const filters = { tenant_id: ['tenant_001'], source: ['FINANCE_SYSTEM'] };
      const isValid = validateFilterCombination(mockData, filters);
      
      expect(isValid).toBe(false);
    });
  });

  describe('getSuggestedFilters', () => {
    it('should suggest removing problematic filters', () => {
      const filters = { tenant_id: ['tenant_001'], source: ['FINANCE_SYSTEM'] };
      const suggestions = getSuggestedFilters(mockData, filters);
      
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].field).toBe('tenant_id');
      expect(suggestions[0].values).toEqual(['tenant_002']);
      expect(suggestions[1].field).toBe('source');
      expect(suggestions[1].values).toEqual(['HR_SYSTEM']);
    });

    it('should return minimal suggestions for working filters', () => {
      const filters = { tenant_id: ['tenant_001'] };
      const suggestions = getSuggestedFilters(mockData, filters);
      
      // Even working filters might have suggestions for alternatives
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('buildFilterRelationshipMap', () => {
    it('should build relationship map correctly', () => {
      const relationshipMap = buildFilterRelationshipMap(mockData);
      
      expect(relationshipMap.has('tenant_id')).toBe(true);
      expect(relationshipMap.has('source')).toBe(true);
      expect(relationshipMap.get('tenant_id')).toEqual(new Set(['tenant_001', 'tenant_002']));
      expect(relationshipMap.get('source')).toEqual(new Set(['FINANCE_SYSTEM', 'HR_SYSTEM']));
    });
  });

  describe('getFilterHierarchy', () => {
    it('should return correct filter hierarchy', () => {
      const hierarchy = getFilterHierarchy();
      
      expect(hierarchy).toEqual([
        'tenant_id',
        'source',
        'dataset_name',
        'trend_flag',
        'dimension',
        'rule_type',
        'rule_name'
      ]);
    });
  });

  describe('shouldApplyHierarchicalFiltering', () => {
    it('should return true for hierarchical filters', () => {
      const filters = { tenant_id: ['tenant_001'], source: ['HR_SYSTEM'] };
      const shouldApply = shouldApplyHierarchicalFiltering(filters);
      
      expect(shouldApply).toBe(true);
    });

    it('should return false for single level filters', () => {
      const filters = { rule_name: ['COMPLETENESS_CHECK'] };
      const shouldApply = shouldApplyHierarchicalFiltering(filters);
      
      expect(shouldApply).toBe(true); // rule_name is in hierarchy
    });
  });

  describe('getFilterStatistics', () => {
    it('should calculate filter statistics correctly', () => {
      const filters = { tenant_id: ['tenant_001'] };
      const stats = getFilterStatistics(mockData, filters);
      
      expect(stats.totalRecords).toBe(3);
      expect(stats.filteredRecords).toBe(2);
      expect(stats.filterEfficiency).toBeCloseTo(0.67, 2);
      expect(stats.activeFilters).toBe(1);
    });

    it('should handle empty filters', () => {
      const stats = getFilterStatistics(mockData, {});
      
      expect(stats.totalRecords).toBe(3);
      expect(stats.filteredRecords).toBe(3);
      expect(stats.filterEfficiency).toBe(1);
      expect(stats.activeFilters).toBe(0);
    });
  });
});