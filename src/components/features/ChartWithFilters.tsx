'use client';

import React, { ReactElement, cloneElement } from 'react';
import { FilterPanel } from './FilterPanel';
import { DataQualityRecord, FilterState } from '@/types';

interface ChartWithFiltersProps {
  data: DataQualityRecord[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  children: ReactElement<any>;
}

export function ChartWithFilters({
  data,
  filters,
  onFiltersChange,
  children
}: ChartWithFiltersProps) {
  // Clone the chart component and inject the FilterPanel as a prop
  const chartWithFilters = cloneElement(children, {
    ...children.props,
    filters,
    filterPanel: (
      <FilterPanel
        data={data}
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
    )
  });

  return chartWithFilters;
}