import React, { useMemo, ReactNode } from 'react';
import { DataQualityRecord, FilterState } from '../../types';
import { filterData } from '../../lib/dataProcessor';
import { ChartContainer } from '../ui/ChartContainer';

interface SystemHealthMatrixProps {
  data: DataQualityRecord[];
  filters: FilterState;
  filterPanel?: ReactNode;
}

interface HealthMetric {
  system: string;
  dimension: string;
  healthScore: number;
  failRate: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

export const SystemHealthMatrix: React.FC<SystemHealthMatrixProps> = ({ data, filters, filterPanel }) => {
  const healthMatrix = useMemo(() => {
    const filteredData = filterData(data, filters);
    
    if (filteredData.length === 0) {
      return [];
    }

    const grouped = filteredData.reduce((acc, record) => {
      const key = `${record.source}-${record.dimension}`;
      if (!acc[key]) {
        acc[key] = {
          system: record.source,
          dimension: record.dimension,
          totalFail: 0,
          totalPass: 0,
          count: 0
        };
      }
      acc[key].totalFail += record.fail_count_1m;
      acc[key].totalPass += record.pass_count_1m;
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).map((item: any) => {
      const failRate = item.totalFail / (item.totalFail + item.totalPass);
      const healthScore = Math.round((1 - failRate) * 100);
      
      let status: 'excellent' | 'good' | 'warning' | 'critical';
      if (healthScore >= 95) status = 'excellent';
      else if (healthScore >= 85) status = 'good';
      else if (healthScore >= 70) status = 'warning';
      else status = 'critical';

      return {
        system: item.system,
        dimension: item.dimension,
        healthScore,
        failRate,
        status
      };
    }) as HealthMetric[];
  }, [data, filters]);

  const systems = useMemo(() => 
    Array.from(new Set(healthMatrix.map(item => item.system))).sort(),
    [healthMatrix]
  );

  const dimensions = useMemo(() => 
    Array.from(new Set(healthMatrix.map(item => item.dimension))).sort(),
    [healthMatrix]
  );

  const getHealthMetric = (system: string, dimension: string): HealthMetric | null => {
    return healthMatrix.find(item => item.system === system && item.dimension === dimension) || null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-500 text-white';
      case 'good': return 'bg-green-300 text-gray-800';
      case 'warning': return 'bg-yellow-300 text-gray-800';
      case 'critical': return 'bg-red-500 text-white';
      default: return 'bg-gray-100 text-gray-400';
    }
  };

  return (
    <ChartContainer
      title="System Health Matrix"
      description="Overall health status of systems vs quality dimensions"
      filters={filterPanel}
    >
      {healthMatrix.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No data available
        </div>
      ) : (
        <div className="overflow-auto max-h-[600px] h-full">
          <div className="min-w-full">
            {/* Legend */}
            <div className="mb-4 flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Health Status:</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-xs text-gray-600">Excellent (95%+)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-300 rounded"></div>
                  <span className="text-xs text-gray-600">Good (85%+)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-yellow-300 rounded"></div>
                  <span className="text-xs text-gray-600">Warning (70%+)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-xs text-gray-600">Critical (&lt;70%)</span>
                </div>
              </div>
            </div>

            {/* Matrix Grid */}
            <div className="grid gap-2" style={{ gridTemplateColumns: `150px repeat(${dimensions.length}, 120px)` }}>
              {/* Header row */}
              <div className="font-medium text-gray-900 text-center p-2">System</div>
              {dimensions.map(dimension => (
                <div key={dimension} className="text-sm font-medium text-gray-700 text-center p-2 border-b">
                  {dimension}
                </div>
              ))}

              {/* Data rows */}
              {systems.map(system => (
                <React.Fragment key={system}>
                  <div className="text-sm font-medium text-gray-900 p-2 truncate border-r">
                    {system}
                  </div>
                  {dimensions.map(dimension => {
                    const metric = getHealthMetric(system, dimension);
                    return (
                      <div
                        key={`${system}-${dimension}`}
                        data-testid={`health-cell-${system}-${dimension}`}
                        className={`h-16 border rounded flex flex-col items-center justify-center hover:shadow-md transition-shadow cursor-pointer ${
                          metric ? getStatusColor(metric.status) : 'bg-gray-100 text-gray-400'
                        }`}
                        title={metric 
                          ? `${system} - ${dimension}: ${metric.healthScore}% health (${(metric.failRate * 100).toFixed(1)}% failure rate)`
                          : `No data for ${system} - ${dimension}`
                        }
                      >
                        {metric ? (
                          <>
                            <span className="text-sm font-bold">
                              {metric.healthScore}%
                            </span>
                            <span className="text-xs opacity-75">
                              {metric.status}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs">N/A</span>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 text-xs text-gray-500">
              Showing health scores for {systems.length} systems across {dimensions.length} dimensions
            </div>
          </div>
        </div>
      )}
    </ChartContainer>
  );
};