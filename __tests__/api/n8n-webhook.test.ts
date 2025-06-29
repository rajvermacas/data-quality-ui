import { POST } from '@/app/api/n8n-webhook/route';
import { NextRequest } from 'next/server';

// Mock fetch globally
global.fetch = jest.fn();

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => ({
    json: async () => JSON.parse(init.body)
  })),
  NextResponse: {
    json: (data: any, init?: any) => ({
      json: async () => data,
      status: init?.status || 200
    })
  }
}));

describe('/api/n8n-webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    const request = new NextRequest('http://localhost:3000/api/n8n-webhook', {
      method: 'POST',
      body: JSON.stringify({
        message: 'There is an increase in the HR system failure rate percentage by 34%'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://aibard.app.n8n.cloud/webhook-test/data-quality',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'There is an increase in the HR system failure rate percentage by 34%'
        })
      })
    );
  });

  it('should return 400 for missing message', async () => {
    const request = new NextRequest('http://localhost:3000/api/n8n-webhook', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request: message is required');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should return 400 for message too long', async () => {
    const longMessage = 'a'.repeat(1001);
    const request = new NextRequest('http://localhost:3000/api/n8n-webhook', {
      method: 'POST',
      body: JSON.stringify({ message: longMessage })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Message too long: maximum 1000 characters allowed');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle n8n webhook errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    const request = new NextRequest('http://localhost:3000/api/n8n-webhook', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test message'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create issue: Internal Server Error');
  });

  it('should handle invalid n8n response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ invalidData: true })
    });

    const request = new NextRequest('http://localhost:3000/api/n8n-webhook', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test message'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Invalid response from workflow');
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const request = new NextRequest('http://localhost:3000/api/n8n-webhook', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test message'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('Failed to connect to workflow service');
  });

  it('should handle timeout errors', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    const request = new NextRequest('http://localhost:3000/api/n8n-webhook', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test message'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(504);
    expect(data.error).toBe('Request timeout: The workflow took too long to respond');
  });
});