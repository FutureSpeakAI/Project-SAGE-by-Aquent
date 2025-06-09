/**
 * SAGE Platform Comprehensive Test Automation
 * Executes all three test cases and reports detailed results
 */

const axios = require('axios');
const fs = require('fs');

class SAGETestRunner {
  constructor() {
    this.baseURL = 'http://localhost:5000';
    this.results = {
      case1: { passed: [], failed: [], errors: [] },
      case2: { passed: [], failed: [], errors: [] },
      case3: { passed: [], failed: [], errors: [] }
    };
    this.testData = {
      briefingContent: `CAMPAIGN BRIEF: AI-Powered Fitness Tracker Launch

Product: FitSync Pro - Advanced AI fitness tracker with personalized coaching
Target Audience: Health-conscious millennials and Gen Z (ages 22-40)
Campaign Objective: Product launch with 15% market penetration in Q1
Key Messages: "Your Personal AI Coach", "Fitness Made Intelligent"
Deliverables Required:
- Hero product photography for website and ads
- Lifestyle imagery showing real usage scenarios  
- Social media visual assets (Instagram, TikTok, LinkedIn)
- Press release and launch announcement
- Email campaign sequence (3 emails)
- Influencer partnership content guidelines

Brand Guidelines:
- Primary colors: Electric blue (#00D4FF), Deep navy (#1A2332)
- Secondary: Vibrant green (#00FF88), Clean white (#FFFFFF)
- Tone: Innovative, approachable, scientifically-backed
- Logo: Must appear in top-right or bottom-right of all visuals

Technical Requirements:
- High resolution images (300dpi minimum)
- Multiple aspect ratios (16:9, 4:5, 1:1, 9:16)
- Text-friendly backgrounds for overlay graphics
- Professional commercial photography quality`,

      pdfContent: `Partnership Agreement: Nike x Volkswagen "Beetle Shoe" Collection

This collaboration merges Nike's athletic innovation with Volkswagen's iconic Beetle design heritage to create a limited-edition footwear line that embodies "Old School Cool" with modern performance.

Product Concept:
The "Beetle Shoe" collection features three distinct models inspired by classic Beetle design elements:
1. Classic Beetle Runner - Retro-inspired with signature Beetle curves
2. Beetle Sport - Performance model with aerodynamic Beetle-inspired design  
3. Beetle Lifestyle - Casual wear with vintage Beetle color schemes

Marketing Strategy:
Target automotive enthusiasts and sneaker collectors who appreciate heritage design and craftsmanship. Campaign should emphasize the fusion of German engineering precision with American athletic innovation.

Visual Requirements:
- Product hero shots showcasing design details
- Lifestyle photography in automotive/urban settings
- Co-branded marketing materials
- Social media content highlighting collaboration story
- Influencer partnerships with automotive and fashion personalities`
    };
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testAPI(endpoint, method = 'GET', data = null) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        timeout: 30000
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
        status: error.response?.status,
        details: error.response?.data 
      };
    }
  }

  async runTestCase1() {
    console.log('\n🧪 EXECUTING TEST CASE 1: Global Tech Product Launch Campaign');
    console.log('=' .repeat(70));
    
    // Test 1.1: API Health Check
    console.log('\n📋 Phase 1: System Health Verification');
    const healthCheck = await this.testAPI('/api/status');
    if (!healthCheck.success) {
      this.results.case1.errors.push('System health check failed');
      return;
    }
    console.log('✓ System health check passed');
    this.results.case1.passed.push('System health check');

    // Test 1.2: Models API
    console.log('\n📋 Phase 2: Model Availability Check');
    const modelsCheck = await this.testAPI('/api/models');
    if (!modelsCheck.success) {
      this.results.case1.errors.push('Models API failed');
      return;
    }
    
    const models = modelsCheck.data;
    const requiredModels = ['gpt-4o', 'claude-sonnet-4-20250514', 'gpt-image-1'];
    const missingModels = requiredModels.filter(model => 
      !models.openai?.includes(model) && 
      !models.anthropic?.includes(model) && 
      !models.imageGeneration?.openai?.includes(model)
    );
    
    if (missingModels.length > 0) {
      this.results.case1.failed.push(`Missing critical models: ${missingModels.join(', ')}`);
    } else {
      console.log('✓ All critical models available');
      this.results.case1.passed.push('Model availability verification');
    }

    // Test 1.3: Personas API
    console.log('\n📋 Phase 3: Personas System Check');
    const personasCheck = await this.testAPI('/api/personas');
    if (!personasCheck.success) {
      this.results.case1.errors.push('Personas API failed');
    } else {
      const personas = personasCheck.data;
      const requiredPersonas = ['Brand Tone Research', 'Strategic Marketing Consultant', 'Creative Content Strategist'];
      const availablePersonaNames = personas.map(p => p.name);
      const missingPersonas = requiredPersonas.filter(name => 
        !availablePersonaNames.some(available => available.includes(name.split(' ')[0]))
      );
      
      if (missingPersonas.length > 0) {
        this.results.case1.failed.push(`Missing personas: ${missingPersonas.join(', ')}`);
      } else {
        console.log('✓ Core personas available');
        this.results.case1.passed.push('Personas system verification');
      }
    }

    // Test 1.4: Content Generation with Research Query
    console.log('\n📋 Phase 4: Research Query Processing');
    const researchQuery = {
      model: 'llama-3.1-sonar-large-128k-online',
      systemPrompt: 'You are a strategic marketing research specialist.',
      userPrompt: 'Analyze the competitive landscape for AI-powered fitness trackers targeting millennials and Gen Z. Focus on positioning opportunities and key differentiators.',
      temperature: 0.7
    };
    
    const researchTest = await this.testAPI('/api/generate-content', 'POST', researchQuery);
    if (!researchTest.success) {
      this.results.case1.failed.push('Research query generation failed');
      console.log('✗ Research query failed:', researchTest.error);
    } else {
      console.log('✓ Research query processed successfully');
      console.log('Research response length:', researchTest.data.content?.length || 0, 'characters');
      this.results.case1.passed.push('Research query processing');
    }
    
    await this.delay(2000);

    // Test 1.5: Briefing Creation
    console.log('\n📋 Phase 5: Briefing System Test');
    const briefingData = {
      title: 'AI Fitness Tracker Launch Campaign',
      content: this.testData.briefingContent,
      contentType: 'campaign_brief',
      metadata: {
        campaign: 'FitSync Pro Launch',
        client: 'TechFit Industries',
        status: 'active'
      }
    };
    
    const briefingTest = await this.testAPI('/api/generated-contents', 'POST', briefingData);
    if (!briefingTest.success) {
      this.results.case1.failed.push('Briefing creation failed');
      console.log('✗ Briefing creation failed:', briefingTest.error);
    } else {
      console.log('✓ Briefing created successfully');
      this.results.case1.passed.push('Briefing creation and storage');
      this.testData.createdBriefingId = briefingTest.data.id;
    }

    // Test 1.6: Brief Interpretation for Visuals
    console.log('\n📋 Phase 6: Brief Interpretation Test');
    const interpretData = {
      brief: this.testData.briefingContent,
      model: 'gpt-4o'
    };
    
    const interpretTest = await this.testAPI('/api/interpret-brief', 'POST', interpretData);
    if (!interpretTest.success) {
      this.results.case1.failed.push('Brief interpretation failed');
      console.log('✗ Brief interpretation failed:', interpretTest.error);
    } else {
      console.log('✓ Brief interpretation successful');
      console.log('Generated prompt length:', interpretTest.data.prompt?.length || 0, 'characters');
      this.results.case1.passed.push('Brief interpretation processing');
      this.testData.generatedPrompt = interpretTest.data.prompt;
    }
    
    await this.delay(2000);

    // Test 1.7: Content Library Retrieval
    console.log('\n📋 Phase 7: Content Library Test');
    const libraryTest = await this.testAPI('/api/generated-contents');
    if (!libraryTest.success) {
      this.results.case1.failed.push('Content library retrieval failed');
    } else {
      const contents = libraryTest.data;
      console.log(`✓ Content library accessible (${contents.length} items)`);
      this.results.case1.passed.push('Content library functionality');
    }

    // Test 1.8: Image Generation 
    console.log('\n📋 Phase 8: Image Generation Test');
    if (this.testData.generatedPrompt) {
      const imageData = {
        prompt: this.testData.generatedPrompt.substring(0, 500), // Truncate for test
        model: 'gpt-image-1',
        size: '1024x1024',
        quality: 'high'
      };
      
      const imageTest = await this.testAPI('/api/generate-image', 'POST', imageData);
      if (!imageTest.success) {
        this.results.case1.failed.push('Image generation failed');
        console.log('✗ Image generation failed:', imageTest.error);
      } else {
        console.log('✓ Image generation successful');
        this.results.case1.passed.push('Image generation with GPT-image-1');
      }
    } else {
      this.results.case1.failed.push('No prompt available for image generation');
    }
  }

  async runTestCase2() {
    console.log('\n🧪 EXECUTING TEST CASE 2: Multi-Brand Partnership Campaign');
    console.log('=' .repeat(70));
    
    // Test 2.1: Complex Briefing with Multiple Requirements
    console.log('\n📋 Phase 1: Complex Multi-Brand Briefing');
    const partnershipBriefing = {
      title: 'Nike x Volkswagen Beetle Shoe Collection',
      content: this.testData.pdfContent,
      contentType: 'partnership_brief',
      metadata: {
        brands: ['Nike', 'Volkswagen'],
        collaboration: true,
        deliverables: ['product_shots', 'lifestyle_imagery', 'social_content']
      }
    };
    
    const complexBriefingTest = await this.testAPI('/api/generated-contents', 'POST', partnershipBriefing);
    if (!complexBriefingTest.success) {
      this.results.case2.failed.push('Complex briefing creation failed');
    } else {
      console.log('✓ Complex multi-brand briefing created');
      this.results.case2.passed.push('Complex briefing handling');
      this.testData.partnershipBriefingId = complexBriefingTest.data.id;
    }

    // Test 2.2: Advanced Content Generation with Different Models
    console.log('\n📋 Phase 2: Multi-Model Content Generation');
    const contentVariations = [
      {
        model: 'gpt-4o',
        systemPrompt: 'You are a creative copywriter specializing in automotive and fashion collaboration campaigns.',
        userPrompt: 'Create a press release for the Nike x Volkswagen Beetle Shoe collaboration emphasizing innovation and heritage.',
        temperature: 0.8
      },
      {
        model: 'claude-sonnet-4-20250514',
        systemPrompt: 'You are a brand strategist developing social media content for luxury collaborations.',
        userPrompt: 'Write Instagram captions for the Nike x Volkswagen Beetle Shoe collection launch, emphasizing craftsmanship and design.',
        temperature: 0.7
      }
    ];
    
    for (let i = 0; i < contentVariations.length; i++) {
      const contentTest = await this.testAPI('/api/generate-content', 'POST', contentVariations[i]);
      if (!contentTest.success) {
        this.results.case2.failed.push(`Content generation failed for model ${contentVariations[i].model}`);
      } else {
        console.log(`✓ Content generated with ${contentVariations[i].model}`);
        this.results.case2.passed.push(`Content generation with ${contentVariations[i].model}`);
      }
      await this.delay(1500);
    }

    // Test 2.3: Brief Interpretation for Multiple Visual Assets
    console.log('\n📋 Phase 3: Multi-Asset Visual Brief Processing');
    const multiAssetInterpret = {
      brief: this.testData.pdfContent,
      model: 'gpt-4o'
    };
    
    const multiAssetTest = await this.testAPI('/api/interpret-brief', 'POST', multiAssetInterpret);
    if (!multiAssetTest.success) {
      this.results.case2.failed.push('Multi-asset brief interpretation failed');
    } else {
      console.log('✓ Multi-asset brief interpretation successful');
      this.results.case2.passed.push('Multi-asset brief processing');
      
      // Check if multiple prompts were generated
      const prompt = multiAssetTest.data.prompt;
      const hasMultiplePrompts = prompt && (
        prompt.includes('FINAL PROMPT 1') || 
        prompt.includes('Image 1:') ||
        prompt.includes('three') ||
        prompt.includes('multiple')
      );
      
      if (hasMultiplePrompts) {
        console.log('✓ Multiple visual concepts detected in response');
        this.results.case2.passed.push('Multiple visual concept generation');
      } else {
        this.results.case2.failed.push('Multiple visual concepts not properly generated');
      }
    }
  }

  async runTestCase3() {
    console.log('\n🧪 EXECUTING TEST CASE 3: Crisis Communication Response');
    console.log('=' .repeat(70));
    
    // Test 3.1: Real-time Research Capability
    console.log('\n📋 Phase 1: Real-time Research Processing');
    const crisisResearch = {
      model: 'llama-3.1-sonar-small-128k-online',
      systemPrompt: 'You are a crisis communication specialist providing real-time market analysis.',
      userPrompt: 'Analyze current trends in crisis communication best practices for technology companies facing product issues.',
      temperature: 0.6
    };
    
    const crisisResearchTest = await this.testAPI('/api/generate-content', 'POST', crisisResearch);
    if (!crisisResearchTest.success) {
      this.results.case3.failed.push('Crisis research query failed');
    } else {
      console.log('✓ Crisis research processing successful');
      this.results.case3.passed.push('Real-time crisis research');
    }

    // Test 3.2: Rapid Content Generation
    console.log('\n📋 Phase 2: Rapid Response Content Generation');
    const rapidContent = {
      model: 'gpt-4o',
      systemPrompt: 'You are a crisis communication expert creating urgent response materials.',
      userPrompt: 'Create a crisis response statement for a fitness tracker company addressing data privacy concerns. Be transparent, reassuring, and action-oriented.',
      temperature: 0.5
    };
    
    const rapidContentTest = await this.testAPI('/api/generate-content', 'POST', rapidContent);
    if (!rapidContentTest.success) {
      this.results.case3.failed.push('Rapid content generation failed');
    } else {
      console.log('✓ Rapid crisis content generated');
      this.results.case3.passed.push('Crisis content generation');
    }

    // Test 3.3: Emergency Visual Asset Creation
    console.log('\n📋 Phase 3: Emergency Visual Asset Generation');
    const emergencyVisual = {
      prompt: 'Professional corporate crisis communication image featuring calm, trustworthy executive in modern office setting, clean background suitable for text overlay, high contrast lighting, serious but reassuring expression, business formal attire, neutral color palette',
      model: 'gpt-image-1',
      size: '1024x1024',
      quality: 'high'
    };
    
    const emergencyVisualTest = await this.testAPI('/api/generate-image', 'POST', emergencyVisual);
    if (!emergencyVisualTest.success) {
      this.results.case3.failed.push('Emergency visual generation failed');
    } else {
      console.log('✓ Emergency visual asset generated');
      this.results.case3.passed.push('Crisis visual asset creation');
    }

    // Test 3.4: System Performance Under Load
    console.log('\n📋 Phase 4: System Load Testing');
    const loadTests = [];
    for (let i = 0; i < 3; i++) {
      loadTests.push(this.testAPI('/api/status'));
    }
    
    try {
      const loadResults = await Promise.all(loadTests);
      const allPassed = loadResults.every(result => result.success);
      
      if (allPassed) {
        console.log('✓ System maintains performance under concurrent load');
        this.results.case3.passed.push('Concurrent request handling');
      } else {
        this.results.case3.failed.push('System performance degraded under load');
      }
    } catch (error) {
      this.results.case3.failed.push('Load testing failed');
    }
  }

  generateReport() {
    console.log('\n\n📊 COMPREHENSIVE TEST RESULTS REPORT');
    console.log('=' .repeat(80));
    
    const allResults = [
      { name: 'Case 1: Global Tech Launch', results: this.results.case1 },
      { name: 'Case 2: Multi-Brand Partnership', results: this.results.case2 },
      { name: 'Case 3: Crisis Communication', results: this.results.case3 }
    ];
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalErrors = 0;
    
    allResults.forEach(testCase => {
      console.log(`\n🧪 ${testCase.name}`);
      console.log('-' .repeat(50));
      
      console.log(`✅ PASSED (${testCase.results.passed.length}):`);
      testCase.results.passed.forEach(test => console.log(`   ✓ ${test}`));
      
      if (testCase.results.failed.length > 0) {
        console.log(`❌ FAILED (${testCase.results.failed.length}):`);
        testCase.results.failed.forEach(test => console.log(`   ✗ ${test}`));
      }
      
      if (testCase.results.errors.length > 0) {
        console.log(`🚨 ERRORS (${testCase.results.errors.length}):`);
        testCase.results.errors.forEach(error => console.log(`   ⚠️  ${error}`));
      }
      
      totalPassed += testCase.results.passed.length;
      totalFailed += testCase.results.failed.length;
      totalErrors += testCase.results.errors.length;
    });
    
    console.log('\n📈 OVERALL SUMMARY');
    console.log('=' .repeat(40));
    console.log(`Total Tests: ${totalPassed + totalFailed + totalErrors}`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`🚨 Errors: ${totalErrors}`);
    
    const successRate = ((totalPassed / (totalPassed + totalFailed + totalErrors)) * 100).toFixed(1);
    console.log(`📊 Success Rate: ${successRate}%`);
    
    return {
      summary: {
        totalTests: totalPassed + totalFailed + totalErrors,
        passed: totalPassed,
        failed: totalFailed,
        errors: totalErrors,
        successRate: parseFloat(successRate)
      },
      details: this.results
    };
  }

  async run() {
    console.log('🚀 SAGE Platform Comprehensive Testing Suite');
    console.log('Testing all features across every module...\n');
    
    try {
      await this.runTestCase1();
      await this.delay(3000);
      
      await this.runTestCase2();
      await this.delay(3000);
      
      await this.runTestCase3();
      
      return this.generateReport();
    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
      return { error: error.message, results: this.results };
    }
  }
}

// Execute the tests
async function executeTests() {
  const runner = new SAGETestRunner();
  const results = await runner.run();
  
  // Save results to file
  fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Results saved to test-results.json');
  
  return results;
}

module.exports = { SAGETestRunner, executeTests };

// Run if called directly
if (require.main === module) {
  executeTests().catch(console.error);
}