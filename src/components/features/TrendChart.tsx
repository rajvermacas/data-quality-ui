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

    // Calculate averages and convert to chart format
    return Object.values(aggregated)
      .map((item: any) => ({
        dataset: item.dataset,
        '1 Month': (item.fail_rate_1m / item.count * 100).toFixed(2),
        '3 Months': (item.fail_rate_3m / item.count * 100).toFixed(2),
        '12 Months': (item.fail_rate_12m / item.count * 100).toFixed(2)
      }))
      .slice(0, 10); // Limit to top 10 for readability
  }, [data, filters]);

  const exportData = () => {
    const filteredData = filterData(data, filters);
    const csvContent = [
      ['Dataset', 'Source', 'Dimension', '1M Failure Rate', '3M Failure Rate', '12M Failure Rate', 'Trend'],
      ...filteredData.map(record => [
        record.dataset_name,
        record.source,
        record.dimension,
        (record.fail_rate_1m * 100).toFixed(2) + '%',
        (record.fail_rate_3m * 100).toFixed(2) + '%',
        (record.fail_rate_12m * 100).toFixed(2) + '%',
        record.trend_flag
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data-quality-trends.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Comparative Trend Analysis</h3>
          <p className="text-sm text-gray-600 mt-1">
            Failure rates across 1 month, 3 months, and 12 months
          </p>
        </div>
        <button
          onClick={exportData}
          className="btn-secondary text-sm"
        >
          Export CSV
        </button>
      </div>

      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p>No data available for current filters</p>
          </div>
        </div>
      ) : (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="dataset" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                fontSize={12}
              />
              <YAxis 
                label={{ value: 'Failure Rate (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: string) => [`${value}%`, '']}
                labelStyle={{ fontSize: 12 }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="1 Month" 
                stroke="#EF4444" 
                strokeWidth={2}
                dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="3 Months" 
                stroke="#F59E0B" 
                strokeWidth={2}
                dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="12 Months" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-500">
        Showing {chartData.length} datasets. Use filters to refine the view.
      </div>
    </div>
  );
}