/**
 * @jest-environment node
 */

// Mock fetch before any imports
global.fetch = jest.fn();

describe('/api/gemini-query', () => {
  let POST: any;
  let NextRequest: any;

  beforeAll(async () => {
    // Import after mocking
    const routeModule = await import('@/app/api/gemini-query/route');
    const nextModule = await import('next/server');
    POST = routeModule.POST;
    NextRequest = nextModule.NextRequest;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it('should return 400 for missing query', async () => {
    const request = new NextRequest('http://localhost:3000/api/gemini-query', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Query is required');
  });

  it('should return 400 for query too long', async () => {
    const longQuery = 'a'.repeat(501);
    const request = new NextRequest('http://localhost:3000/api/gemini-query', {
      method: 'POST',
      body: JSON.stringify({ query: longQuery }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Query must be 500 characters or less');
  });

  it('should sanitize malicious HTML content', async () => {
    const maliciousQuery = 'Show me datasets <script>alert("xss")</script>';
    const request = new NextRequest('http://localhost:3000/api/gemini-query', {
      method: 'POST',
      body: JSON.stringify({ query: maliciousQuery }),
    });

    // Mock successful Gemini API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                chartType: 'bar',
                title: 'Datasets Overview',
                data: [],
                config: { xAxis: 'dataset_name', yAxis: ['fail_rate_1m'] },
                filters: [],
                insights: 'Test insights'
              })
            }]
          }
        }]
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    
    // Verify the malicious content was sanitized
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('Show me datasets ')
      })
    );
  });

  it('should return 500 when Gemini API key is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    
    const request = new NextRequest('http://localhost:3000/api/gemini-query', {
      method: 'POST',
      body: JSON.stringify({ query: 'Show me datasets' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Gemini API key not configured');
  });

  it('should successfully process a valid query', async () => {
    const mockGeminiResponse = {
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              chartType: 'bar',
              title: 'Datasets with High Failure Rates',
              data: [
                { dataset_name: 'Dataset A', fail_rate_1m: 0.15 },
                { dataset_name: 'Dataset B', fail_rate_1m: 0.25 }
              ],
              config: {
                xAxis: 'dataset_name',
                yAxis: ['fail_rate_1m']
              },
              filters: [
                {
                  field: 'fail_rate_1m',
                  label: 'Failure Rate',
                  values: ['> 0.1']
                }
              ],
              insights: 'Dataset B has significantly higher failure rates than Dataset A'
            })
          }]
        }
      }]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGeminiResponse
    });

    const request = new NextRequest('http://localhost:3000/api/gemini-query', {
      method: 'POST',
      body: JSON.stringify({ 
        query: 'Show me datasets with high failure rates',
        dataContext: [
          { dataset_name: 'Dataset A', fail_rate_1m: 0.15 },
          { dataset_name: 'Dataset B', fail_rate_1m: 0.25 }
        ]
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.chartType).toBe('bar');
    expect(data.title).toBe('Datasets with High Failure Rates');
    expect(data.data).toHaveLength(2);
    expect(data.config.xAxis).toBe('dataset_name');
    expect(data.filters).toHaveLength(1);
  });

  it('should handle Gemini API errors with retry logic', async () => {
    // Mock first call to fail, second to succeed
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  chartType: 'line',
                  title: 'Test Chart',
                  data: [],
                  config: { xAxis: 'date', yAxis: ['value'] },
                  filters: [],
                  insights: 'Test'
                })
              }]
            }
          }]
        })
      });

    const request = new NextRequest('http://localhost:3000/api/gemini-query', {
      method: 'POST',
      body: JSON.stringify({ query: 'Show me trends' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2); // First call failed, second succeeded
  });

  it('should return 500 after exhausting all retries', async () => {
    // Mock all calls to fail
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const request = new NextRequest('http://localhost:3000/api/gemini-query', {
      method: 'POST',
      body: JSON.stringify({ query: 'Show me trends' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to process query after multiple attempts');
    expect(global.fetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  }, 15000);
});