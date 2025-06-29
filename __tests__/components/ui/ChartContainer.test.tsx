import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartContainer } from '@/components/ui/ChartContainer';
import '@testing-library/jest-dom';

// Mock the useFullscreen hook
const mockUseFullscreen = jest.fn();
jest.mock('@/hooks/useFullscreen', () => ({
  useFullscreen: (...args: any) => mockUseFullscreen(...args)
}));

describe('ChartContainer', () => {
  const defaultProps = {
    title: 'Test Chart',
    children: <div data-testid="chart-content">Chart Content</div>
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFullscreen.mockReturnValue({
      isFullscreen: false,
      toggleFullscreen: jest.fn(),
      fullscreenEnabled: true,
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn()
    });
  });

  it('should render with title and children', () => {
    render(<ChartContainer {...defaultProps} />);

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
  });

  it('should render with description when provided', () => {
    render(
      <ChartContainer
        {...defaultProps}
        description="Test description"
      />
    );

    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should render custom actions when provided', () => {
    render(
      <ChartContainer
        {...defaultProps}
        actions={<button data-testid="custom-action">Export</button>}
      />
    );

    expect(screen.getByTestId('custom-action')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ChartContainer
        {...defaultProps}
        className="custom-class"
      />
    );

    const containerElement = container.firstChild as HTMLElement;
    expect(containerElement).toHaveClass('custom-class');
  });

  it('should show fullscreen button when fullscreen is enabled', () => {
    render(<ChartContainer {...defaultProps} />);

    const fullscreenButton = screen.getByTitle('Enter fullscreen');
    expect(fullscreenButton).toBeInTheDocument();
  });

  it('should toggle fullscreen when button is clicked', () => {
    const mockToggleFullscreen = jest.fn();
    mockUseFullscreen.mockReturnValue({
      isFullscreen: false,
      toggleFullscreen: mockToggleFullscreen,
      fullscreenEnabled: true,
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn()
    });

    render(<ChartContainer {...defaultProps} />);

    const fullscreenButton = screen.getByTitle('Enter fullscreen');
    fireEvent.click(fullscreenButton);

    expect(mockToggleFullscreen).toHaveBeenCalled();
  });

  it('should show exit fullscreen button when in fullscreen mode', () => {
    mockUseFullscreen.mockReturnValue({
      isFullscreen: true,
      toggleFullscreen: jest.fn(),
      fullscreenEnabled: true,
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn()
    });

    render(<ChartContainer {...defaultProps} />);

    const exitButton = screen.getByTitle('Exit fullscreen');
    expect(exitButton).toBeInTheDocument();
  });

  it('should apply fullscreen styles when in fullscreen mode', () => {
    mockUseFullscreen.mockReturnValue({
      isFullscreen: true,
      toggleFullscreen: jest.fn(),
      fullscreenEnabled: true,
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn()
    });

    const { container } = render(<ChartContainer {...defaultProps} />);

    const containerElement = container.firstChild as HTMLElement;
    expect(containerElement).toHaveClass('fixed');
    expect(containerElement).toHaveClass('inset-0');
    expect(containerElement).toHaveClass('z-50');
  });

  it('should not show fullscreen button when fullscreen is not supported', () => {
    mockUseFullscreen.mockReturnValue({
      isFullscreen: false,
      toggleFullscreen: jest.fn(),
      fullscreenEnabled: false,
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn()
    });

    render(<ChartContainer {...defaultProps} />);

    const fullscreenButton = screen.queryByTitle('Enter fullscreen');
    expect(fullscreenButton).not.toBeInTheDocument();
  });

  it('should render both actions and fullscreen button', () => {
    render(
      <ChartContainer
        {...defaultProps}
        actions={<button data-testid="export-btn">Export</button>}
      />
    );

    expect(screen.getByTestId('export-btn')).toBeInTheDocument();
    expect(screen.getByTitle('Enter fullscreen')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<ChartContainer {...defaultProps} />);

    const fullscreenButton = screen.getByTitle('Enter fullscreen');
    expect(fullscreenButton).toHaveAttribute('aria-label', 'Enter fullscreen');
  });

  it('should apply height styles to content in fullscreen mode', () => {
    mockUseFullscreen.mockReturnValue({
      isFullscreen: true,
      toggleFullscreen: jest.fn(),
      fullscreenEnabled: true,
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn()
    });

    const { container } = render(<ChartContainer {...defaultProps} />);

    const contentWrapper = container.querySelector('.h-\\[calc\\(100vh-8rem\\)\\]');
    expect(contentWrapper).toBeInTheDocument();
  });

  it('should show filter toggle button in fullscreen mode when filters are provided', () => {
    mockUseFullscreen.mockReturnValue({
      isFullscreen: true,
      toggleFullscreen: jest.fn(),
      fullscreenEnabled: true,
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn()
    });

    render(
      <ChartContainer
        {...defaultProps}
        filters={<div data-testid="filter-panel">Filters</div>}
      />
    );

    const filterToggleButton = screen.getByTitle('Show filters');
    expect(filterToggleButton).toBeInTheDocument();
  });

  it('should not show filter toggle button when not in fullscreen mode', () => {
    mockUseFullscreen.mockReturnValue({
      isFullscreen: false,
      toggleFullscreen: jest.fn(),
      fullscreenEnabled: true,
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn()
    });

    render(
      <ChartContainer
        {...defaultProps}
        filters={<div data-testid="filter-panel">Filters</div>}
      />
    );

    const filterToggleButton = screen.queryByTitle('Show filters');
    expect(filterToggleButton).not.toBeInTheDocument();
  });

  it('should toggle filter panel visibility when filter button is clicked', () => {
    mockUseFullscreen.mockReturnValue({
      isFullscreen: true,
      toggleFullscreen: jest.fn(),
      fullscreenEnabled: true,
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn()
    });

    render(
      <ChartContainer
        {...defaultProps}
        filters={<div data-testid="filter-panel">Filters</div>}
      />
    );

    // Initially filters should not be visible
    expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument();

    // Click to show filters
    const filterToggleButton = screen.getByTitle('Show filters');
    fireEvent.click(filterToggleButton);

    // Filters should now be visible
    expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    expect(screen.getByTitle('Hide filters')).toBeInTheDocument();

    // Click to hide filters
    fireEvent.click(screen.getByTitle('Hide filters'));
    expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument();
  });

  it('should show close button in filter panel', () => {
    mockUseFullscreen.mockReturnValue({
      isFullscreen: true,
      toggleFullscreen: jest.fn(),
      fullscreenEnabled: true,
      enterFullscreen: jest.fn(),
      exitFullscreen: jest.fn()
    });

    render(
      <ChartContainer
        {...defaultProps}
        filters={<div data-testid="filter-panel">Filters</div>}
      />
    );

    // Show filters
    fireEvent.click(screen.getByTitle('Show filters'));

    // Close button should be visible
    const closeButton = screen.getByLabelText('Close filters');
    expect(closeButton).toBeInTheDocument();

    // Click close button
    fireEvent.click(closeButton);

    // Filters should be hidden
    expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument();
  });
});