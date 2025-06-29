'use client';

import React, { useRef, ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useFullscreen } from '@/hooks/useFullscreen';

interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function ChartContainer({
  title,
  description,
  children,
  className = '',
  actions
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen, fullscreenEnabled } = useFullscreen(containerRef);

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
      <div className={`${isFullscreen ? 'h-[calc(100vh-8rem)]' : ''}`}>
        {children}
      </div>
    </div>
  );
}