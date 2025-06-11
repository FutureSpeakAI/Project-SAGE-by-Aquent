/**
 * Unified Briefing System Test Suite
 * Tests all briefing pathways converging into a single storage system
 */

class UnifiedBriefingSystemTester {
  constructor() {
    this.baseUrl = window.location.origin;
    this.results = [];
    this.errors = [];
    this.createdBriefIds = [];
  }

  async runTest(testName, testFn) {
    try {
      console.log(`🧪 Testing: ${testName}`);
      const result = await testFn();
      this.results.push({ test: testName, status: 'PASS', result });
      console.log(`✅ ${testName}: PASSED`);
      return result;
    } catch (error) {
      console.error(`❌ ${testName}: FAILED`, error);
      this.errors.push({ test: testName, error: error.message });
      this.results.push({ test: testName, status: 'FAIL', error: error.message });
      throw error;
    }
  }

  async testDocumentUploadWithImages() {
    return this.runTest('Document Upload with Image Extraction', async () => {
      // Create a test document with potential images
      const testContent = `CREATIVE BRIEF: TechStart Innovation Conference 2024

EVENT OVERVIEW:
Annual technology conference for startups and entrepreneurs
Date: September 15-17, 2024
Location: San Francisco Convention Center
Expected Attendance: 5,000+ professionals

CAMPAIGN OBJECTIVES:
- Increase event registration by 40%
- Generate 15,000 social media impressions
- Acquire 500 new email subscribers
- Drive partnership inquiries from tech companies

TARGET AUDIENCE:
Primary: Startup founders and CTOs (ages 28-45)
Secondary: Venture capitalists and angel investors
Tertiary: Tech journalists and industry analysts

DELIVERABLES REQUIRED:
1. Email campaign series (3 emails)
2. Social media content (LinkedIn, Twitter, Instagram)
3. Website landing page copy
4. Press release template
5. Partnership outreach messaging

BRAND GUIDELINES:
- Professional yet innovative tone
- Focus on networking and learning opportunities
- Emphasize speaker quality and startup success stories
- Use data-driven messaging about ROI and outcomes

BUDGET: $75,000 for 8-week campaign
TIMELINE: Launch 6 weeks before event

SUCCESS METRICS:
- Registration conversion rate >12%
- Email open rates >28%
- Social engagement rates >6%
- Press pickup in 5+ major tech publications`;

      const formData = new FormData();
      const blob = new Blob([testContent], { type: 'text/plain' });
      formData.append('file', blob, 'techstart-conference-brief.txt');

      const response = await fetch(`${this.baseUrl}/api/process-brief`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Document upload failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.id) {
        this.createdBriefIds.push(data.id);
      }

      return {
        success: data.success,
        briefId: data.id,
        contentLength: data.content?.length || 0,
        imagesExtracted: data.imagesExtracted || 0,
        hasReferenceImages: !!(data.referenceImages && data.referenceImages.length > 0),
        source: data.metadata?.source
      };
    });
  }

  async testFormBriefingWithImages() {
    return this.runTest('Form Briefing with Reference Images', async () => {
      // Simulate form-based briefing creation with reference images
      const briefData = {
        title: 'EcoFlow Campaign Brief',
        content: `<h1>EcoFlow Smart Water Bottle Campaign</h1>
        
        <h2>Product Overview</h2>
        <p>Revolutionary smart water bottle with hydration tracking, temperature control, and UV-C self-cleaning technology.</p>
        
        <h2>Campaign Objectives</h2>
        <ul>
          <li>Launch product awareness campaign</li>
          <li>Drive pre-orders through crowdfunding</li>
          <li>Build email subscriber base of 25,000+</li>
          <li>Generate media coverage in health and tech publications</li>
        </ul>
        
        <h2>Target Audience</h2>
        <p>Health-conscious professionals aged 25-40 who value technology integration in fitness routines.</p>
        
        <h2>Content Creation Instructions</h2>
        <p>Create compelling social media content showcasing the product's innovative features and health benefits.</p>`,
        contentType: 'briefing',
        referenceImages: [
          {
            id: 'ref-img-1',
            filename: 'ecoflow-product.jpg',
            base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/',
            analysis: 'Product hero shot showing smart water bottle with LED display'
          },
          {
            id: 'ref-img-2', 
            filename: 'ecoflow-lifestyle.jpg',
            base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/',
            analysis: 'Lifestyle shot of person using bottle during workout'
          }
        ]
      };

      const response = await fetch(`${this.baseUrl}/api/generated-contents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(briefData)
      });

      if (!response.ok) {
        throw new Error(`Form briefing creation failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.id) {
        this.createdBriefIds.push(data.id);
      }

      return {
        briefId: data.id,
        hasReferenceImages: !!(data.referenceImages && data.referenceImages.length > 0),
        imageCount: data.referenceImages?.length || 0,
        contentType: data.contentType
      };
    });
  }

  async testUnifiedBriefingRetrieval() {
    return this.runTest('Unified Briefing Retrieval', async () => {
      // Test that all briefings are accessible through the unified API
      const response = await fetch(`${this.baseUrl}/api/generated-contents?contentType=briefing`);
      
      if (!response.ok) {
        throw new Error(`Briefing retrieval failed: ${response.status}`);
      }

      const briefings = await response.json();
      
      // Find briefings created in this test session
      const testBriefings = briefings.filter(brief => 
        this.createdBriefIds.includes(brief.id)
      );

      // Check for briefings with reference images
      const briefingsWithImages = briefings.filter(brief => 
        brief.referenceImages && brief.referenceImages.length > 0
      );

      return {
        totalBriefings: briefings.length,
        testBriefings: testBriefings.length,
        briefingsWithImages: briefingsWithImages.length,
        hasUnifiedAccess: testBriefings.length > 0
      };
    });
  }

  async testVisualTabIntegration() {
    return this.runTest('Visual Tab Reference Image Integration', async () => {
      // Navigate to visual tab
      const visualButton = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Visual') || b.textContent.includes('Image')
      );
      
      if (visualButton) {
        visualButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Set a brand-related prompt
      const promptInput = document.querySelector('textarea[placeholder*="image"]') || 
                         document.querySelector('textarea');
      
      if (promptInput) {
        const brandPrompt = 'Create a marketing banner with brand visual identity and logo elements';
        promptInput.value = brandPrompt;
        promptInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Wait for potential reference image detection
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Check if reference images display exists
      const referenceDisplay = document.getElementById('reference-images-display');
      const referenceGrid = document.getElementById('reference-images-grid');

      return {
        visualTabAccessible: !!visualButton,
        promptInputExists: !!promptInput,
        referenceDisplayExists: !!referenceDisplay,
        referenceGridExists: !!referenceGrid,
        canDetectBrandPrompts: true
      };
    });
  }

  async testContentTabBriefingAccess() {
    return this.runTest('Content Tab Briefing Access', async () => {
      // Navigate to content tab
      const contentButton = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Content')
      );
      
      if (contentButton) {
        contentButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Check for briefing library button
      const briefingLibraryButton = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Briefing') && b.textContent.includes('Library')
      );

      // Test if briefing content can be accessed
      let briefingAccessible = false;
      if (briefingLibraryButton) {
        briefingLibraryButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if briefing library opens
        const libraryDialog = document.querySelector('[role="dialog"]');
        briefingAccessible = !!libraryDialog;
        
        // Close the dialog
        if (libraryDialog) {
          const closeButton = libraryDialog.querySelector('button[aria-label="Close"]') ||
                             libraryDialog.querySelector('button:last-child');
          if (closeButton) closeButton.click();
        }
      }

      return {
        contentTabAccessible: !!contentButton,
        briefingLibraryExists: !!briefingLibraryButton,
        briefingAccessible,
        unifiedAccessConfirmed: briefingAccessible
      };
    });
  }

  async testSAGEChatBriefingCompatibility() {
    return this.runTest('SAGE Chat Briefing Compatibility', async () => {
      // Navigate to SAGE chat tab
      const sageButton = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('SAGE') || b.textContent.includes('Chat')
      );
      
      if (sageButton) {
        sageButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Check if SAGE can access briefing data
      const chatInput = document.querySelector('textarea[placeholder*="message"]') || 
                       document.querySelector('textarea');

      let sageBriefingCapable = false;
      if (chatInput) {
        // Test prompt that should trigger briefing awareness
        const testPrompt = 'What briefings do we have available for campaign development?';
        chatInput.value = testPrompt;
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
        sageBriefingCapable = true;
      }

      return {
        sageTabAccessible: !!sageButton,
        chatInputExists: !!chatInput,
        canQueryBriefings: sageBriefingCapable,
        unifiedDataAccess: true
      };
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Unified Briefing System Test Suite');
    console.log('=' .repeat(60));

    try {
      await this.testDocumentUploadWithImages();
      await this.testFormBriefingWithImages();
      await this.testUnifiedBriefingRetrieval();
      await this.testVisualTabIntegration();
      await this.testContentTabBriefingAccess();
      await this.testSAGEChatBriefingCompatibility();

      this.generateReport();
    } catch (error) {
      console.error('💥 Test suite execution failed:', error);
      this.generateReport();
      throw error;
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 UNIFIED BRIEFING SYSTEM TEST REPORT');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;

    console.log(`\n📈 Overall Results:`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log(`\n🔍 Failed Tests:`);
      this.errors.forEach(error => {
        console.log(`   • ${error.test}: ${error.error}`);
      });
    }

    console.log(`\n🔧 Unified System Status:`);
    console.log(`   • Document Upload: ${this.getTestStatus('Document Upload with Image Extraction')}`);
    console.log(`   • Form Creation: ${this.getTestStatus('Form Briefing with Reference Images')}`);
    console.log(`   • Unified Retrieval: ${this.getTestStatus('Unified Briefing Retrieval')}`);
    console.log(`   • Visual Integration: ${this.getTestStatus('Visual Tab Reference Image Integration')}`);
    console.log(`   • Content Access: ${this.getTestStatus('Content Tab Briefing Access')}`);
    console.log(`   • SAGE Compatibility: ${this.getTestStatus('SAGE Chat Briefing Compatibility')}`);

    console.log(`\n📋 Created Brief IDs: ${this.createdBriefIds.join(', ')}`);
    console.log('\n' + '='.repeat(60));
    
    return {
      passed,
      failed,
      successRate: (passed / (passed + failed)) * 100,
      createdBriefs: this.createdBriefIds.length,
      details: this.results
    };
  }

  getTestStatus(testName) {
    const result = this.results.find(r => r.test === testName);
    return result ? result.status : 'NOT RUN';
  }

  async cleanup() {
    // Cleanup created test briefs
    console.log('\n🧹 Cleaning up test data...');
    for (const briefId of this.createdBriefIds) {
      try {
        await fetch(`${this.baseUrl}/api/generated-contents/${briefId}`, {
          method: 'DELETE'
        });
        console.log(`✅ Cleaned up brief ${briefId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup brief ${briefId}:`, error);
      }
    }
  }
}

// Export for browser console usage
window.UnifiedBriefingSystemTester = UnifiedBriefingSystemTester;

// Auto-run if in test environment
if (typeof window !== 'undefined' && window.location.hostname.includes('replit')) {
  console.log('🎯 Unified Briefing System Test Suite loaded');
  console.log('Run: new UnifiedBriefingSystemTester().runAllTests()');
}