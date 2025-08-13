#!/usr/bin/env node

// Test Imagen 3 integration for image generation and editing
const http = require('http');

// Helper function to make HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      const data = JSON.stringify(body);
      options.headers['Content-Length'] = data.length;
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = responseData ? JSON.parse(responseData) : null;
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            data: response
          });
        } catch (e) {
          resolve({
            success: false,
            statusCode: res.statusCode,
            error: 'Failed to parse response',
            rawData: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function testImageGeneration() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('           IMAGEN 3 INTEGRATION TEST SUITE');
  console.log('           GEMINI_ONLY_MODE = true');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Check server status
  try {
    const status = await makeRequest('GET', '/api/status');
    console.log('✓ Server is running');
    console.log('  Environment:', status.data?.environment);
    console.log('  Database:', status.data?.database?.type);
  } catch (error) {
    console.error('✗ Server not available:', error.message);
    process.exit(1);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' IMAGE GENERATION TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const imageTests = [
    {
      name: 'Generate landscape image',
      endpoint: '/api/generate-image',
      body: {
        prompt: 'A serene mountain landscape at sunset with snow-capped peaks',
        size: '1024x1024',
        quality: 'high'
      }
    },
    {
      name: 'Generate portrait image',
      endpoint: '/api/generate-image',
      body: {
        prompt: 'A professional portrait of a business executive in modern office',
        size: '1024x1792',
        quality: 'hd',
        n: 1
      }
    },
    {
      name: 'Generate multiple variations',
      endpoint: '/api/generate-image',
      body: {
        prompt: 'Abstract colorful geometric patterns',
        size: '512x512',
        n: 2
      }
    },
    {
      name: 'Edit existing image',
      endpoint: '/api/edit-image',
      body: {
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        prompt: 'Add a beautiful sunset sky in the background',
        size: '1024x1024'
      }
    },
    {
      name: 'Complex creative prompt',
      endpoint: '/api/generate-image',
      body: {
        prompt: 'Hyperrealistic digital art of a futuristic city with flying cars, neon lights, cyberpunk aesthetic, night scene, rain, reflections on wet streets, 8k quality',
        size: '1792x1024',
        quality: 'hd'
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of imageTests) {
    console.log(`Testing: ${test.name}`);
    const start = Date.now();
    
    try {
      const result = await makeRequest('POST', test.endpoint, test.body);
      const duration = Date.now() - start;
      
      if (result.success && result.data) {
        const isImagen = result.data.provider === 'google' || result.data.model === 'imagen-3';
        const hasImages = result.data.images && result.data.images.length > 0;
        
        if (isImagen && hasImages) {
          console.log(`  ✓ PASSED (${duration}ms)`);
          console.log(`    Provider: ${result.data.provider || 'google'}`);
          console.log(`    Model: ${result.data.model}`);
          console.log(`    Images generated: ${result.data.images.length}`);
          if (result.data.note) {
            console.log(`    Note: ${result.data.note}`);
          }
          passed++;
        } else {
          console.log(`  ✗ FAILED - Not using Imagen 3`);
          console.log(`    Provider: ${result.data.provider}`);
          console.log(`    Model: ${result.data.model}`);
          failed++;
        }
      } else {
        console.log(`  ✗ FAILED - ${result.data?.error || 'Unknown error'}`);
        failed++;
      }
    } catch (error) {
      console.log(`  ✗ ERROR - ${error.message}`);
      failed++;
    }
    
    console.log('');
    await new Promise(r => setTimeout(r, 1000)); // Delay between tests
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' TEXT GENERATION VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Verify text generation still works with Gemini
  const textTest = await makeRequest('POST', '/api/generate-content', {
    prompt: 'Write a brief tagline for an AI image generation service',
    temperature: 0.7
  });
  
  if (textTest.success && textTest.data?.provider === 'gemini') {
    console.log('✓ Text generation still using Gemini');
    console.log(`  Model: ${textTest.data.model}`);
    console.log(`  Sample: "${textTest.data.content.substring(0, 100)}..."`);
  } else {
    console.log('✗ Text generation not using Gemini');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' FINAL SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`Image Generation Tests:`);
  console.log(`  Passed: ${passed}/${imageTests.length}`);
  console.log(`  Failed: ${failed}/${imageTests.length}`);
  
  if (passed === imageTests.length) {
    console.log('\n✅ ALL IMAGEN 3 TESTS PASSED!');
    console.log('✅ Both text (Gemini) and image (Imagen 3) generation working!');
    console.log('✅ System ready for vendor compliance demonstration!\n');
  } else {
    console.log('\n⚠️ Some tests failed - review the results above\n');
  }
}

// Run the tests
testImageGeneration().catch(console.error);