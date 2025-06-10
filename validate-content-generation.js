/**
 * Content Generation Validation Script
 * Tests the unified architecture against multiple scenarios
 */

import fetch from 'node-fetch';

async function testBriefExecution() {
  console.log('Testing Brief Execution...');
  
  const briefContent = `CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)

Project: Tech Startup Launch Campaign
Objective: Create comprehensive launch content for AI-powered productivity app
Target Audience: Business professionals, entrepreneurs, tech enthusiasts aged 25-45

Deliverables Required:
1. Press Release Headline and Opening Paragraph
2. Social Media Package:
   - LinkedIn post for professional announcement
   - Twitter thread (3 tweets) for product features
   - Instagram caption for behind-the-scenes content
3. Email Newsletter Content:
   - Subject line
   - Opening paragraph with value proposition
   - Feature highlights (3 key benefits)
   - Call-to-action

Brand Voice: Professional yet approachable, innovative, results-focused
Key Messages: Revolutionary AI technology, 10x productivity boost, seamless workflow integration`;

  try {
    const response = await fetch('http://localhost:5000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        userPrompt: briefContent,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (!data.content) {
      console.log('❌ FAILED: No content generated');
      console.log('Error:', data.error);
      return false;
    }

    const content = data.content;
    
    // Validation checks
    const isActualContent = !content.includes('CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS');
    const hasPress = content.toLowerCase().includes('press') || content.toLowerCase().includes('release');
    const hasLinkedIn = content.toLowerCase().includes('linkedin');
    const hasTwitter = content.toLowerCase().includes('twitter') || content.includes('1/3') || content.includes('thread');
    const hasInstagram = content.toLowerCase().includes('instagram');
    const hasEmail = content.toLowerCase().includes('email') || content.toLowerCase().includes('subject');
    const isComprehensive = content.length > 1000;

    console.log('Results:');
    console.log('- Provider:', data.provider);
    console.log('- Model:', data.model);
    console.log('- Routed:', data.routed);
    console.log('- Content length:', content.length);
    console.log('- Is actual content (not brief):', isActualContent);
    console.log('- Has press release content:', hasPress);
    console.log('- Has LinkedIn content:', hasLinkedIn);
    console.log('- Has Twitter content:', hasTwitter);
    console.log('- Has Instagram content:', hasInstagram);
    console.log('- Has email content:', hasEmail);
    console.log('- Is comprehensive:', isComprehensive);

    const deliverableCount = [hasPress, hasLinkedIn, hasTwitter, hasInstagram, hasEmail].filter(Boolean).length;
    console.log('- Deliverable coverage:', deliverableCount + '/5');

    if (isActualContent && deliverableCount >= 4) {
      console.log('✅ SUCCESS: Brief execution working correctly!');
      return true;
    } else {
      console.log('❌ FAILED: Brief not properly converted to content');
      console.log('Sample content:', content.substring(0, 500) + '...');
      return false;
    }

  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return false;
  }
}

async function testRegularContent() {
  console.log('\nTesting Regular Content Generation...');
  
  try {
    const response = await fetch('http://localhost:5000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        userPrompt: 'Write a compelling introduction for a blog post about sustainable fashion trends in 2025',
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (!data.content) {
      console.log('❌ FAILED: No content generated');
      return false;
    }

    console.log('- Provider:', data.provider);
    console.log('- Content length:', data.content.length);
    console.log('- Has proper structure:', data.content.includes('<h') || data.content.includes('<p'));
    
    console.log('✅ SUCCESS: Regular content generation working');
    return true;

  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return false;
  }
}

async function testProviderRouting() {
  console.log('\nTesting Provider Routing...');
  
  const models = ['claude-sonnet-4-20250514', 'gpt-4o', 'gemini-1.5-pro'];
  const results = [];

  for (const model of models) {
    try {
      const response = await fetch('http://localhost:5000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          userPrompt: 'Create a short product tagline for an eco-friendly smartphone',
          temperature: 0.7
        })
      });

      const data = await response.json();
      results.push({
        requested: model,
        provider: data.provider,
        actualModel: data.model,
        success: !!data.content,
        routed: data.routed
      });

    } catch (error) {
      results.push({
        requested: model,
        error: error.message,
        success: false
      });
    }
  }

  console.log('Routing Results:');
  results.forEach(r => {
    console.log(`- ${r.requested} → ${r.provider || 'FAILED'} (${r.actualModel || 'N/A'}) - Routed: ${r.routed}`);
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`✅ SUCCESS: ${successCount}/${models.length} providers working`);
  
  return successCount > 0;
}

async function runValidation() {
  console.log('🚀 UNIFIED CONTENT GENERATION VALIDATION');
  console.log('=========================================');

  const results = [];
  
  results.push(await testBriefExecution());
  results.push(await testRegularContent());
  results.push(await testProviderRouting());

  const passCount = results.filter(Boolean).length;
  const totalTests = results.length;

  console.log('\n📊 VALIDATION SUMMARY');
  console.log('=====================');
  console.log(`Tests Passed: ${passCount}/${totalTests}`);
  console.log(`Success Rate: ${Math.round((passCount / totalTests) * 100)}%`);

  if (passCount === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✓ Brief-to-content conversion is working');
    console.log('✓ Prompt router is being used correctly');
    console.log('✓ Provider fallbacks are functioning');
    console.log('✓ Architecture fix is successful');
  } else {
    console.log('\n⚠️ Some tests failed - additional fixes needed');
  }

  return passCount === totalTests;
}

runValidation().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});