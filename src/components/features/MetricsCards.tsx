import { DashboardMetrics } from '@/types';

interface MetricsCardsProps {
  metrics: DashboardMetrics;
  onTrendClick?: (trend: 'down' | 'up' | 'equal') => void;
}

export function MetricsCards({ metrics, onTrendClick }: MetricsCardsProps) {
  const cards = [
    {
      title: 'Total Datasets',
      value: metrics.totalDatasets.toLocaleString(),
      icon: '📊',
      color: 'blue',
      clickable: false
    },
    {
      title: 'Urgent Attention',
      value: metrics.urgentAttentionCount.toLocaleString(),
      icon: '🚨',
      color: 'red',
      clickable: false
    },
    {
      title: 'Trending Down',
      value: metrics.trendingDown.toLocaleString(),
      icon: '📉',
      color: 'green',
      clickable: true,
      trend: 'down' as const
    },
    {
      title: 'Trending Up',
      value: metrics.trendingUp.toLocaleString(),
      icon: '📈',
      color: 'red',
      clickable: true,
      trend: 'up' as const
    },
    {
      title: 'Stable',
      value: metrics.stable.toLocaleString(),
      icon: '➡️',
      color: 'yellow',
      clickable: true,
      trend: 'equal' as const
    },
    {
      title: 'Avg Failure Rate',
      value: `${(metrics.averageFailRate * 100).toFixed(1)}%`,
      icon: '📋',
      color: 'gray',
      clickable: false
    }
  ];

  const getColorClasses = (color: string, clickable: boolean) => {
    const baseClasses = (() => {
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
    })();
    
    if (clickable && onTrendClick) {
      return `${baseClasses} cursor-pointer transition-all hover:shadow-md hover:scale-105 hover:border-opacity-80`;
    }
    
    return baseClasses;
  };

  const handleCardClick = (card: any) => {
    if (card.clickable && card.trend && onTrendClick) {
      onTrendClick(card.trend);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`p-4 rounded-lg border ${getColorClasses(card.color, card.clickable)}`}
          onClick={() => handleCardClick(card)}
          role={card.clickable && onTrendClick ? "button" : undefined}
          tabIndex={card.clickable && onTrendClick ? 0 : undefined}
          onKeyDown={(e) => {
            if (card.clickable && onTrendClick && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              handleCardClick(card);
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">{card.title}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </div>
            <div className="text-2xl">{card.icon}</div>
          </div>
          {card.clickable && onTrendClick && (
            <div className="mt-2 text-xs opacity-60">
              Click to view trends
            </div>
          )}
        </div>
      ))}
    </div>
  );
}