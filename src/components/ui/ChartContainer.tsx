'use client';

import React, { useRef, ReactNode, useState } from 'react';
import { Maximize2, Minimize2, SlidersHorizontal, X } from 'lucide-react';
import { useFullscreen } from '@/hooks/useFullscreen';

interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
  filters?: ReactNode;
}

export function ChartContainer({
  title,
  description,
  children,
  className = '',
  actions,
  filters
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen, fullscreenEnabled } = useFullscreen(containerRef);
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div
      ref={containerRef}
      className={`bg-white rounded-lg shadow-md p-6 ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''} ${className}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {isFullscreen && filters && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={showFilters ? 'Hide filters' : 'Show filters'}
              aria-label={showFilters ? 'Hide filters' : 'Show filters'}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          )}
          {fullscreenEnabled && (
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>
      
      {isFullscreen && filters ? (
        <div className="flex gap-6 h-[calc(100vh-8rem)]">
          {showFilters && (
            <div className="w-80 bg-gray-50 rounded-lg p-4 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-gray-900">Filters</h4>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                  aria-label="Close filters"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {filters}
            </div>
          )}
          <div className={`flex-1 overflow-hidden ${showFilters ? 'pr-4' : ''}`}>
            {children}
          </div>
        </div>
      ) : (
        <div className={`${isFullscreen ? 'h-[calc(100vh-8rem)] overflow-hidden' : ''}`}>
          {children}
        </div>
      )}
    </div>
  );
}