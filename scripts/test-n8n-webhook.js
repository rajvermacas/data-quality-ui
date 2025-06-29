#!/usr/bin/env node

// Test script for n8n webhook integration

async function testN8nWebhook() {
  const API_URL = 'http://localhost:3001/api/n8n-webhook';
  
  console.log('Testing n8n webhook API...\n');

  // Test 1: Valid request
  console.log('Test 1: Valid request');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test issue: There is an increase in the HR system failure rate percentage by 34%. Assign it to aibardchatgpt17@gmail.com'
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n---\n');

  // Test 2: Missing message
  console.log('Test 2: Missing message');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n---\n');

  // Test 3: Message too long
  console.log('Test 3: Message too long');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'a'.repeat(1001)
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the tests
testN8nWebhook().catch(console.error);