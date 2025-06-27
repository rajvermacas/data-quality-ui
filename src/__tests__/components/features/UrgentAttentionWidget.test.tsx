import { render, screen } from '@testing-library/react';
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
    expect(screen.getByText(/No datasets with declining trends detected/)).toBeInTheDocument();
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
});