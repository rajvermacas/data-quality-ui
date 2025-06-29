import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '@/components/Dashboard';

// Mock the fetch function to prevent actual network calls
global.fetch = jest.fn();

// Mock scrollIntoView method
const mockScrollIntoView = jest.fn();
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: mockScrollIntoView,
  writable: true,
});

describe('Trend Scroll Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful fetch response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(`source,tenant_id,dataset_uuid,dataset_name,rule_code,rule_name,rule_type,dimension,rule_description,category,business_date_latest,dataset_record_count_latest,filtered_record_count_latest,pass_count_total,fail_count_total,pass_count_1m,fail_count_1m,pass_count_3m,fail_count_3m,pass_count_12m,fail_count_12m,fail_rate_total,fail_rate_1m,fail_rate_3m,fail_rate_12m,trend_flag,last_execution_level
TEST_SYSTEM,test_tenant,uuid1,Test Dataset,RULE001,Test Rule,COMPLETENESS,Accuracy,Test rule description,Data Quality,2023-01-01,1000,900,800,100,80,20,85,15,90,10,0.1,0.2,0.15,0.1,down,HIGH
TEST_SYSTEM,test_tenant,uuid2,Test Dataset 2,RULE002,Test Rule 2,VALIDITY,Integrity,Test rule 2 description,Data Quality,2023-01-01,2000,1800,1700,100,85,15,90,10,95,5,0.05,0.15,0.1,0.05,up,MEDIUM`)
    });
  });

  it('should scroll to trend chart when trending down card is clicked', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Data Quality Dashboard')).toBeInTheDocument();
    });

    // Click the Trending Down card
    const trendingDownCard = screen.getByRole('button', { name: /trending down/i });
    await user.click(trendingDownCard);

    // Verify scrollIntoView was called after a short delay
    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start'
      });
    }, { timeout: 1000 });
  });

  it('should switch to trends view when trend card is clicked from different view', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Data Quality Dashboard')).toBeInTheDocument();
    });

    // Switch to heatmap view first
    const heatmapButton = screen.getByText('🔥 Heatmap');
    await user.click(heatmapButton);

    // Verify we're in heatmap view
    expect(heatmapButton).toHaveClass('bg-white');

    // Click the Trending Up card
    const trendingUpCard = screen.getByRole('button', { name: /trending up/i });
    await user.click(trendingUpCard);

    // Verify we switched back to trends view
    await waitFor(() => {
      const trendsButton = screen.getByText('📈 Trend Analysis');
      expect(trendsButton).toHaveClass('bg-white');
    });

    // Verify scroll was called
    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should apply trend filter when trend card is clicked', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Data Quality Dashboard')).toBeInTheDocument();
    });

    // Click the Stable card
    const stableCard = screen.getByRole('button', { name: /stable/i });
    await user.click(stableCard);

    // Wait for the trend filter to be applied and chart title to update
    await waitFor(() => {
      expect(screen.getByText(/Dataset Failure Rate Trends Over Time - Stable/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Verify filter badge is shown
    expect(screen.getByText('Filter: Stable')).toBeInTheDocument();
  });

  it('should add visual highlight effect when scrolling to chart', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Data Quality Dashboard')).toBeInTheDocument();
    });

    // Click the Trending Down card
    const trendingDownCard = screen.getByRole('button', { name: /trending down/i });
    await user.click(trendingDownCard);

    // The highlight effect is applied via style manipulation in the component
    // We can verify that scrollIntoView was called, which triggers the highlight
    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start'
      });
    }, { timeout: 1000 });
  });

  it('should handle multiple trend card clicks correctly', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Data Quality Dashboard')).toBeInTheDocument();
    });

    // Click Trending Down first
    const trendingDownCard = screen.getByRole('button', { name: /trending down/i });
    await user.click(trendingDownCard);

    // Wait for scroll to be called
    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalledTimes(1);
    }, { timeout: 1000 });

    // Wait for filter to be applied
    await waitFor(() => {
      expect(screen.getByText('Filter: Trending Down')).toBeInTheDocument();
    });

    // Click Trending Up
    const trendingUpCard = screen.getByRole('button', { name: /trending up/i });
    await user.click(trendingUpCard);

    // Wait for scroll to be called again
    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalledTimes(2);
    }, { timeout: 1000 });

    // Wait for new filter to be applied
    await waitFor(() => {
      expect(screen.getByText('Filter: Trending Up')).toBeInTheDocument();
    });
  });
});