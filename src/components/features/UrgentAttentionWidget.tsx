import { useState } from 'react';
import { UrgentAttentionItem } from '@/types';

interface UrgentAttentionWidgetProps {
  items: UrgentAttentionItem[];
}

export function UrgentAttentionWidget({ items }: UrgentAttentionWidgetProps) {
  const [showAllItems, setShowAllItems] = useState(false);
  
  const handleToggleView = () => {
    setShowAllItems(!showAllItems);
  };
  if (items.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Urgent Attention Required</h2>
          <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
            All Clear
          </span>
        </div>
        <p className="text-gray-600 text-center py-8">
          No datasets with declining trends detected. All systems appear to be operating within acceptable parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Urgent Attention Required</h2>
        <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded">
          {items.length} {items.length === 1 ? 'Issue' : 'Issues'}
        </span>
      </div>
      
      <div className="space-y-3">
        {(showAllItems ? items : items.slice(0, 5)).map((item, index) => (
          <div
            key={`${item.dataset_name}-${item.source}-${index}`}
            className="p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{item.dataset_name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {item.source} • {item.dimension}
                </p>
              </div>
              <div className="text-right ml-4">
                <div className="text-sm font-medium text-red-800">
                  {(item.fail_rate_1m * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">1M Failure Rate</div>
              </div>
            </div>
            
            <div className="mt-3 flex space-x-4 text-xs text-gray-600">
              <span>3M: {(item.fail_rate_3m * 100).toFixed(1)}%</span>
              <span>12M: {(item.fail_rate_12m * 100).toFixed(1)}%</span>
              <span className="text-red-600 font-medium">↓ Declining</span>
            </div>
          </div>
        ))}
        
        {items.length > 5 && (
          <div className="text-center py-2">
            <button 
              onClick={handleToggleView}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              aria-label={showAllItems ? 'Show fewer issues' : `View ${items.length - 5} more issues`}
            >
              {showAllItems 
                ? 'Show fewer issues ↑' 
                : `View ${items.length - 5} more issues →`
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}