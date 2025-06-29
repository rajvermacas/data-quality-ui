import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('should render clickable trend cards with proper styling', () => {
    const mockOnTrendClick = jest.fn();
    render(<MetricsCards metrics={mockMetrics} onTrendClick={mockOnTrendClick} />);
    
    const trendingDownCard = screen.getByRole('button', { name: /trending down/i });
    const trendingUpCard = screen.getByRole('button', { name: /trending up/i });
    const stableCard = screen.getByRole('button', { name: /stable/i });
    const totalDatasetsCard = screen.getByText('Total Datasets').closest('div');
    
    // Trend cards should have clickable styling
    expect(trendingDownCard).toHaveClass('cursor-pointer');
    expect(trendingUpCard).toHaveClass('cursor-pointer');
    expect(stableCard).toHaveClass('cursor-pointer');
    
    // Non-trend cards should not have clickable styling
    expect(totalDatasetsCard).not.toHaveClass('cursor-pointer');
    
    // Trend cards should have click hint text
    expect(screen.getAllByText('Click to view trends')).toHaveLength(3);
  });

  it('should call onTrendClick with correct trend when trend cards are clicked', async () => {
    const user = userEvent.setup();
    const mockOnTrendClick = jest.fn();
    
    render(<MetricsCards metrics={mockMetrics} onTrendClick={mockOnTrendClick} />);
    
    // Click Trending Down card
    const trendingDownCard = screen.getByText('Trending Down').closest('div');
    await user.click(trendingDownCard!);
    expect(mockOnTrendClick).toHaveBeenCalledWith('down');
    
    // Click Trending Up card
    const trendingUpCard = screen.getByText('Trending Up').closest('div');
    await user.click(trendingUpCard!);
    expect(mockOnTrendClick).toHaveBeenCalledWith('up');
    
    // Click Stable card
    const stableCard = screen.getByText('Stable').closest('div');
    await user.click(stableCard!);
    expect(mockOnTrendClick).toHaveBeenCalledWith('equal');
    
    expect(mockOnTrendClick).toHaveBeenCalledTimes(3);
  });

  it('should not call onTrendClick when non-trend cards are clicked', async () => {
    const user = userEvent.setup();
    const mockOnTrendClick = jest.fn();
    
    render(<MetricsCards metrics={mockMetrics} onTrendClick={mockOnTrendClick} />);
    
    // Click non-trend cards
    const totalDatasetsCard = screen.getByText('Total Datasets').closest('div');
    const urgentAttentionCard = screen.getByText('Urgent Attention').closest('div');
    
    await user.click(totalDatasetsCard!);
    await user.click(urgentAttentionCard!);
    
    expect(mockOnTrendClick).not.toHaveBeenCalled();
  });

  it('should handle keyboard navigation for trend cards', () => {
    const mockOnTrendClick = jest.fn();
    
    render(<MetricsCards metrics={mockMetrics} onTrendClick={mockOnTrendClick} />);
    
    const trendingDownCard = screen.getByText('Trending Down').closest('div');
    
    // Test Enter key
    fireEvent.keyDown(trendingDownCard!, { key: 'Enter' });
    expect(mockOnTrendClick).toHaveBeenCalledWith('down');
    
    // Test Space key
    fireEvent.keyDown(trendingDownCard!, { key: ' ' });
    expect(mockOnTrendClick).toHaveBeenCalledWith('down');
    
    // Test other keys (should not trigger)
    fireEvent.keyDown(trendingDownCard!, { key: 'Tab' });
    expect(mockOnTrendClick).toHaveBeenCalledTimes(2);
  });

  it('should work without onTrendClick prop', () => {
    // Should not throw error when onTrendClick is not provided
    expect(() => {
      render(<MetricsCards metrics={mockMetrics} />);
    }).not.toThrow();
    
    // Cards should still render but without click functionality
    expect(screen.getByText('Trending Down')).toBeInTheDocument();
    expect(screen.queryByText('Click to view trends')).not.toBeInTheDocument();
  });
});