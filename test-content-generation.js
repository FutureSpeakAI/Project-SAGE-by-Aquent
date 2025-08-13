#!/usr/bin/env node

/**
 * Test Content Generation Tab
 * This test will help debug why "Generate content" (15 chars) is being sent instead of the actual user prompt
 */

async function testContentGeneration() {
  console.log('\n🔍 Testing Content Generation Tab...\n');
  
  // Test 1: Direct API call with full prompt (should work)
  console.log('Test 1: Direct API call with full prompt');
  try {
    const response = await fetch('http://localhost:5000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: 'write a letter from Santa Clause to Donald Trump',
        systemPrompt: 'You are a helpful assistant.',
        model: 'gpt-4o-mini',
        temperature: 0.7
      })
    });
    
    const result = await response.json();
    console.log('✅ Direct API call successful');
    console.log(`- Provider: ${result.provider}`);
    console.log(`- Model: ${result.model}`);
    console.log(`- Content length: ${result.content.length} characters`);
    console.log(`- Contains "Santa": ${result.content.includes('Santa')}`);
    console.log(`- Contains "Trump": ${result.content.includes('Trump')}`);
  } catch (error) {
    console.error('❌ Direct API call failed:', error.message);
  }
  
  console.log('\n---\n');
  
  // Test 2: Check what happens with a 15-character prompt
  console.log('Test 2: Testing with exactly 15 characters ("Generate content")');
  try {
    const response = await fetch('http://localhost:5000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: 'Generate content',  // Exactly 15 characters
        systemPrompt: 'You are a helpful assistant.',
        model: 'gpt-4o-mini',
        temperature: 0.7
      })
    });
    
    const result = await response.json();
    console.log('✅ 15-character prompt processed');
    console.log(`- Provider: ${result.provider}`);
    console.log(`- Model: ${result.model}`);
    console.log(`- Content preview: ${result.content.substring(0, 200)}...`);
  } catch (error) {
    console.error('❌ 15-character prompt failed:', error.message);
  }
  
  console.log('\n---\n');
  
  // Test 3: Empty prompt (should fail)
  console.log('Test 3: Testing with empty prompt');
  try {
    const response = await fetch('http://localhost:5000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: '',
        systemPrompt: 'You are a helpful assistant.',
        model: 'gpt-4o-mini',
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.log('✅ Empty prompt correctly rejected:', error.error);
    } else {
      console.log('❌ Empty prompt should have been rejected');
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
  
  console.log('\n📋 Summary:');
  console.log('The issue appears to be that the UI is sending "Generate content" (15 chars)');
  console.log('instead of the actual user input from the textarea.');
  console.log('This might be happening if:');
  console.log('1. The button text is being used as the prompt');
  console.log('2. There\'s a default value being set somewhere');
  console.log('3. The state is being overwritten before submission');
  console.log('\nNext step: Check browser console for debug logs when clicking Generate Content');
}

// Run the test
testContentGeneration().catch(console.error);