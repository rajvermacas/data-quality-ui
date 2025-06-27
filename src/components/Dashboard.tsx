'use client';

import { useEffect, useState } from 'react';
import { DataQualityRecord, DashboardMetrics, UrgentAttentionItem } from '@/types';
import { processCSVData, calculateDashboardMetrics, getUrgentAttentionItems } from '@/lib/dataProcessor';
import { MetricsCards } from '@/components/features/MetricsCards';
import { UrgentAttentionWidget } from '@/components/features/UrgentAttentionWidget';
import { TrendChart } from '@/components/features/TrendChart';
import { FilterPanel } from '@/components/features/FilterPanel';

interface DashboardState {
  data: DataQualityRecord[];
  metrics: DashboardMetrics;
  urgentItems: UrgentAttentionItem[];
  loading: boolean;
  error: string | null;
}

export function Dashboard() {
  const [state, setState] = useState<DashboardState>({
    data: [],
    metrics: {
      totalDatasets: 0,
      urgentAttentionCount: 0,
      averageFailRate: 0,
      trendingDown: 0,
      trendingUp: 0,
      stable: 0
    },
    urgentItems: [],
    loading: true,
    error: null
  });

  const [filters, setFilters] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/resources/artifacts/full_summary.csv');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const csvText = await response.text();
      const parsedData = processCSVData(csvText);
      const metrics = calculateDashboardMetrics(parsedData);
      const urgentItems = getUrgentAttentionItems(parsedData);

      setState({
        data: parsedData,
        metrics,
        urgentItems,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Error loading dashboard data'
      }));
    }
  };

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-red-600">{state.error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Data Quality Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and analyze data quality metrics across systems</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Metrics Overview */}
          <MetricsCards metrics={state.metrics} />

          {/* Urgent Attention Widget */}
          <UrgentAttentionWidget items={state.urgentItems} />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filter Panel */}
            <div className="lg:col-span-1">
              <FilterPanel
                data={state.data}
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>

            {/* Main Visualization Area */}
            <div className="lg:col-span-3">
              <TrendChart data={state.data} filters={filters} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}