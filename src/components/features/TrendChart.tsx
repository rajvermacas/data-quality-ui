import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DataQualityRecord } from '@/types';
import { filterData } from '@/lib/dataProcessor';

interface TrendChartProps {
  data: DataQualityRecord[];
  filters: Record<string, string[]>;
}

export function TrendChart({ data, filters }: TrendChartProps) {
  const chartData = useMemo(() => {
    const filteredData = filterData(data, filters);
    
    // Aggregate data by dataset for trend comparison
    const aggregated = filteredData.reduce((acc, record) => {
      const key = `${record.dataset_name} (${record.source})`;
      if (!acc[key]) {
        acc[key] = {
          dataset: key,
          fail_rate_1m: 0,
          fail_rate_3m: 0,
          fail_rate_12m: 0,
          count: 0
        };
      }
      
      acc[key].fail_rate_1m += record.fail_rate_1m;
      acc[key].fail_rate_3m += record.fail_rate_3m;
      acc[key].fail_rate_12m += record.fail_rate_12m;
      acc[key].count += 1;
      
      return acc;
    }, {} as Record<string, any>);

    // Get top datasets by average failure rate
    const datasets = Object.values(aggregated)
      .map((item: any) => ({
        dataset: item.dataset,
        avgFailRate: ((item.fail_rate_1m + item.fail_rate_3m + item.fail_rate_12m) / (item.count * 3)),
        fail_rate_1m: (item.fail_rate_1m / item.count * 100),
        fail_rate_3m: (item.fail_rate_3m / item.count * 100),
        fail_rate_12m: (item.fail_rate_12m / item.count * 100)
      }))
      .sort((a, b) => b.avgFailRate - a.avgFailRate)
      .slice(0, 10); // Limit to top 10 for readability

    // Convert to time-series format with chronological order (12M → 3M → 1M)
    const timeSeriesData = [
      {
        period: '12 Months',
        ...datasets.reduce((acc, dataset) => {
          acc[dataset.dataset] = dataset.fail_rate_12m;
          return acc;
        }, {} as Record<string, number>)
      },
      {
        period: '3 Months',
        ...datasets.reduce((acc, dataset) => {
          acc[dataset.dataset] = dataset.fail_rate_3m;
          return acc;
        }, {} as Record<string, number>)
      },
      {
        period: '1 Month',
        ...datasets.reduce((acc, dataset) => {
          acc[dataset.dataset] = dataset.fail_rate_1m;
          return acc;
        }, {} as Record<string, number>)
      }
    ];

    return { timeSeriesData, datasets };
  }, [data, filters]);

  const exportData = () => {
    const csvContent = [
      ['Dataset', '12M Failure Rate (%)', '3M Failure Rate (%)', '1M Failure Rate (%)'],
      ...chartData.datasets.map(dataset => [
        dataset.dataset,
        dataset.fail_rate_12m.toFixed(2),
        dataset.fail_rate_3m.toFixed(2),
        dataset.fail_rate_1m.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dataset-failure-rate-trends.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Dataset Failure Rate Trends Over Time</h3>
          <p className="text-sm text-gray-600 mt-1">
            Progression from 12 months to current month
          </p>
        </div>
        <button
          onClick={exportData}
          className="btn-secondary text-sm"
        >
          Export CSV
        </button>
      </div>

      {chartData.datasets.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p>No data available for current filters</p>
          </div>
        </div>
      ) : (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.timeSeriesData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                fontSize={12}
              />
              <YAxis 
                label={{ value: 'Failure Rate (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
                labelStyle={{ fontSize: 12 }}
              />
              <Legend />
              {chartData.datasets.map((dataset, index) => {
                const colors = [
                  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
                  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
                ];
                const color = colors[index % colors.length];
                
                return (
                  <Line 
                    key={dataset.dataset}
                    type="monotone" 
                    dataKey={dataset.dataset}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ fill: color, strokeWidth: 2, r: 4 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-500">
        Showing {chartData.datasets.length} datasets. Use filters to refine the view.
      </div>
    </div>
  );
}