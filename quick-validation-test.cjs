/**
 * Quick validation test for critical SAGE fixes
 */

const axios = require('axios');

async function testAPI(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `http://localhost:5000${endpoint}`,
      timeout: 10000
    };
    
    if (data) {
      config.data = data;
      config.headers = { 'Content-Type': 'application/json' };
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.message, 
      status: error.response?.status 
    };
  }
}

async function runQuickValidation() {
  console.log('🔧 Quick Validation: Critical Bug Fixes');
  console.log('=' .repeat(50));
  
  const results = {
    passed: [],
    failed: []
  };

  // Test 1: Perplexity Research Query (Critical Fix)
  console.log('\n1. Testing Perplexity Model Support...');
  const perplexityTest = await testAPI('/api/generate-content', 'POST', {
    model: 'llama-3.1-sonar-large-128k-online',
    systemPrompt: 'You are a research analyst.',
    userPrompt: 'Analyze current AI fitness tracker market trends',
    temperature: 0.7
  });
  
  if (perplexityTest.success && perplexityTest.data.content) {
    console.log('✅ Perplexity research queries working');
    results.passed.push('Perplexity model support');
  } else {
    console.log('❌ Perplexity research failed:', perplexityTest.error);
    results.failed.push('Perplexity model support');
  }

  // Test 2: Brief Interpretation 
  console.log('\n2. Testing Brief Interpretation...');
  const briefTest = await testAPI('/api/interpret-brief', 'POST', {
    brief: 'Product: AI Fitness Tracker\nTarget: Health-conscious millennials\nGoal: Launch campaign with compelling visuals',
    model: 'gpt-4o'
  });
  
  if (briefTest.success && briefTest.data.prompt) {
    console.log('✅ Brief interpretation working');
    results.passed.push('Brief interpretation');
  } else {
    console.log('❌ Brief interpretation failed:', briefTest.error);
    results.failed.push('Brief interpretation');
  }

  // Test 3: Content Library
  console.log('\n3. Testing Content Library...');
  const libraryTest = await testAPI('/api/generated-contents');
  
  if (libraryTest.success) {
    console.log('✅ Content library accessible');
    results.passed.push('Content library access');
  } else {
    console.log('❌ Content library failed:', libraryTest.error);
    results.failed.push('Content library access');
  }

  // Test 4: Image Generation Model Availability
  console.log('\n4. Testing Image Models...');
  const modelsTest = await testAPI('/api/models');
  
  if (modelsTest.success && modelsTest.data.imageGeneration?.openai?.includes('gpt-image-1')) {
    console.log('✅ GPT-Image-1 model available');
    results.passed.push('Image generation models');
  } else {
    console.log('❌ Image models unavailable');
    results.failed.push('Image generation models');
  }

  // Results Summary
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('=' .repeat(30));
  console.log(`✅ Passed: ${results.passed.length}`);
  results.passed.forEach(test => console.log(`   • ${test}`));
  
  if (results.failed.length > 0) {
    console.log(`❌ Failed: ${results.failed.length}`);
    results.failed.forEach(test => console.log(`   • ${test}`));
  }
  
  const successRate = Math.round((results.passed.length / (results.passed.length + results.failed.length)) * 100);
  console.log(`\n🎯 Success Rate: ${successRate}%`);
  
  return {
    passed: results.passed.length,
    failed: results.failed.length,
    successRate
  };
}

// Run validation
runQuickValidation().catch(console.error);