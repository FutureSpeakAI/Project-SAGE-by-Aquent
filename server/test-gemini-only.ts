import { generateContent, selectGeminiModel } from './gemini';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface TestCase {
  name: string;
  description: string;
  request: {
    prompt: string;
    systemPrompt?: string;
    model?: string;
  };
  expectedBehavior: string;
  validate: (response: string) => boolean;
}

// Test cases for comprehensive text generation testing
const textGenerationTests: TestCase[] = [
  {
    name: "Simple Query",
    description: "Test basic text generation",
    request: {
      prompt: "What is artificial intelligence in one sentence?"
    },
    expectedBehavior: "Should return a concise explanation",
    validate: (response) => response.length > 20 && response.length < 500
  },
  {
    name: "Complex Analysis",
    description: "Test complex reasoning and analysis",
    request: {
      prompt: "Analyze the impact of social media on modern marketing strategies, including pros, cons, and future trends.",
      systemPrompt: "You are a marketing expert providing comprehensive analysis."
    },
    expectedBehavior: "Should return detailed analysis with structure",
    validate: (response) => {
      return response.length > 500 && 
             (response.includes('pros') || response.includes('Pros') || response.includes('advantages')) &&
             (response.includes('cons') || response.includes('Cons') || response.includes('disadvantages'));
    }
  },
  {
    name: "Creative Brief Execution",
    description: "Test creative brief content generation",
    request: {
      prompt: "CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)\n\nCreate a social media post for a new eco-friendly water bottle. Target audience: environmentally conscious millennials. Tone: inspiring and educational.",
      systemPrompt: "You are a professional content creator executing creative briefs."
    },
    expectedBehavior: "Should generate actual content, not summarize the brief",
    validate: (response) => {
      // Should NOT contain phrases that indicate summarizing
      const summaryPhrases = ['this brief asks', 'the brief requires', 'you want me to'];
      const hasSummaryPhrase = summaryPhrases.some(phrase => response.toLowerCase().includes(phrase));
      return !hasSummaryPhrase && response.length > 100;
    }
  },
  {
    name: "HTML Formatting",
    description: "Test HTML formatting in responses",
    request: {
      prompt: "Create a structured guide with headings and bullet points about effective email marketing.",
      systemPrompt: "Format your response with proper HTML tags including <h1>, <h2>, <ul>, and <li>."
    },
    expectedBehavior: "Should return properly formatted HTML",
    validate: (response) => {
      return response.includes('<h') && 
             (response.includes('<ul>') || response.includes('<li>'));
    }
  },
  {
    name: "Model Selection - Complex",
    description: "Test model selection for complex tasks",
    request: {
      prompt: "Develop a comprehensive marketing strategy for a B2B SaaS startup entering the enterprise market, including positioning, messaging, channel strategy, and success metrics."
    },
    expectedBehavior: "Should use Gemini 2.0 Flash for complex analysis",
    validate: (response) => response.length > 1000
  },
  {
    name: "Model Selection - Simple",
    description: "Test model selection for simple tasks",
    request: {
      prompt: "List 5 benefits of cloud computing."
    },
    expectedBehavior: "Should use Gemini 2.0 Flash Lite for simple tasks",
    validate: (response) => {
      const lines = response.split('\n').filter(line => line.trim());
      return lines.length >= 5;
    }
  },
  {
    name: "Session History Context",
    description: "Test context retention with session history",
    request: {
      prompt: "Based on our previous discussion, what were the main points?",
      systemPrompt: "You are a helpful assistant maintaining conversation context."
    },
    expectedBehavior: "Should acknowledge lack of previous context",
    validate: (response) => {
      return response.toLowerCase().includes('previous') || 
             response.toLowerCase().includes('context') ||
             response.toLowerCase().includes('discussion');
    }
  }
];

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function runTest(test: TestCase): Promise<boolean> {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}Test: ${test.name}${colors.reset}`);
  console.log(`${colors.blue}Description: ${test.description}${colors.reset}`);
  console.log(`Prompt: "${test.request.prompt.substring(0, 100)}..."`);
  
  try {
    // Determine model to use
    const isComplex = test.request.prompt.length > 200 || test.name.includes('Complex');
    const model = test.request.model || selectGeminiModel(isComplex, !isComplex);
    
    console.log(`Using model: ${colors.yellow}${model}${colors.reset}`);
    
    const startTime = Date.now();
    const response = await generateContent({
      model,
      prompt: test.request.prompt,
      systemPrompt: test.request.systemPrompt,
      temperature: 0.7,
      maxTokens: 3000
    });
    const duration = Date.now() - startTime;
    
    console.log(`Response time: ${duration}ms`);
    console.log(`Response length: ${response.length} characters`);
    console.log(`Sample: "${response.substring(0, 150)}..."`);
    
    const passed = test.validate(response);
    
    if (passed) {
      console.log(`${colors.green}✓ Test PASSED${colors.reset}`);
      console.log(`Expected: ${test.expectedBehavior}`);
    } else {
      console.log(`${colors.red}✗ Test FAILED${colors.reset}`);
      console.log(`Expected: ${test.expectedBehavior}`);
      console.log(`Full response:\n${response.substring(0, 500)}`);
    }
    
    return passed;
  } catch (error: any) {
    console.log(`${colors.red}✗ Test ERRORED${colors.reset}`);
    console.log(`Error: ${error.message}`);
    return false;
  }
}

export async function runAllTests(): Promise<void> {
  console.log(`\n${colors.bright}${colors.blue}════════════════════════════════════════════════`);
  console.log(`     GEMINI-ONLY MODE TEST SUITE`);
  console.log(`     Testing with GEMINI_ONLY_MODE=${process.env.GEMINI_ONLY_MODE}`);
  console.log(`════════════════════════════════════════════════${colors.reset}\n`);
  
  const results: { test: string; passed: boolean; time?: number }[] = [];
  
  for (const test of textGenerationTests) {
    const startTime = Date.now();
    const passed = await runTest(test);
    const duration = Date.now() - startTime;
    results.push({ test: test.name, passed, time: duration });
    
    // Small delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log(`\n${colors.bright}${colors.cyan}════════════════════════════════════════════════`);
  console.log(`     TEST SUMMARY`);
  console.log(`════════════════════════════════════════════════${colors.reset}\n`);
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + (r.time || 0), 0);
  
  results.forEach(r => {
    const status = r.passed ? `${colors.green}✓ PASS` : `${colors.red}✗ FAIL`;
    console.log(`${status}${colors.reset} - ${r.test} (${r.time}ms)`);
  });
  
  console.log(`\n${colors.bright}Total: ${passed} passed, ${failed} failed`);
  console.log(`Total time: ${totalTime}ms${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}${colors.bright}🎉 ALL TESTS PASSED! 🎉${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️  SOME TESTS FAILED ⚠️${colors.reset}`);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  // Set GEMINI_ONLY_MODE for testing
  process.env.GEMINI_ONLY_MODE = 'true';
  
  runAllTests().catch(error => {
    console.error(`${colors.red}Fatal error running tests:${colors.reset}`, error);
    process.exit(1);
  });
}