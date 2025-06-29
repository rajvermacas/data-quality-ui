import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IssueCreationModal } from '@/components/features/IssueCreationModal';

// Mock fetch
global.fetch = jest.fn();

describe('IssueCreationModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(
      <IssueCreationModal
        isOpen={false}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Create GitLab Issue')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(
      <IssueCreationModal
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Create GitLab Issue')).toBeInTheDocument();
    expect(screen.getByText('Describe the data quality issue in natural language')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Example: There is an increase/)).toBeInTheDocument();
  });

  it('should close when Cancel button is clicked', () => {
    render(
      <IssueCreationModal
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should close when backdrop is clicked', () => {
    render(
      <IssueCreationModal
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const backdrop = screen.getByRole('dialog').parentElement;
    fireEvent.click(backdrop!);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show error for empty message', async () => {
    render(
      <IssueCreationModal
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Create Issue'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a message')).toBeInTheDocument();
    });
  });

  it('should show character count', async () => {
    const user = userEvent.setup();
    render(
      <IssueCreationModal
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const textarea = screen.getByPlaceholderText(/Example: There is an increase/);
    await user.type(textarea, 'Test message');

    expect(screen.getByText('12/1000 characters')).toBeInTheDocument();
  });

  it('should successfully create an issue', async () => {
    const mockResponse = {
      workflowStatus: 'completed',
      issueWebUrl: 'https://gitlab.com/my-group-name2452611/data-quality/-/issues/12'
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const user = userEvent.setup();
    render(
      <IssueCreationModal
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const textarea = screen.getByPlaceholderText(/Example: There is an increase/);
    await user.type(textarea, 'Test issue description');

    fireEvent.click(screen.getByText('Create Issue'));

    // Check loading state
    expect(screen.getByText('Creating Issue...')).toBeInTheDocument();

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText('Issue Created Successfully!')).toBeInTheDocument();
    });

    expect(screen.getByText('Your GitLab issue has been created and a notification has been sent.')).toBeInTheDocument();
    expect(screen.getByText('View Issue on GitLab')).toBeInTheDocument();
    expect(screen.getByText('View Issue on GitLab')).toHaveAttribute('href', mockResponse.issueWebUrl);
    expect(screen.getByText('View Issue on GitLab')).toHaveAttribute('target', '_blank');
  });

  it('should handle API errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to create issue' })
    });

    const user = userEvent.setup();
    render(
      <IssueCreationModal
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const textarea = screen.getByPlaceholderText(/Example: There is an increase/);
    await user.type(textarea, 'Test issue description');

    fireEvent.click(screen.getByText('Create Issue'));

    await waitFor(() => {
      expect(screen.getByText('Failed to create issue')).toBeInTheDocument();
    });
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const user = userEvent.setup();
    render(
      <IssueCreationModal
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const textarea = screen.getByPlaceholderText(/Example: There is an increase/);
    await user.type(textarea, 'Test issue description');

    fireEvent.click(screen.getByText('Create Issue'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should allow creating another issue after success', async () => {
    const mockResponse = {
      workflowStatus: 'completed',
      issueWebUrl: 'https://gitlab.com/my-group-name2452611/data-quality/-/issues/12'
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const user = userEvent.setup();
    render(
      <IssueCreationModal
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const textarea = screen.getByPlaceholderText(/Example: There is an increase/);
    await user.type(textarea, 'Test issue description');

    fireEvent.click(screen.getByText('Create Issue'));

    await waitFor(() => {
      expect(screen.getByText('Issue Created Successfully!')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Another Issue'));

    // Should reset to initial state
    expect(screen.queryByText('Issue Created Successfully!')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Example: There is an increase/)).toHaveValue('');
  });

  it('should use initial message if provided', () => {
    render(
      <IssueCreationModal
        isOpen={true}
        onClose={mockOnClose}
        initialMessage="Pre-filled message"
      />
    );

    const textarea = screen.getByPlaceholderText(/Example: There is an increase/);
    expect(textarea).toHaveValue('Pre-filled message');
  });

  it('should disable submit button during loading', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    const user = userEvent.setup();
    render(
      <IssueCreationModal
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const textarea = screen.getByPlaceholderText(/Example: There is an increase/);
    await user.type(textarea, 'Test issue description');

    const submitButton = screen.getByText('Create Issue');
    fireEvent.click(submitButton);

    // Button should be disabled during loading
    expect(submitButton.parentElement).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });
});