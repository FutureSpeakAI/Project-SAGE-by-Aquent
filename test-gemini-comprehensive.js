#!/usr/bin/env node

// Comprehensive test suite for all Gemini-integrated features
const http = require('http');
const fs = require('fs');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_SESSION_ID = 'test-session-' + Date.now();

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
  // 1. Right-Click Menu Context Generation
  rightClickMenu: {
    name: "Right-Click Menu Context Generation",
    tests: [
      {
        name: "Generate content from selected text",
        endpoint: "/api/generate-from-selection",
        method: "POST",
        body: {
          selectedText: "Artificial Intelligence",
          action: "expand",
          context: "Make this more detailed"
        },
        validate: (response) => {
          return response.data?.content && 
                 response.data.provider === 'gemini' &&
                 response.data.content.length > 50;
        }
      },
      {
        name: "Summarize selected content",
        endpoint: "/api/generate-from-selection",
        method: "POST",
        body: {
          selectedText: "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It uses algorithms to parse data, learn from it, and make informed decisions.",
          action: "summarize"
        },
        validate: (response) => {
          return response.data?.content && 
                 response.data.provider === 'gemini' &&
                 response.data.content.length < 200;
        }
      },
      {
        name: "Rewrite in different tone",
        endpoint: "/api/generate-from-selection",
        method: "POST",
        body: {
          selectedText: "Our product is the best in the market",
          action: "rewrite",
          tone: "professional"
        },
        validate: (response) => {
          return response.data?.content && 
                 response.data.provider === 'gemini';
        }
      }
    ]
  },

  // 2. Session and Context Persistence
  sessionContext: {
    name: "Session and Context Persistence",
    tests: [
      {
        name: "Create new session",
        endpoint: "/api/chat-sessions",
        method: "POST",
        body: {
          title: "Test Gemini Session " + Date.now(),
          model: "gemini-2.0-flash",
          systemPrompt: "You are a helpful assistant"
        },
        validate: (response) => {
          return response.data?.id && response.data?.title;
        },
        saveAs: "sessionId"
      },
      {
        name: "Send message with session context",
        endpoint: "/api/chat",
        method: "POST",
        body: {
          message: "Remember this number: 42. I'll ask about it later.",
          sessionId: "${sessionId}",
          model: "gemini-2.0-flash"
        },
        validate: (response) => {
          return response.data?.response && 
                 response.data.provider === 'gemini';
        }
      },
      {
        name: "Retrieve context from session",
        endpoint: "/api/chat",
        method: "POST",
        body: {
          message: "What number did I ask you to remember?",
          sessionId: "${sessionId}",
          model: "gemini-2.0-flash"
        },
        validate: (response) => {
          return response.data?.response && 
                 response.data.response.includes("42");
        }
      },
      {
        name: "Get session history",
        endpoint: "/api/chat-sessions/${sessionId}",
        method: "GET",
        validate: (response) => {
          return response.data?.messages && 
                 Array.isArray(response.data.messages) &&
                 response.data.messages.length > 0;
        }
      }
    ]
  },

  // 3. Content Library Integration
  contentLibrary: {
    name: "Content Library with Gemini",
    tests: [
      {
        name: "Save generated content to library",
        endpoint: "/api/content-library",
        method: "POST",
        body: {
          title: "Test Gemini Content",
          content: "AI-generated marketing copy",
          type: "marketing",
          metadata: {
            provider: "gemini",
            model: "gemini-2.0-flash"
          }
        },
        validate: (response) => {
          return response.data?.id;
        },
        saveAs: "contentId"
      },
      {
        name: "Retrieve content from library",
        endpoint: "/api/content-library/${contentId}",
        method: "GET",
        validate: (response) => {
          return response.data?.content && 
                 response.data?.title === "Test Gemini Content";
        }
      },
      {
        name: "Generate variations from library content",
        endpoint: "/api/generate-variation",
        method: "POST",
        body: {
          contentId: "${contentId}",
          instruction: "Make it more engaging"
        },
        validate: (response) => {
          return response.data?.content && 
                 response.data.provider === 'gemini';
        }
      }
    ]
  },

  // 4. Learning System Integration
  learningSystem: {
    name: "Learning System with Gemini",
    tests: [
      {
        name: "Record successful pattern",
        endpoint: "/api/learning/record-success",
        method: "POST",
        body: {
          pattern: {
            type: "content_generation",
            provider: "gemini",
            model: "gemini-2.0-flash",
            prompt: "Create social media post",
            success: true,
            metrics: {
              responseTime: 1500,
              quality: 0.9
            }
          }
        },
        validate: (response) => {
          return response.success;
        }
      },
      {
        name: "Get recommendations based on patterns",
        endpoint: "/api/learning/recommendations",
        method: "POST",
        body: {
          context: {
            type: "content_generation",
            requirements: ["social_media", "engagement"]
          }
        },
        validate: (response) => {
          return response.data?.recommendations;
        }
      },
      {
        name: "Apply learned optimizations",
        endpoint: "/api/generate-with-learning",
        method: "POST",
        body: {
          prompt: "Create an engaging social media post",
          applyLearning: true
        },
        validate: (response) => {
          return response.data?.content && 
                 response.data.provider === 'gemini' &&
                 response.data.learningApplied === true;
        }
      }
    ]
  },

  // 5. Briefing System with Gemini
  briefingSystem: {
    name: "Briefing System Integration",
    tests: [
      {
        name: "Create brief and generate content",
        endpoint: "/api/briefings",
        method: "POST",
        body: {
          title: "Test Gemini Brief",
          projectName: "AI Product Launch",
          targetAudience: "Tech professionals",
          objectives: ["Increase awareness", "Drive engagement"],
          deliverables: ["Blog post", "Social media content"],
          tone: "Professional yet approachable"
        },
        validate: (response) => {
          return response.data?.id;
        },
        saveAs: "briefId"
      },
      {
        name: "Execute brief with Gemini",
        endpoint: "/api/execute-brief",
        method: "POST",
        body: {
          briefId: "${briefId}",
          generateAll: true
        },
        validate: (response) => {
          return response.data?.results && 
                 response.data.provider === 'gemini' &&
                 Array.isArray(response.data.results);
        }
      }
    ]
  },

  // 6. Smart Routing Validation
  smartRouting: {
    name: "Smart Routing with Gemini Override",
    tests: [
      {
        name: "Research query routes to Gemini",
        endpoint: "/api/smart-generate",
        method: "POST",
        body: {
          prompt: "What are the latest trends in AI?",
          type: "research"
        },
        validate: (response) => {
          return response.data?.provider === 'gemini';
        }
      },
      {
        name: "Creative content routes to Gemini",
        endpoint: "/api/smart-generate",
        method: "POST",
        body: {
          prompt: "Write a creative story about robots",
          type: "creative"
        },
        validate: (response) => {
          return response.data?.provider === 'gemini';
        }
      },
      {
        name: "Technical analysis routes to Gemini",
        endpoint: "/api/smart-generate",
        method: "POST",
        body: {
          prompt: "Analyze this code performance",
          type: "technical",
          code: "function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }"
        },
        validate: (response) => {
          return response.data?.provider === 'gemini';
        }
      }
    ]
  },

  // 7. Multi-turn Conversation Flow
  conversationFlow: {
    name: "Multi-turn Conversation with Context",
    tests: [
      {
        name: "Start conversation",
        endpoint: "/api/chat",
        method: "POST",
        body: {
          message: "I want to create a marketing campaign for a new eco-friendly product",
          sessionId: "conv-test-" + Date.now()
        },
        validate: (response) => {
          return response.data?.response && 
                 response.data.provider === 'gemini';
        },
        saveAs: "convSessionId"
      },
      {
        name: "Follow-up with context",
        endpoint: "/api/chat",
        method: "POST",
        body: {
          message: "What channels should I focus on?",
          sessionId: "${convSessionId}"
        },
        validate: (response) => {
          return response.data?.response && 
                 response.data.response.toLowerCase().includes("channel") &&
                 response.data.provider === 'gemini';
        }
      },
      {
        name: "Complex follow-up maintaining context",
        endpoint: "/api/chat",
        method: "POST",
        body: {
          message: "Create a sample post for the first channel you mentioned",
          sessionId: "${convSessionId}"
        },
        validate: (response) => {
          return response.data?.response && 
                 response.data.provider === 'gemini' &&
                 response.data.response.length > 100;
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
      console.log(`  Endpoint: ${test.endpoint || 'N/A'}`);
      
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
        console.log(`  Response:`, response.data || response.error);
      }
      
      results.push({ test: test.name, passed, duration });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`  ${colors.red}✗ ERROR${colors.reset} (${duration}ms)`);
      console.log(`  Error: ${error.message}`);
      results.push({ test: test.name, passed: false, duration });
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

// Main test execution
async function main() {
  console.log(`\n${colors.bright}${colors.magenta}═══════════════════════════════════════════════════════════════`);
  console.log(`                COMPREHENSIVE GEMINI INTEGRATION TEST`);
  console.log(`                GEMINI_ONLY_MODE = ${process.env.GEMINI_ONLY_MODE || 'true'}`);
  console.log(`═══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  // Check server
  try {
    const serverCheck = await makeRequest('GET', '/api/status');
    if (!serverCheck.success) {
      console.error(`${colors.red}❌ Server is not running on port 5000${colors.reset}`);
      process.exit(1);
    }
    console.log(`${colors.green}✓ Server is running${colors.reset}`);
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
  console.log(`                         FINAL TEST SUMMARY`);
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
  
  console.log(`\n${colors.bright}Total: ${totalPassed} passed, ${totalFailed} failed`);
  console.log(`Total time: ${totalDuration}ms${colors.reset}`);
  
  if (totalFailed === 0) {
    console.log(`\n${colors.green}${colors.bright}🎉 ALL GEMINI INTEGRATION TESTS PASSED! 🎉${colors.reset}`);
    console.log(`${colors.green}The system is ready for vendor compliance demo.${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️ SOME TESTS FAILED - Review and fix issues${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});