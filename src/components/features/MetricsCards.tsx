import { DashboardMetrics } from '@/types';

interface MetricsCardsProps {
  metrics: DashboardMetrics;
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards = [
    {
      title: 'Total Datasets',
      value: metrics.totalDatasets.toLocaleString(),
      icon: '📊',
      color: 'blue'
    },
    {
      title: 'Urgent Attention',
      value: metrics.urgentAttentionCount.toLocaleString(),
      icon: '🚨',
      color: 'red'
    },
    {
      title: 'Trending Down',
      value: metrics.trendingDown.toLocaleString(),
      icon: '📉',
      color: 'red'
    },
    {
      title: 'Trending Up',
      value: metrics.trendingUp.toLocaleString(),
      icon: '📈',
      color: 'green'
    },
    {
      title: 'Stable',
      value: metrics.stable.toLocaleString(),
      icon: '➡️',
      color: 'yellow'
    },
    {
      title: 'Avg Failure Rate',
      value: `${(metrics.averageFailRate * 100).toFixed(1)}%`,
      icon: '📋',
      color: 'gray'
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'green':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'yellow':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'blue':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`p-4 rounded-lg border ${getColorClasses(card.color)}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">{card.title}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </div>
            <div className="text-2xl">{card.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}