import { NextRequest, NextResponse } from 'next/server';

interface N8nWebhookRequest {
  message: string;
}

interface N8nWebhookResponse {
  workflowStatus: string;
  issueWebUrl: string;
}

const N8N_WEBHOOK_URL = 'https://aibard.app.n8n.cloud/webhook-test/data-quality';
const REQUEST_TIMEOUT = 30000; // 30 seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as N8nWebhookRequest;
    
    // Validate request body
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: message is required' },
        { status: 400 }
      );
    }

    if (body.message.length > 1000) {
      return NextResponse.json(
        { error: 'Message too long: maximum 1000 characters allowed' },
        { status: 400 }
      );
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      // Call n8n webhook
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: body.message
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!n8nResponse.ok) {
        console.error('n8n webhook error:', n8nResponse.status, n8nResponse.statusText);
        return NextResponse.json(
          { error: `Failed to create issue: ${n8nResponse.statusText}` },
          { status: n8nResponse.status }
        );
      }

      const responseData = await n8nResponse.json() as N8nWebhookResponse;

      // Validate response
      if (!responseData.workflowStatus || !responseData.issueWebUrl) {
        console.error('Invalid n8n response:', responseData);
        return NextResponse.json(
          { error: 'Invalid response from workflow' },
          { status: 500 }
        );
      }

      // Return successful response
      return NextResponse.json(responseData);

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout: The workflow took too long to respond' },
          { status: 504 }
        );
      }

      console.error('n8n webhook fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to connect to workflow service' },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}