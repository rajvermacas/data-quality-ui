import { render, screen, fireEvent } from '@testing-library/react';
import { UrgentAttentionWidget } from '@/components/features/UrgentAttentionWidget';
import { UrgentAttentionItem } from '@/types';

const mockUrgentItems: UrgentAttentionItem[] = [
  {
    dataset_name: 'Critical Dataset 1',
    source: 'SYSTEM_A',
    dimension: 'Validity',
    fail_rate_1m: 0.4,
    fail_rate_3m: 0.3,
    fail_rate_12m: 0.2,
    trend_flag: 'down'
  },
  {
    dataset_name: 'Critical Dataset 2',
    source: 'SYSTEM_B',
    dimension: 'Completeness',
    fail_rate_1m: 0.35,
    fail_rate_3m: 0.25,
    fail_rate_12m: 0.15,
    trend_flag: 'down'
  }
];

describe('UrgentAttentionWidget', () => {
  it('should render urgent items correctly', () => {
    render(<UrgentAttentionWidget items={mockUrgentItems} />);
    
    expect(screen.getByText('Urgent Attention Required')).toBeInTheDocument();
    expect(screen.getByText('2 Issues')).toBeInTheDocument();
    
    expect(screen.getByText('Critical Dataset 1')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM_A • Validity')).toBeInTheDocument();
    expect(screen.getByText('40.0%')).toBeInTheDocument();
    
    expect(screen.getByText('Critical Dataset 2')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM_B • Completeness')).toBeInTheDocument();
    expect(screen.getByText('35.0%')).toBeInTheDocument();
  });

  it('should show "All Clear" when no urgent items', () => {
    render(<UrgentAttentionWidget items={[]} />);
    
    expect(screen.getByText('Urgent Attention Required')).toBeInTheDocument();
    expect(screen.getByText('All Clear')).toBeInTheDocument();
    expect(screen.getByText(/No datasets with high failure rates detected/)).toBeInTheDocument();
  });

  it('should show singular "Issue" for one item', () => {
    render(<UrgentAttentionWidget items={[mockUrgentItems[0]]} />);
    
    expect(screen.getByText('1 Issue')).toBeInTheDocument();
  });

  it('should limit display to 5 items and show "View more" link', () => {
    const manyItems = Array(7).fill(null).map((_, i) => ({
      ...mockUrgentItems[0],
      dataset_name: `Dataset ${i + 1}`
    }));
    
    render(<UrgentAttentionWidget items={manyItems} />);
    
    expect(screen.getByText('7 Issues')).toBeInTheDocument();
    expect(screen.getByText('View 2 more issues →')).toBeInTheDocument();
    
    // Should only show first 5 items
    expect(screen.getByText('Dataset 1')).toBeInTheDocument();
    expect(screen.getByText('Dataset 5')).toBeInTheDocument();
    expect(screen.queryByText('Dataset 6')).not.toBeInTheDocument();
  });

  it('should format failure rates correctly', () => {
    const itemWithPreciseRates: UrgentAttentionItem[] = [{
      dataset_name: 'Test Dataset',
      source: 'TEST_SYSTEM',
      dimension: 'Test',
      fail_rate_1m: 0.123456,
      fail_rate_3m: 0.234567,
      fail_rate_12m: 0.345678,
      trend_flag: 'down'
    }];
    
    render(<UrgentAttentionWidget items={itemWithPreciseRates} />);
    
    expect(screen.getByText('12.3%')).toBeInTheDocument(); // 1M rate
    expect(screen.getByText('3M: 23.5%')).toBeInTheDocument(); // 3M rate
    expect(screen.getByText('12M: 34.6%')).toBeInTheDocument(); // 12M rate
  });

  it('should expand to show all items when "View more" button is clicked', () => {
    const manyItems = Array(7).fill(null).map((_, i) => ({
      ...mockUrgentItems[0],
      dataset_name: `Dataset ${i + 1}`
    }));
    
    render(<UrgentAttentionWidget items={manyItems} />);
    
    // Initially should only show first 5 items
    expect(screen.getByText('Dataset 1')).toBeInTheDocument();
    expect(screen.getByText('Dataset 5')).toBeInTheDocument();
    expect(screen.queryByText('Dataset 6')).not.toBeInTheDocument();
    expect(screen.queryByText('Dataset 7')).not.toBeInTheDocument();
    
    // Click the "View more" button
    const viewMoreButton = screen.getByText('View 2 more issues →');
    fireEvent.click(viewMoreButton);
    
    // Now all items should be visible
    expect(screen.getByText('Dataset 1')).toBeInTheDocument();
    expect(screen.getByText('Dataset 5')).toBeInTheDocument();
    expect(screen.getByText('Dataset 6')).toBeInTheDocument();
    expect(screen.getByText('Dataset 7')).toBeInTheDocument();
  });

  it('should collapse to show only first 5 items when "Show fewer" button is clicked', () => {
    const manyItems = Array(7).fill(null).map((_, i) => ({
      ...mockUrgentItems[0],
      dataset_name: `Dataset ${i + 1}`
    }));
    
    render(<UrgentAttentionWidget items={manyItems} />);
    
    // First expand
    const viewMoreButton = screen.getByText('View 2 more issues →');
    fireEvent.click(viewMoreButton);
    
    // All items should be visible
    expect(screen.getByText('Dataset 6')).toBeInTheDocument();
    expect(screen.getByText('Dataset 7')).toBeInTheDocument();
    
    // Click the "Show fewer" button
    const showFewerButton = screen.getByText('Show fewer issues ↑');
    fireEvent.click(showFewerButton);
    
    // Should be back to only first 5 items
    expect(screen.getByText('Dataset 1')).toBeInTheDocument();
    expect(screen.getByText('Dataset 5')).toBeInTheDocument();
    expect(screen.queryByText('Dataset 6')).not.toBeInTheDocument();
    expect(screen.queryByText('Dataset 7')).not.toBeInTheDocument();
  });

  it('should update button text correctly based on state', () => {
    const manyItems = Array(10).fill(null).map((_, i) => ({
      ...mockUrgentItems[0],
      dataset_name: `Dataset ${i + 1}`
    }));
    
    render(<UrgentAttentionWidget items={manyItems} />);
    
    // Initially should show "View X more issues"
    expect(screen.getByText('View 5 more issues →')).toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(screen.getByText('View 5 more issues →'));
    
    // Should now show "Show fewer issues"
    expect(screen.getByText('Show fewer issues ↑')).toBeInTheDocument();
    expect(screen.queryByText('View 5 more issues →')).not.toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    const manyItems = Array(8).fill(null).map((_, i) => ({
      ...mockUrgentItems[0],
      dataset_name: `Dataset ${i + 1}`
    }));
    
    render(<UrgentAttentionWidget items={manyItems} />);
    
    const button = screen.getByRole('button', { name: 'View 3 more issues' });
    expect(button).toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(button);
    
    const collapsedButton = screen.getByRole('button', { name: 'Show fewer issues' });
    expect(collapsedButton).toBeInTheDocument();
  });

  it('should not show toggle button when items count is 5 or less', () => {
    const fiveItems = Array(5).fill(null).map((_, i) => ({
      ...mockUrgentItems[0],
      dataset_name: `Dataset ${i + 1}`
    }));
    
    render(<UrgentAttentionWidget items={fiveItems} />);
    
    // Should not show the toggle button
    expect(screen.queryByText(/View.*more issues/)).not.toBeInTheDocument();
    expect(screen.queryByText('Show fewer issues')).not.toBeInTheDocument();
    
    // All 5 items should be visible
    expect(screen.getByText('Dataset 1')).toBeInTheDocument();
    expect(screen.getByText('Dataset 5')).toBeInTheDocument();
  });
});