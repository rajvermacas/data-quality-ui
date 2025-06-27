import React, { useState } from 'react';
import html2canvas from 'html2canvas';

interface ChartExportProps {
  chartRef: React.RefObject<HTMLElement>;
  filename: string;
}

export const ChartExport: React.FC<ChartExportProps> = ({ chartRef, filename }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const exportChart = async (format: 'png' | 'svg') => {
    if (!chartRef.current) return;
    
    setIsExporting(true);
    try {
      if (format === 'png') {
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher quality
          useCORS: true
        });
        
        const dataURL = canvas.toDataURL('image/png');
        downloadFile(dataURL, `${filename}.png`);
      } else if (format === 'svg') {
        // For SVG export, we'll create a simplified SVG representation
        const svgContent = createSVGFromElement(chartRef.current);
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        downloadFile(url, `${filename}.svg`);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setShowOptions(false);
    }
  };

  const createSVGFromElement = (element: HTMLElement): string => {
    const rect = element.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Basic SVG wrapper - in a real implementation, this would be more sophisticated
    return `<?xml version="1.0" encoding="UTF-8"?>
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">
            ${element.innerHTML}
          </div>
        </foreignObject>
      </svg>`;
  };

  const downloadFile = (dataURL: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={isExporting}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <>
            <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Chart
          </>
        )}
      </button>

      {showOptions && !isExporting && (
        <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <button
            onClick={() => exportChart('png')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-t-md"
          >
            PNG
          </button>
          <button
            onClick={() => exportChart('svg')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-b-md"
          >
            SVG
          </button>
        </div>
      )}
    </div>
  );
};