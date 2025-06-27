import { render, screen } from '@testing-library/react';
import { MetricsCards } from '@/components/features/MetricsCards';
import { DashboardMetrics } from '@/types';

const mockMetrics: DashboardMetrics = {
  totalDatasets: 100,
  urgentAttentionCount: 5,
  averageFailRate: 0.15,
  trendingDown: 8,
  trendingUp: 12,
  stable: 80
};

describe('MetricsCards', () => {
  it('should render all metric cards with correct values', () => {
    render(<MetricsCards metrics={mockMetrics} />);
    
    expect(screen.getByText('Total Datasets')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    
    expect(screen.getByText('Urgent Attention')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    
    expect(screen.getByText('Trending Down')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    
    expect(screen.getByText('Trending Up')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    
    expect(screen.getByText('Stable')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    
    expect(screen.getByText('Avg Failure Rate')).toBeInTheDocument();
    expect(screen.getByText('15.0%')).toBeInTheDocument();
  });

  it('should handle zero values correctly', () => {
    const zeroMetrics: DashboardMetrics = {
      totalDatasets: 0,
      urgentAttentionCount: 0,
      averageFailRate: 0,
      trendingDown: 0,
      trendingUp: 0,
      stable: 0
    };
    
    render(<MetricsCards metrics={zeroMetrics} />);
    
    expect(screen.getAllByText('0')).toHaveLength(5); // All zero values except percentage
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('should format large numbers correctly', () => {
    const largeMetrics: DashboardMetrics = {
      totalDatasets: 1234567,
      urgentAttentionCount: 12345,
      averageFailRate: 0.125,
      trendingDown: 1000,
      trendingUp: 2000,
      stable: 3000
    };
    
    render(<MetricsCards metrics={largeMetrics} />);
    
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
    expect(screen.getByText('12,345')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('2,000')).toBeInTheDocument();
    expect(screen.getByText('3,000')).toBeInTheDocument();
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });
});