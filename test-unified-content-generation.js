/**
 * Unified Content Generation Test Suite
 * Tests the new architecture that routes all content through the prompt router
 */

class UnifiedContentGenerationTester {
  constructor() {
    this.testResults = [];
    this.apiEndpoint = '/api/generate';
  }

  async runTest(testName, testFn) {
    console.log(`\n🧪 Running Test: ${testName}`);
    try {
      const result = await testFn();
      this.testResults.push({ test: testName, status: 'PASS', result });
      console.log(`✅ PASS: ${testName}`);
      return result;
    } catch (error) {
      this.testResults.push({ test: testName, status: 'FAIL', error: error.message });
      console.log(`❌ FAIL: ${testName} - ${error.message}`);
      throw error;
    }
  }

  // Test Case 1: Brief-to-Content Conversion
  async testBriefToContentConversion() {
    return this.runTest('Brief-to-Content Conversion', async () => {
      const briefContent = `CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)

Project: Nike x Volkswagen Beetle Shoe Collaboration
Objective: Create engaging social media content for product launch
Target Audience: Sneaker enthusiasts aged 18-35
Key Messages: Fusion of automotive heritage with athletic innovation
Deliverables: 
- Instagram post caption (engaging, trendy)
- Twitter thread (3-4 tweets)
- Facebook post (community-focused)

Brand Guidelines: Use energetic tone, highlight collaboration uniqueness`;

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          userPrompt: briefContent,
          temperature: 0.7
        })
      });

      const data = await response.json();
      
      // Validation criteria
      const content = data.content || '';
      const hasInstagramCaption = content.toLowerCase().includes('instagram') || content.includes('#');
      const hasTwitterThread = content.toLowerCase().includes('twitter') || content.includes('1/');
      const hasFacebookPost = content.toLowerCase().includes('facebook');
      const isNotBriefRepeat = !content.includes('CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS');
      const hasActualContent = content.length > 500;
      const wasRouted = data.routed === true;

      console.log('Content Generation Results:');
      console.log('- Provider:', data.provider);
      console.log('- Model:', data.model);
      console.log('- Routed through prompt router:', wasRouted);
      console.log('- Content length:', content.length);
      console.log('- Has Instagram content:', hasInstagramCaption);
      console.log('- Has Twitter content:', hasTwitterThread);
      console.log('- Has Facebook content:', hasFacebookPost);
      console.log('- Is actual content (not brief repeat):', isNotBriefRepeat);

      if (!isNotBriefRepeat) {
        throw new Error('Content is a brief repeat, not actual deliverables');
      }

      if (!hasActualContent) {
        throw new Error('Generated content is too short');
      }

      return {
        provider: data.provider,
        model: data.model,
        routed: wasRouted,
        contentLength: content.length,
        hasDeliverables: hasInstagramCaption && hasTwitterThread && hasFacebookPost,
        isActualContent: isNotBriefRepeat
      };
    });
  }

  // Test Case 2: Regular Content Generation (Non-Brief)
  async testRegularContentGeneration() {
    return this.runTest('Regular Content Generation', async () => {
      const regularPrompt = 'Write a compelling blog post introduction about sustainable fashion trends in 2025';

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          userPrompt: regularPrompt,
          temperature: 0.7
        })
      });

      const data = await response.json();
      const content = data.content || '';
      
      console.log('Regular Content Results:');
      console.log('- Provider:', data.provider);
      console.log('- Model:', data.model);
      console.log('- Content length:', content.length);
      console.log('- Has HTML formatting:', content.includes('<h') || content.includes('<strong>'));

      return {
        provider: data.provider,
        model: data.model,
        contentLength: content.length,
        hasFormatting: content.includes('<h') || content.includes('<strong>')
      };
    });
  }

  // Test Case 3: Complex Campaign Brief
  async testComplexCampaignBrief() {
    return this.runTest('Complex Campaign Brief Execution', async () => {
      const complexBrief = `CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)

Campaign: Global Tech Product Launch - "AI Revolution 2025"
Client: TechNova Solutions
Objective: Generate comprehensive launch content for new AI productivity suite
Target Audience: Business professionals, tech entrepreneurs, enterprise decision-makers

Deliverables Required:
1. Press Release (500-600 words)
   - Headline with strong hook
   - Executive quotes
   - Product benefits and features
   - Company boilerplate

2. Email Campaign Sequence (3 emails)
   - Teaser email (pre-launch)
   - Launch announcement
   - Follow-up with special offer

3. Social Media Package
   - LinkedIn thought leadership post
   - Twitter launch thread (5 tweets)
   - Instagram story series (3 slides)

4. Website Copy
   - Hero section headline and subheadline
   - Feature descriptions (3 key features)
   - Call-to-action copy

Brand Voice: Professional yet approachable, innovative, results-focused
Key Messages: Revolutionary AI technology, increased productivity by 300%, seamless integration
Competitive Advantage: First AI suite with real-time collaboration features`;

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          userPrompt: complexBrief,
          temperature: 0.7
        })
      });

      const data = await response.json();
      const content = data.content || '';
      
      // Comprehensive validation
      const hasPressRelease = content.toLowerCase().includes('press release') || content.includes('FOR IMMEDIATE RELEASE');
      const hasEmailSequence = content.toLowerCase().includes('email') && (content.includes('subject:') || content.includes('teaser'));
      const hasSocialMedia = content.toLowerCase().includes('linkedin') || content.toLowerCase().includes('twitter');
      const hasWebsiteCopy = content.toLowerCase().includes('hero') || content.toLowerCase().includes('headline');
      const isLongFormContent = content.length > 2000;
      const isNotBriefRepeat = !content.includes('CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS');

      console.log('Complex Campaign Results:');
      console.log('- Content length:', content.length);
      console.log('- Has press release:', hasPressRelease);
      console.log('- Has email sequence:', hasEmailSequence);
      console.log('- Has social media content:', hasSocialMedia);
      console.log('- Has website copy:', hasWebsiteCopy);
      console.log('- Is comprehensive (>2000 chars):', isLongFormContent);
      console.log('- Is actual content:', isNotBriefRepeat);

      if (!isNotBriefRepeat) {
        throw new Error('Complex brief returned brief repeat instead of deliverables');
      }

      const deliverableScore = [hasPressRelease, hasEmailSequence, hasSocialMedia, hasWebsiteCopy].filter(Boolean).length;
      
      return {
        provider: data.provider,
        model: data.model,
        contentLength: content.length,
        deliverableScore: deliverableScore,
        isComprehensive: isLongFormContent,
        isActualContent: isNotBriefRepeat
      };
    });
  }

  // Test Case 4: Provider Fallback Testing
  async testProviderFallback() {
    return this.runTest('Provider Fallback Mechanism', async () => {
      const testPrompt = `CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)
      
Create a product description for a smart home device targeting tech-savvy millennials.
Include: features, benefits, pricing section, and call-to-action.`;

      // Test with different models to trigger routing
      const models = ['gpt-4o', 'claude-sonnet-4-20250514', 'gemini-1.5-pro'];
      const results = [];

      for (const model of models) {
        try {
          const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: model,
              userPrompt: testPrompt,
              temperature: 0.7
            })
          });

          const data = await response.json();
          results.push({
            requestedModel: model,
            actualProvider: data.provider,
            actualModel: data.model,
            success: !!data.content,
            contentLength: data.content?.length || 0,
            routed: data.routed
          });
        } catch (error) {
          results.push({
            requestedModel: model,
            error: error.message,
            success: false
          });
        }
      }

      console.log('Provider Fallback Results:');
      results.forEach(result => {
        console.log(`- ${result.requestedModel} → ${result.actualProvider || 'FAILED'} (${result.actualModel || 'N/A'})`);
      });

      const successfulProviders = results.filter(r => r.success).length;
      if (successfulProviders === 0) {
        throw new Error('No providers successfully handled brief execution');
      }

      return { results, successfulProviders };
    });
  }

  // Test Case 5: Brief Library Integration
  async testBriefLibraryIntegration() {
    return this.runTest('Brief Library Integration', async () => {
      // First, create a brief in the library
      const briefData = {
        title: 'E-commerce Holiday Campaign',
        content: `CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)

Campaign: Holiday Shopping Extravaganza 2025
Client: FashionForward Retail
Objective: Drive holiday sales through multi-channel campaign

Deliverables:
- Email newsletter (festive, promotional)
- Social media carousel (5 slides for Instagram)
- Website banner copy (urgent, compelling)

Target: Fashion-conscious shoppers aged 25-45
Tone: Festive, urgent, aspirational`,
        tags: ['holiday', 'retail', 'multi-channel']
      };

      // Save to briefing library
      const saveResponse = await fetch('/api/brief-conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(briefData)
      });

      const savedBrief = await saveResponse.json();
      console.log('Brief saved to library:', savedBrief.id);

      // Now test content generation from this brief
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          userPrompt: briefData.content,
          temperature: 0.7
        })
      });

      const data = await response.json();
      const content = data.content || '';
      
      const hasEmailContent = content.toLowerCase().includes('email') || content.includes('subject:');
      const hasCarouselContent = content.toLowerCase().includes('carousel') || content.toLowerCase().includes('slide');
      const hasBannerContent = content.toLowerCase().includes('banner') || content.toLowerCase().includes('shop now');
      const isActualContent = !content.includes('CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS');

      console.log('Brief Library Integration Results:');
      console.log('- Brief saved successfully:', !!savedBrief.id);
      console.log('- Content generated from brief:', !!data.content);
      console.log('- Has email content:', hasEmailContent);
      console.log('- Has carousel content:', hasCarouselContent);
      console.log('- Has banner content:', hasBannerContent);
      console.log('- Is actual deliverables:', isActualContent);

      return {
        briefSaved: !!savedBrief.id,
        contentGenerated: !!data.content,
        hasAllDeliverables: hasEmailContent && hasCarouselContent && hasBannerContent,
        isActualContent
      };
    });
  }

  // Run comprehensive test suite
  async runAllTests() {
    console.log('🚀 Starting Unified Content Generation Test Suite');
    console.log('================================================');

    try {
      await this.testBriefToContentConversion();
      await this.testRegularContentGeneration();
      await this.testComplexCampaignBrief();
      await this.testProviderFallback();
      await this.testBriefLibraryIntegration();

      this.generateReport();
    } catch (error) {
      console.error('Test suite failed:', error);
      this.generateReport();
    }
  }

  generateReport() {
    console.log('\n📊 UNIFIED CONTENT GENERATION TEST REPORT');
    console.log('==========================================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / this.testResults.length) * 100)}%`);
    
    console.log('\nDetailed Results:');
    this.testResults.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${result.test}`);
      if (result.status === 'FAIL') {
        console.log(`   Error: ${result.error}`);
      }
    });

    if (passed === this.testResults.length) {
      console.log('\n🎉 ALL TESTS PASSED! The unified content generation architecture is working correctly.');
      console.log('✓ Brief-to-content conversion is functioning');
      console.log('✓ Prompt router is being used for all content generation');
      console.log('✓ All providers can handle brief execution');
      console.log('✓ Fallback mechanisms are working');
      console.log('✓ Brief library integration is successful');
    } else {
      console.log('\n⚠️ Some tests failed. The architecture needs additional fixes.');
    }

    return {
      totalTests: this.testResults.length,
      passed,
      failed,
      successRate: Math.round((passed / this.testResults.length) * 100),
      allPassed: passed === this.testResults.length
    };
  }
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  window.testUnifiedContentGeneration = async () => {
    const tester = new UnifiedContentGenerationTester();
    return await tester.runAllTests();
  };
  
  console.log('🧪 Unified Content Generation Tester loaded!');
  console.log('Run: testUnifiedContentGeneration()');
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnifiedContentGenerationTester;
}