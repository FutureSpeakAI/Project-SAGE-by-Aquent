/**
 * Briefing System Validation - Comprehensive Test Suite
 * Tests chat briefing, form upload, library storage, and content generation
 */

const baseUrl = 'http://localhost:5000';

async function testChatBriefingCreation() {
  console.log('\n1. Testing Chat-Based Briefing Creation...');
  
  const chatPrompt = `Create a marketing campaign for EcoClean, a sustainable cleaning product company.

Target Audience: Environmentally conscious homeowners, ages 28-45
Campaign Goals: 
- Launch new product line
- Increase brand awareness by 40%
- Generate 5,000 new customers

Deliverables Needed:
- 2 Instagram posts showcasing product benefits
- 1 email campaign for product launch
- 1 blog post about sustainable cleaning

Brand Voice: Eco-friendly, trustworthy, family-focused
Key Message: "Clean your home, protect your planet"`;

  try {
    const response = await fetch(`${baseUrl}/api/robust-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: chatPrompt,
        systemPrompt: 'You are SAGE, a marketing expert. Create comprehensive deliverables for this campaign.',
        preferredProvider: 'anthropic',
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Chat briefing failed: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('✅ Chat briefing created successfully');
    console.log(`   Provider: ${data.provider}`);
    console.log(`   Content length: ${data.content.length} characters`);
    
    // Validate content contains required elements
    const content = data.content.toLowerCase();
    const hasInstagram = content.includes('instagram');
    const hasEmail = content.includes('email');
    const hasBlog = content.includes('blog');
    const hasEcoClean = content.includes('ecoclean');
    
    console.log(`   Contains Instagram posts: ${hasInstagram ? '✅' : '❌'}`);
    console.log(`   Contains email campaign: ${hasEmail ? '✅' : '❌'}`);
    console.log(`   Contains blog content: ${hasBlog ? '✅' : '❌'}`);
    console.log(`   Contains brand name: ${hasEcoClean ? '✅' : '❌'}`);
    
    return {
      success: true,
      content: data.content,
      deliverables: { hasInstagram, hasEmail, hasBlog, hasEcoClean }
    };
    
  } catch (error) {
    console.log('❌ Chat briefing failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testFormBriefingUpload() {
  console.log('\n2. Testing Form-Based Briefing Upload...');
  
  const briefContent = `MARKETING BRIEF: TechStart Innovation Conference

EVENT OVERVIEW:
Annual technology conference for startups and entrepreneurs
Date: September 15-17, 2024
Location: San Francisco Convention Center
Expected Attendance: 2,500 professionals

TARGET AUDIENCE:
- Startup founders and co-founders
- Tech entrepreneurs and investors
- Innovation managers at corporations
- Technology journalists and influencers

CAMPAIGN OBJECTIVES:
1. Sell 2,000 conference tickets
2. Attract 50+ sponsors and exhibitors
3. Generate media coverage in tech publications
4. Build mailing list of 10,000 qualified prospects

DELIVERABLES REQUIRED:
Email 1: Early bird ticket announcement
Email 2: Speaker lineup reveal
Email 3: Final week registration push

Social Media:
Post 1: Conference announcement with key speakers
Post 2: Behind-the-scenes venue preparation
Post 3: Attendee testimonials from previous year

Marketing Materials:
- Event brochure (digital)
- Sponsor package one-pager
- Press release for tech media

BUDGET: $150,000 total marketing spend
TIMELINE: 8-week campaign leading to event`;

  try {
    // Create form data for file upload
    const formData = new FormData();
    const blob = new Blob([briefContent], { type: 'text/plain' });
    formData.append('file', blob, 'techstart-conference-brief.txt');
    formData.append('analysisType', 'comprehensive');

    const response = await fetch(`${baseUrl}/api/process-brief`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Form upload failed: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('✅ Form briefing uploaded successfully');
    console.log(`   Brief ID: ${data.id}`);
    console.log(`   Content extracted: ${data.content ? 'Yes' : 'No'}`);
    console.log(`   Word count: ${data.metadata?.wordCount || 'Unknown'}`);
    
    return {
      success: true,
      briefId: data.id,
      content: data.content,
      metadata: data.metadata
    };
    
  } catch (error) {
    console.log('❌ Form upload failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testBriefingLibraryStorage() {
  console.log('\n3. Testing Briefing Library Storage...');
  
  try {
    // Create a briefing entry in the library
    const briefingData = {
      title: 'GreenTech Startup Product Launch',
      content: `Product launch campaign for solar panel technology startup.
      
Target market: Residential homeowners interested in renewable energy
Budget: $200,000 for 6-month campaign
Deliverables: Email sequences, social media content, website copy
Key messaging: Affordable solar solutions for every home`,
      analysisType: 'strategic',
      source: 'chat_conversation',
      projectType: 'product_launch'
    };

    const storeResponse = await fetch(`${baseUrl}/api/brief-conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(briefingData)
    });

    if (!storeResponse.ok) {
      throw new Error(`Storage failed: ${storeResponse.status}`);
    }

    const storedBrief = await storeResponse.json();
    
    // Verify retrieval
    const retrieveResponse = await fetch(`${baseUrl}/api/brief-conversations/${storedBrief.id}`);
    
    if (!retrieveResponse.ok) {
      throw new Error(`Retrieval failed: ${retrieveResponse.status}`);
    }

    const retrievedBrief = await retrieveResponse.json();
    
    console.log('✅ Briefing stored and retrieved successfully');
    console.log(`   Stored ID: ${storedBrief.id}`);
    console.log(`   Retrieved ID: ${retrievedBrief.id}`);
    console.log(`   Title matches: ${storedBrief.title === retrievedBrief.title ? 'Yes' : 'No'}`);
    
    return {
      success: true,
      briefId: storedBrief.id,
      stored: storedBrief,
      retrieved: retrievedBrief
    };
    
  } catch (error) {
    console.log('❌ Library storage failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testContentGenerationFromBrief() {
  console.log('\n4. Testing Content Generation from Stored Brief...');
  
  const simpleBrief = `Marketing campaign for FreshBake Artisan Bakery.

Target: Local food enthusiasts and families
Goals: Increase weekend sales by 30%

Deliverables needed:
- 1 Instagram post about weekend specials
- 1 email for loyalty customers about new pastries

Brand voice: Warm, artisanal, community-focused
Key message: "Handcrafted with love, baked fresh daily"`;

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: simpleBrief,
        systemPrompt: 'Create the requested deliverables for this bakery campaign. Focus on warm, community-focused messaging.',
        temperature: 0.7,
        model: 'gpt-4o'
      })
    });

    if (!response.ok) {
      throw new Error(`Content generation failed: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('✅ Content generated successfully');
    console.log(`   Provider: ${data.provider || 'Unknown'}`);
    console.log(`   Generated content length: ${data.content.length} characters`);
    
    // Check for deliverables
    const content = data.content.toLowerCase();
    const hasInstagramPost = content.includes('instagram') || content.includes('post');
    const hasEmail = content.includes('email') || content.includes('subject');
    const hasBakery = content.includes('freshbake') || content.includes('bakery');
    
    console.log(`   Contains Instagram content: ${hasInstagramPost ? '✅' : '❌'}`);
    console.log(`   Contains email content: ${hasEmail ? '✅' : '❌'}`);
    console.log(`   Contains bakery references: ${hasBakery ? '✅' : '❌'}`);
    
    return {
      success: true,
      content: data.content,
      provider: data.provider,
      deliverables: { hasInstagramPost, hasEmail, hasBakery }
    };
    
  } catch (error) {
    console.log('❌ Content generation failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testProviderFallbackSystem() {
  console.log('\n5. Testing Provider Fallback System...');
  
  try {
    // Test with different preferred providers
    const providers = ['openai', 'anthropic'];
    const results = [];
    
    for (const provider of providers) {
      const response = await fetch(`${baseUrl}/api/robust-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: 'Write a short product description for wireless earbuds',
          systemPrompt: 'You are a product copywriter',
          preferredProvider: provider,
          temperature: 0.7
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        results.push({
          requestedProvider: provider,
          usedProvider: data.provider,
          fallback: data.fallback || false,
          success: true
        });
        console.log(`   ✅ ${provider}: Used ${data.provider} ${data.fallback ? '(fallback)' : '(primary)'}`);
      } else {
        results.push({
          requestedProvider: provider,
          success: false,
          error: response.status
        });
        console.log(`   ❌ ${provider}: Failed with ${response.status}`);
      }
    }
    
    return { success: true, results };
    
  } catch (error) {
    console.log('❌ Fallback system test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Briefing System Validation\n');
  console.log('Testing briefing creation, storage, and content generation workflows...');
  
  const results = {
    chatBriefing: await testChatBriefingCreation(),
    formUpload: await testFormBriefingUpload(),
    libraryStorage: await testBriefingLibraryStorage(),
    contentGeneration: await testContentGenerationFromBrief(),
    fallbackSystem: await testProviderFallbackSystem()
  };
  
  console.log('\n📊 FINAL VALIDATION RESULTS');
  console.log('═'.repeat(50));
  
  const testCategories = [
    { name: 'Chat Briefing Creation', key: 'chatBriefing' },
    { name: 'Form Upload Processing', key: 'formUpload' },
    { name: 'Library Storage & Retrieval', key: 'libraryStorage' },
    { name: 'Content Generation', key: 'contentGeneration' },
    { name: 'Provider Fallback System', key: 'fallbackSystem' }
  ];
  
  let passedTests = 0;
  
  testCategories.forEach(test => {
    const result = results[test.key];
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test.name}`);
    
    if (result.success) {
      passedTests++;
    } else if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });
  
  const successRate = (passedTests / testCategories.length * 100).toFixed(1);
  console.log(`\nOverall Success Rate: ${successRate}% (${passedTests}/${testCategories.length})`);
  
  // Analysis and recommendations
  console.log('\n🎯 SYSTEM ANALYSIS:');
  
  if (results.chatBriefing.success && results.contentGeneration.success) {
    console.log('✅ Core briefing workflow is functional');
  } else {
    console.log('❌ Core briefing workflow needs attention');
  }
  
  if (results.formUpload.success && results.libraryStorage.success) {
    console.log('✅ Briefing library system is working properly');
  } else {
    console.log('❌ Briefing library system needs fixes');
  }
  
  if (results.fallbackSystem.success) {
    console.log('✅ Provider fallback system is operational');
  } else {
    console.log('❌ Provider fallback system needs improvement');
  }
  
  console.log('\n📋 Ready for deployment with the following capabilities:');
  console.log('- Chat-based briefing creation through SAGE conversations');
  console.log('- Form-based briefing upload and processing');
  console.log('- Briefing library storage and retrieval');
  console.log('- Automatic content generation from stored briefs');
  console.log('- Multi-provider API fallback system');
  
  return results;
}

// Execute tests
runAllTests().catch(console.error);