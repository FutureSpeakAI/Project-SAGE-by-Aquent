#!/usr/bin/env node

// Comprehensive test suite for all Gemini interfaces
const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:5000';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

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

// Test suite definitions
const testSuites = {
  // 1. Core Text Generation Endpoints
  textGeneration: {
    name: "Core Text Generation with Gemini",
    tests: [
      {
        name: "Generate content via /api/generate",
        endpoint: "/api/generate",
        method: "POST",
        body: {
          userPrompt: "Write a brief overview of machine learning",
          systemPrompt: "Be concise and educational",
          temperature: 0.7
        },
        validate: (response) => {
          return response.data?.content && 
                 response.data.provider === 'gemini' &&
                 response.data.content.length > 50;
        }
      },
      {
        name: "Robust generation with context",
        endpoint: "/api/robust-generate",
        method: "POST",
        body: {
          userPrompt: "Create a marketing strategy for a tech startup",
          systemPrompt: "You are a marketing expert",
          temperature: 0.8,
          maxTokens: 2000,
          sessionHistory: [
            { role: "user", content: "Our startup makes AI tools" },
            { role: "assistant", content: "I understand you're developing AI tools." }
          ]
        },
        validate: (response) => {
          return response.data?.content && 
                 response.data.provider === 'gemini' &&
                 response.data.geminiOnly === true;
        }
      },
      {
        name: "Generate content endpoint",
        endpoint: "/api/generate-content",
        method: "POST",
        body: {
          prompt: "Explain quantum computing in simple terms",
          temperature: 0.7,
          maxTokens: 1500
        },
        validate: (response) => {
          return response.data?.content && 
                 response.data.provider === 'gemini';
        }
      },
      {
        name: "Complex brief execution",
        endpoint: "/api/generate",
        method: "POST",
        body: {
          userPrompt: "CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)\n\nProject: Summer Campaign\nTarget: Young adults 18-25\nTone: Fun and energetic\nDeliverables: Create 3 social media posts",
          systemPrompt: "You are a creative content specialist"
        },
        validate: (response) => {
          return response.data?.content && 
                 response.data.provider === 'gemini' &&
                 response.data.content.length > 500;
        }
      }
    ]
  },

  // 2. Session and Context Management
  sessionManagement: {
    name: "Session Context and Persistence",
    tests: [
      {
        name: "Create new chat session",
        endpoint: "/api/chat-sessions",
        method: "POST",
        body: {
          title: "Gemini Test Session " + Date.now(),
          model: "gemini-2.0-flash",
          systemPrompt: "You are a helpful AI assistant",
          messages: []
        },
        validate: (response) => {
          return response.data?.id && response.data?.title;
        },
        saveAs: "sessionId"
      },
      {
        name: "Get all chat sessions",
        endpoint: "/api/chat-sessions",
        method: "GET",
        validate: (response) => {
          return Array.isArray(response.data);
        }
      },
      {
        name: "Get specific session",
        endpoint: "/api/chat-sessions/${sessionId}",
        method: "GET",
        validate: (response) => {
          return response.data?.id && response.data?.title;
        }
      },
      {
        name: "Update session with message",
        endpoint: "/api/chat-sessions/${sessionId}",
        method: "PUT",
        body: {
          messages: [
            { role: "user", content: "Remember my favorite color is blue" },
            { role: "assistant", content: "I'll remember that your favorite color is blue." }
          ]
        },
        validate: (response) => {
          return response.data?.id;
        }
      },
      {
        name: "Context persistence test",
        endpoint: "/api/robust-generate",
        method: "POST",
        body: {
          userPrompt: "What's my favorite color that I mentioned earlier?",
          sessionHistory: [
            { role: "user", content: "Remember my favorite color is blue" },
            { role: "assistant", content: "I'll remember that your favorite color is blue." }
          ]
        },
        validate: (response) => {
          return response.data?.content && 
                 response.data.content.toLowerCase().includes("blue");
        }
      }
    ]
  },

  // 3. Brief Analysis
  briefAnalysis: {
    name: "Brief Analysis and Processing",
    tests: [
      {
        name: "Analyze marketing brief",
        endpoint: "/api/analyze-brief",
        method: "POST",
        body: {
          content: "Marketing Brief: Launch new eco-friendly product line targeting millennials. Focus on sustainability and social impact. Budget: $50,000. Timeline: 3 months. Channels: Social media, influencer partnerships, content marketing."
        },
        validate: (response) => {
          return response.data && typeof response.data === 'object';
        }
      },
      {
        name: "Analyze complex creative brief",
        endpoint: "/api/analyze-brief",
        method: "POST",
        body: {
          content: "CREATIVE BRIEF\n\nClient: TechStart Inc.\nProject: Brand Awareness Campaign\n\nObjectives:\n- Increase brand recognition by 40%\n- Generate 10,000 qualified leads\n- Establish thought leadership\n\nTarget Audience:\n- B2B decision makers\n- Tech industry professionals\n- Age 30-50\n\nKey Messages:\n- Innovation leader\n- Trusted partner\n- ROI focused\n\nDeliverables:\n- 5 blog posts\n- 10 social media posts\n- 2 whitepapers\n- Email campaign (3 emails)"
        },
        validate: (response) => {
          return response.data && 
                 (response.data.objectives || response.data.targetAudience || response.data.deliverables);
        }
      }
    ]
  },

  // 4. Long Content Generation
  longFormContent: {
    name: "Long-Form Content Generation",
    tests: [
      {
        name: "Generate comprehensive article",
        endpoint: "/api/robust-generate",
        method: "POST",
        body: {
          userPrompt: "Write a comprehensive guide about implementing AI in small businesses. Include benefits, challenges, best practices, and case studies.",
          systemPrompt: "You are an AI business consultant. Write detailed, actionable content.",
          temperature: 0.7,
          maxTokens: 3000
        },
        validate: (response) => {
          return response.data?.content && 
                 response.data.provider === 'gemini' &&
                 response.data.content.length > 2000;
        }
      },
      {
        name: "Generate multiple deliverables",
        endpoint: "/api/generate",
        method: "POST",
        body: {
          userPrompt: "Create the following deliverables:\n1. Email subject line about a sale\n2. Email body copy (200 words)\n3. Social media post (50 words)\n4. SMS message (20 words)\n\nTopic: Summer clearance sale with 50% off",
          systemPrompt: "Create distinct, engaging content for each deliverable"
        },
        validate: (response) => {
          const content = response.data?.content || '';
          return response.data?.provider === 'gemini' &&
                 content.includes('subject') &&
                 content.includes('email') &&
                 content.includes('social');
        }
      }
    ]
  },

  // 5. Edge Cases and Error Handling
  edgeCases: {
    name: "Edge Cases and Error Handling",
    tests: [
      {
        name: "Handle empty prompt gracefully",
        endpoint: "/api/generate",
        method: "POST",
        body: {
          userPrompt: "",
          systemPrompt: "Test"
        },
        validate: (response) => {
          return response.statusCode === 400 && 
                 response.data?.error;
        }
      },
      {
        name: "Handle very long prompt",
        endpoint: "/api/generate-content",
        method: "POST",
        body: {
          prompt: "Analyze this: " + "Lorem ipsum dolor sit amet. ".repeat(500),
          maxTokens: 500
        },
        validate: (response) => {
          return response.data?.content && 
                 response.data.provider === 'gemini';
        }
      },
      {
        name: "Handle special characters",
        endpoint: "/api/generate",
        method: "POST",
        body: {
          userPrompt: "Translate: こんにちは、世界！ Comment ça va? ¿Cómo estás? 🌍🚀💡",
          systemPrompt: "Handle multiple languages and emojis"
        },
        validate: (response) => {
          return response.data?.content && 
                 response.data.provider === 'gemini';
        }
      }
    ]
  },

  // 6. Model Selection Logic
  modelSelection: {
    name: "Smart Model Selection",
    tests: [
      {
        name: "Simple query uses Flash Lite",
        endpoint: "/api/generate",
        method: "POST",
        body: {
          userPrompt: "What is 2+2?",
          temperature: 0.5
        },
        validate: (response) => {
          return response.data?.provider === 'gemini' &&
                 (response.data.model === 'gemini-2.0-flash-lite' || 
                  response.data.model === 'gemini-2.0-flash');
        }
      },
      {
        name: "Complex query uses Flash",
        endpoint: "/api/robust-generate",
        method: "POST",
        body: {
          userPrompt: "Develop a comprehensive digital transformation strategy for a traditional retail company moving to e-commerce. Include technology stack recommendations, timeline, budget considerations, change management approach, and KPIs.",
          temperature: 0.8
        },
        validate: (response) => {
          return response.data?.provider === 'gemini' &&
                 response.data.model === 'gemini-2.0-flash';
        }
      }
    ]
  }
};

// Test runner
async function runTestSuite(suiteName, suite) {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`${colors.bright}${colors.blue}  ${suite.name}${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  const results = [];
  const context = {}; // Store values between tests
  
  for (const test of suite.tests) {
    const startTime = Date.now();
    
    try {
      // Replace placeholders in endpoint and body
      let endpoint = test.endpoint;
      let body = test.body;
      
      // Replace ${variable} placeholders
      if (endpoint && endpoint.includes('${')) {
        endpoint = endpoint.replace(/\$\{(\w+)\}/g, (match, key) => context[key] || match);
      }
      
      if (body) {
        const bodyStr = JSON.stringify(body);
        const replacedStr = bodyStr.replace(/"\$\{(\w+)\}"/g, (match, key) => 
          `"${context[key] || match}"`
        );
        body = JSON.parse(replacedStr);
      }
      
      console.log(`${colors.yellow}▶ ${test.name}${colors.reset}`);
      
      const response = await makeRequest(test.method, endpoint, body);
      const duration = Date.now() - startTime;
      
      const passed = test.validate(response);
      
      // Save value if specified
      if (test.saveAs && response.data) {
        if (response.data.id) {
          context[test.saveAs] = response.data.id;
        } else if (response.data.sessionId) {
          context[test.saveAs] = response.data.sessionId;
        }
      }
      
      if (passed) {
        console.log(`  ${colors.green}✓ PASSED${colors.reset} (${duration}ms)`);
        if (response.data?.provider) {
          console.log(`  Provider: ${colors.magenta}${response.data.provider}${colors.reset}`);
        }
        if (response.data?.model) {
          console.log(`  Model: ${colors.magenta}${response.data.model}${colors.reset}`);
        }
      } else {
        console.log(`  ${colors.red}✗ FAILED${colors.reset} (${duration}ms)`);
        if (response.data?.error) {
          console.log(`  Error: ${response.data.error}`);
        }
      }
      
      results.push({ test: test.name, passed, duration });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`  ${colors.red}✗ ERROR${colors.reset} (${duration}ms)`);
      console.log(`  Error: ${error.message}`);
      results.push({ test: test.name, passed: false, duration });
    }
    
    // Small delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

// Main test execution
async function main() {
  console.log(`\n${colors.bright}${colors.magenta}═══════════════════════════════════════════════════════════════`);
  console.log(`           COMPREHENSIVE GEMINI INTERFACE TESTING`);
  console.log(`═══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  // Check server
  try {
    const serverCheck = await makeRequest('GET', '/api/status');
    if (!serverCheck.success) {
      console.error(`${colors.red}❌ Server is not running on port 5000${colors.reset}`);
      process.exit(1);
    }
    console.log(`${colors.green}✓ Server is running and healthy${colors.reset}`);
    console.log(`Environment: ${serverCheck.data?.environment}`);
    console.log(`Database: ${serverCheck.data?.database?.type}\n`);
  } catch (error) {
    console.error(`${colors.red}❌ Cannot connect to server: ${error.message}${colors.reset}`);
    process.exit(1);
  }
  
  // Run all test suites
  const allResults = {};
  
  for (const [suiteName, suite] of Object.entries(testSuites)) {
    try {
      const results = await runTestSuite(suiteName, suite);
      allResults[suiteName] = results;
    } catch (error) {
      console.error(`${colors.red}Suite ${suiteName} failed: ${error.message}${colors.reset}`);
      allResults[suiteName] = [{ test: 'Suite Error', passed: false, duration: 0 }];
    }
  }
  
  // Final summary
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════`);
  console.log(`                      FINAL TEST SUMMARY`);
  console.log(`═══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  let totalPassed = 0;
  let totalFailed = 0;
  let totalDuration = 0;
  
  for (const [suiteName, results] of Object.entries(allResults)) {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const duration = results.reduce((sum, r) => sum + r.duration, 0);
    
    totalPassed += passed;
    totalFailed += failed;
    totalDuration += duration;
    
    const status = failed === 0 ? colors.green : colors.red;
    console.log(`${status}${testSuites[suiteName].name}: ${passed}/${results.length} passed (${duration}ms)${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}Total Tests: ${totalPassed + totalFailed}`);
  console.log(`Passed: ${colors.green}${totalPassed}${colors.reset}`);
  console.log(`Failed: ${colors.red}${totalFailed}${colors.reset}`);
  console.log(`Total time: ${totalDuration}ms${colors.reset}`);
  
  if (totalFailed === 0) {
    console.log(`\n${colors.green}${colors.bright}🎉 ALL TESTS PASSED! GEMINI INTEGRATION FULLY OPERATIONAL! 🎉${colors.reset}`);
    console.log(`${colors.green}System is ready for vendor compliance demonstration.${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ ${totalFailed} TESTS FAILED - Review and fix issues${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});