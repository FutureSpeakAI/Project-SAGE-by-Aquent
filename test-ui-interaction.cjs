#!/usr/bin/env node

// Test UI-facing interactions with Gemini
const http = require('http');

// Helper function for API calls
function callAPI(endpoint, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve({ success: true, data: JSON.parse(responseData) });
        } catch (e) {
          resolve({ success: false, error: e.message });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
    
    req.write(data);
    req.end();
  });
}

async function testUIInteractions() {
  console.log('\n=== TESTING UI INTERACTION SCENARIOS ===\n');
  
  const tests = [
    {
      name: 'Right-click menu: Expand selection',
      endpoint: '/api/generate-content',
      body: {
        prompt: 'Expand on this: "AI transforms business"',
        systemPrompt: 'Make the text more detailed and comprehensive'
      }
    },
    {
      name: 'Right-click menu: Summarize',
      endpoint: '/api/generate-content',
      body: {
        prompt: 'Summarize: "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It uses algorithms to parse data, learn patterns, and make informed decisions based on the insights gained."',
        systemPrompt: 'Create a concise summary'
      }
    },
    {
      name: 'Editor: Generate from prompt',
      endpoint: '/api/robust-generate',
      body: {
        userPrompt: 'Write a professional email about project delays',
        systemPrompt: 'You are a project manager',
        temperature: 0.7
      }
    },
    {
      name: 'Tab persistence: Context maintained',
      endpoint: '/api/generate',
      body: {
        userPrompt: 'Continue the story: Once upon a time in a digital world...',
        systemPrompt: 'Continue this creative story'
      }
    },
    {
      name: 'Quick action: Generate blog post',
      endpoint: '/api/generate-content',
      body: {
        prompt: 'Create a blog post about sustainable technology',
        temperature: 0.8
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    const start = Date.now();
    const result = await callAPI(test.endpoint, test.body);
    const duration = Date.now() - start;
    
    if (result.success && result.data?.content && result.data?.provider === 'gemini') {
      console.log(`✓ PASSED (${duration}ms) - Using ${result.data.model}`);
      console.log(`  Sample: "${result.data.content.substring(0, 100)}..."\n`);
      passed++;
    } else {
      console.log(`✗ FAILED - ${result.error || 'No Gemini response'}\n`);
      failed++;
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\n=== UI INTERACTION TEST SUMMARY ===`);
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(`Failed: ${failed}/${tests.length}`);
  
  if (failed === 0) {
    console.log('✅ All UI interactions working with Gemini!\n');
  }
}

testUIInteractions().catch(console.error);