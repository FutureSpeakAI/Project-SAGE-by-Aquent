#!/usr/bin/env node

// Simple test script for Gemini-only mode text generation
const http = require('http');

// Set GEMINI_ONLY_MODE for this test
process.env.GEMINI_ONLY_MODE = 'true';

const testCases = [
  {
    name: "Simple Query Test",
    endpoint: "/api/generate",
    body: {
      userPrompt: "What is artificial intelligence?",
      systemPrompt: "Be concise.",
      temperature: 0.7
    }
  },
  {
    name: "Complex Analysis Test",
    endpoint: "/api/robust-generate",
    body: {
      userPrompt: "Analyze the impact of social media on modern marketing strategies.",
      systemPrompt: "Provide a comprehensive analysis.",
      temperature: 0.7,
      maxTokens: 2000
    }
  },
  {
    name: "Content Generation Test",
    endpoint: "/api/generate-content",
    body: {
      prompt: "Create a social media post about eco-friendly products.",
      systemPrompt: "Be creative and engaging.",
      temperature: 0.8
    }
  },
  {
    name: "Creative Brief Test",
    endpoint: "/api/generate",
    body: {
      userPrompt: "CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)\n\nCreate an Instagram post for a new fitness app targeting millennials.",
      systemPrompt: "You are a professional content creator.",
      temperature: 0.7
    }
  }
];

const makeRequest = (testCase) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(testCase.body);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: testCase.endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          resolve({
            testCase,
            success: true,
            response,
            statusCode: res.statusCode
          });
        } catch (e) {
          resolve({
            testCase,
            success: false,
            error: 'Failed to parse response',
            statusCode: res.statusCode,
            rawResponse: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        testCase,
        success: false,
        error: error.message
      });
    });
    
    req.write(data);
    req.end();
  });
};

const runTests = async () => {
  console.log('\n═══════════════════════════════════════════════');
  console.log('   GEMINI-ONLY MODE TEXT GENERATION TESTS');
  console.log('   Mode: GEMINI_ONLY_MODE=' + process.env.GEMINI_ONLY_MODE);
  console.log('═══════════════════════════════════════════════\n');
  
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`\n━━━ Test: ${testCase.name} ━━━`);
    console.log(`Endpoint: ${testCase.endpoint}`);
    console.log(`Prompt: "${testCase.body.userPrompt || testCase.body.prompt}".substring(0, 80)}...`);
    
    const startTime = Date.now();
    const result = await makeRequest(testCase);
    const duration = Date.now() - startTime;
    
    if (result.success && result.response.content) {
      console.log(`✓ SUCCESS (${duration}ms)`);
      console.log(`Provider: ${result.response.provider}`);
      console.log(`Model: ${result.response.model}`);
      console.log(`Gemini-Only: ${result.response.geminiOnly || false}`);
      console.log(`Response length: ${result.response.content.length} chars`);
      console.log(`Sample: "${result.response.content.substring(0, 100)}..."`);
      
      // Verify it's using Gemini
      if (result.response.provider === 'gemini') {
        console.log('✓ Correctly routed to Gemini');
      } else {
        console.log(`⚠ WARNING: Using ${result.response.provider} instead of Gemini`);
      }
    } else {
      console.log(`✗ FAILED (${duration}ms)`);
      console.log(`Error: ${result.error || 'Unknown error'}`);
      if (result.rawResponse) {
        console.log(`Response: ${result.rawResponse.substring(0, 200)}`);
      }
    }
    
    results.push({
      name: testCase.name,
      success: result.success && result.response?.provider === 'gemini',
      duration,
      provider: result.response?.provider
    });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════');
  console.log('   TEST SUMMARY');
  console.log('═══════════════════════════════════════════════\n');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(r => {
    const status = r.success ? '✓ PASS' : '✗ FAIL';
    const provider = r.provider ? ` (${r.provider})` : '';
    console.log(`${status} - ${r.name}${provider} (${r.duration}ms)`);
  });
  
  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED - Gemini-only mode working! 🎉');
  } else {
    console.log('\n⚠ Some tests failed or not using Gemini');
    process.exit(1);
  }
};

// Check if server is running
const checkServer = () => {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5000/api/models', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
  });
};

const main = async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('❌ Server is not running on port 5000');
    console.error('Please ensure the application is running first');
    process.exit(1);
  }
  
  await runTests();
};

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});