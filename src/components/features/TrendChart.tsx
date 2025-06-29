import { useMemo, ReactNode } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DataQualityRecord, FilterState, IntervalFilter } from '@/types';
import { filterData, getFailureRateForInterval } from '@/lib/dataProcessor';
import { ChartContainer } from '@/components/ui/ChartContainer';

// Utility function to create shorter, cleaner system names
function createShortSystemName(source: string): string {
  // Remove common suffixes and prefixes
  let cleaned = source
    .replace(/_SYSTEM$/, '')
    .replace(/_SERVICE$/, '')
    .replace(/^PROD_/, '')
    .replace(/^DEV_/, '')
    .replace(/^TEST_/, '');
  
  // Convert to title case and handle common abbreviations
  const words = cleaned.split('_');
  const titleCase = words.map(word => {
    // Keep common abbreviations uppercase
    if (['HR', 'ERP', 'CRM', 'WMS', 'QMS'].includes(word)) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
  
  // Truncate if still too long
  return titleCase.length > 15 ? titleCase.substring(0, 15) + '...' : titleCase;
}

// Custom Legend component with two-column layout
interface CustomLegendProps {
  datasets: Array<{ dataset: string }>;
  colors: string[];
}

function CustomLegend({ datasets, colors }: CustomLegendProps) {
  return (
    <div className="mt-1 px-4">
      <div 
        className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs"
        style={{ gridAutoFlow: 'column', gridTemplateRows: 'repeat(5, 1fr)' }}
      >
        {datasets.map((dataset, index) => {
          const color = colors[index % colors.length];
          return (
            <div key={dataset.dataset} className="flex items-center space-x-3 hover:bg-gray-50 p-1 rounded transition-colors">
              <div 
                className="w-4 h-0.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-700 truncate font-medium" title={dataset.dataset}>
                {dataset.dataset}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TrendChartProps {
  data: DataQualityRecord[];
  filters: FilterState;
  filterPanel?: ReactNode;
}

export function TrendChart({ data, filters, filterPanel }: TrendChartProps) {
  // Define colors array to be shared between chart and legend
  const colors = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  // Check if trend filter is active
  const trendFilter = filters.trend_flag?.[0];
  const getTrendDisplayText = (trend: string) => {
    switch (trend) {
      case 'down': return 'Trending Down';
      case 'up': return 'Trending Up';
      case 'equal': return 'Stable';
      default: return '';
    }
  };

  const chartData = useMemo(() => {
    const filteredData = filterData(data, filters);
    const intervalFilter = filters.interval || 'all';
    
    // Aggregate data by dataset for trend comparison
    const aggregated = filteredData.reduce((acc, record) => {
      const shortSystemName = createShortSystemName(record.source);
      const key = `${record.dataset_name} (${shortSystemName})`;
      if (!acc[key]) {
        acc[key] = {
          dataset: key,
          fail_rate_1m: 0,
          fail_rate_3m: 0,
          fail_rate_12m: 0,
          fail_rate_total: 0,
          count: 0
        };
      }
      
      acc[key].fail_rate_1m += record.fail_rate_1m;
      acc[key].fail_rate_3m += record.fail_rate_3m;
      acc[key].fail_rate_12m += record.fail_rate_12m;
      acc[key].fail_rate_total += record.fail_rate_total;
      acc[key].count += 1;
      
      return acc;
    }, {} as Record<string, any>);

    // Get top datasets by average failure rate (using selected interval for sorting)
    const datasets = Object.values(aggregated)
      .map((item: any) => ({
        dataset: item.dataset,
        avgFailRate: intervalFilter === 'all' 
          ? ((item.fail_rate_1m + item.fail_rate_3m + item.fail_rate_12m) / (item.count * 3))
          : getFailureRateForInterval({
              fail_rate_1m: item.fail_rate_1m / item.count,
              fail_rate_3m: item.fail_rate_3m / item.count,
              fail_rate_12m: item.fail_rate_12m / item.count,
              fail_rate_total: item.fail_rate_total / item.count,
            } as DataQualityRecord, intervalFilter),
        fail_rate_1m: (item.fail_rate_1m / item.count * 100),
        fail_rate_3m: (item.fail_rate_3m / item.count * 100),
        fail_rate_12m: (item.fail_rate_12m / item.count * 100),
        fail_rate_total: (item.fail_rate_total / item.count * 100)
      }))
      .sort((a, b) => b.avgFailRate - a.avgFailRate)
      .slice(0, 10); // Limit to top 10 for readability

    // If specific interval is selected, show only that time period
    if (intervalFilter !== 'all') {
      const timeSeriesData = [
        {
          period: intervalFilter === '1m' ? '1 Month' : intervalFilter === '3m' ? '3 Months' : '12 Months',
          ...datasets.reduce((acc, dataset) => {
            const rate = intervalFilter === '1m' ? dataset.fail_rate_1m : 
                        intervalFilter === '3m' ? dataset.fail_rate_3m : dataset.fail_rate_12m;
            acc[dataset.dataset] = rate;
            return acc;
          }, {} as Record<string, number>)
        }
      ];
      return { timeSeriesData, datasets };
    }

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

  const intervalFilter = filters.interval || 'all';
  const getIntervalDisplayText = (interval: IntervalFilter) => {
    switch (interval) {
      case '1m': return 'Last 1 Month';
      case '3m': return 'Last 3 Months';
      case '12m': return 'Last 12 Months';
      case 'all': return 'All Time Periods';
      default: return 'All Time Periods';
    }
  };

  const chartTitle = (() => {
    let title = "Dataset Failure Rate Trends";
    if (intervalFilter !== 'all') {
      title += ` - ${getIntervalDisplayText(intervalFilter)}`;
    }
    if (trendFilter) {
      title += ` - ${getTrendDisplayText(trendFilter)}`;
    }
    return title;
  })();
  
  const chartDescription = (() => {
    let desc = intervalFilter === 'all' 
      ? "Progression from 12 months to current month"
      : `Failure rates for ${getIntervalDisplayText(intervalFilter).toLowerCase()}`;
    
    if (trendFilter) {
      desc += `, showing datasets that are ${getTrendDisplayText(trendFilter).toLowerCase()}`;
    }
    return desc;
  })();

  return (
    <ChartContainer
      title={chartTitle}
      description={chartDescription}
      filters={filterPanel}
      actions={
        <div className="flex items-center gap-2">
          {intervalFilter !== 'all' && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
              Interval: {getIntervalDisplayText(intervalFilter)}
            </span>
          )}
          {trendFilter && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
              Trend: {getTrendDisplayText(trendFilter)}
            </span>
          )}
          <button
            onClick={exportData}
            className="btn-secondary text-sm"
          >
            Export CSV
          </button>
        </div>
      }
    >
      {chartData.datasets.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p>No data available for current filters</p>
          </div>
        </div>
      ) : (
        <>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.timeSeriesData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  fontSize={12}
                />
                <YAxis 
                  label={{ 
                    value: 'Failure Rate (%)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { 
                      textAnchor: 'middle',
                      fontSize: '12px',
                      fontWeight: '600',
                      fill: '#374151'
                    }
                  }}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
                  labelStyle={{ fontSize: 12 }}
                />
                {chartData.datasets.map((dataset, index) => {
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
          <CustomLegend datasets={chartData.datasets} colors={colors} />
          <div className="mt-4 text-xs text-gray-500">
            Showing {chartData.datasets.length} datasets. Use filters to refine the view.
          </div>
        </>
      )}
    </ChartContainer>
  );
}