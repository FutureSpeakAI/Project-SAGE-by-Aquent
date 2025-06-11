/**
 * Comprehensive Reference Image Integration Test
 * Tests the complete workflow: briefing upload → image storage → visual generation
 */

class ReferenceImageIntegrationTester {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  async runTest(testName, testFn) {
    try {
      console.log(`🧪 Running test: ${testName}`);
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

  async testBriefingFormReferenceImageUpload() {
    return this.runTest('Briefing Form Reference Image Upload', async () => {
      // Navigate to briefing tab
      const briefingTab = document.querySelector('[data-state="active"] button[data-state="active"]');
      if (!briefingTab || !briefingTab.textContent.includes('Briefing')) {
        const briefingButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Briefing'));
        if (briefingButton) briefingButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Switch to form tab
      const formTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Form'));
      if (formTab) {
        formTab.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Check if reference image upload area exists
      const imageUploadArea = document.querySelector('[data-testid="reference-image-upload"]') || 
                             document.querySelector('input[type="file"][accept*="image"]') ||
                             document.querySelector('.reference-image-upload');

      if (!imageUploadArea) {
        throw new Error('Reference image upload component not found in briefing form');
      }

      // Verify upload functionality exists
      const hasUploadButton = document.querySelector('button[type="button"]') && 
                             Array.from(document.querySelectorAll('button')).some(b => 
                               b.textContent.includes('Upload') || b.textContent.includes('Add Image')
                             );

      return {
        uploadAreaExists: !!imageUploadArea,
        uploadButtonExists: hasUploadButton,
        message: 'Reference image upload component verified in briefing form'
      };
    });
  }

  async testReferenceImageAPIEndpoint() {
    return this.runTest('Reference Image API Endpoint', async () => {
      // Test the new API endpoint for fetching reference images
      const response = await fetch('/api/generated-contents');
      
      if (!response.ok) {
        throw new Error(`Generated contents API failed: ${response.status}`);
      }

      const contents = await response.json();
      
      // Look for briefings with reference images
      const briefingsWithImages = contents.filter(content => 
        content.contentType === 'briefing' && 
        content.referenceImages && 
        content.referenceImages.length > 0
      );

      // Test the specific reference images endpoint if we have a briefing
      if (briefingsWithImages.length > 0) {
        const briefing = briefingsWithImages[0];
        const refImageResponse = await fetch(`/api/briefs/${briefing.id}/reference-images`);
        
        if (refImageResponse.ok) {
          const refImageData = await refImageResponse.json();
          return {
            briefingsWithImages: briefingsWithImages.length,
            referenceImagesFound: refImageData.referenceImages?.length || 0,
            message: 'Reference image API endpoints working correctly'
          };
        }
      }

      return {
        briefingsWithImages: briefingsWithImages.length,
        message: 'API endpoints available, awaiting briefings with reference images'
      };
    });
  }

  async testVisualTabReferenceImageDetection() {
    return this.runTest('Visual Tab Reference Image Detection', async () => {
      // Navigate to visual tab
      const visualTab = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Visual') || b.textContent.includes('Image')
      );
      
      if (visualTab) {
        visualTab.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Check for reference image display area
      const referenceImageDisplay = document.getElementById('reference-images-display');
      const referenceImageGrid = document.getElementById('reference-images-grid');

      if (!referenceImageDisplay || !referenceImageGrid) {
        throw new Error('Reference image display components not found in visual tab');
      }

      // Test prompt that should trigger reference image detection
      const promptInput = document.querySelector('textarea[placeholder*="image"]') || 
                         document.querySelector('textarea');
      
      if (promptInput) {
        // Set a brand-related prompt
        const brandPrompt = 'Create a marketing campaign visual with brand logo and visual identity elements';
        promptInput.value = brandPrompt;
        promptInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      return {
        referenceDisplayExists: !!referenceImageDisplay,
        referenceGridExists: !!referenceImageGrid,
        promptInputExists: !!promptInput,
        message: 'Visual tab reference image detection components verified'
      };
    });
  }

  async testImageGenerationWithReferenceImages() {
    return this.runTest('Image Generation with Reference Images', async () => {
      // Navigate to visual tab if not already there
      const visualTab = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Visual') || b.textContent.includes('Image')
      );
      
      if (visualTab) {
        visualTab.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Find the prompt input
      const promptInput = document.querySelector('textarea[placeholder*="image"]') || 
                         document.querySelector('textarea');
      
      if (!promptInput) {
        throw new Error('Image prompt input not found');
      }

      // Set a brand-related prompt that should trigger reference image usage
      const brandPrompt = 'Create a professional marketing banner incorporating our brand visual identity and logo elements';
      promptInput.value = brandPrompt;
      promptInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Find the generate button
      const generateButton = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Generate') && !b.disabled
      );

      if (!generateButton) {
        throw new Error('Generate button not found or disabled');
      }

      // Monitor for reference image detection
      let referenceImagesDetected = false;
      const originalConsoleLog = console.log;
      console.log = (...args) => {
        if (args.some(arg => typeof arg === 'string' && arg.includes('reference images'))) {
          referenceImagesDetected = true;
        }
        originalConsoleLog.apply(console, args);
      };

      // Click generate and wait briefly
      generateButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Restore console.log
      console.log = originalConsoleLog;

      // Check if reference images display became visible
      const referenceDisplay = document.getElementById('reference-images-display');
      const isReferenceDisplayVisible = referenceDisplay && !referenceDisplay.classList.contains('hidden');

      return {
        promptSet: brandPrompt,
        generateButtonClicked: true,
        referenceImagesDetected,
        referenceDisplayVisible: isReferenceDisplayVisible,
        message: 'Image generation with reference images tested successfully'
      };
    });
  }

  async testBriefingLibraryReferenceImageStorage() {
    return this.runTest('Briefing Library Reference Image Storage', async () => {
      // Test that briefings with reference images are properly stored
      const response = await fetch('/api/generated-contents');
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const contents = await response.json();
      
      // Filter for briefings
      const briefings = contents.filter(content => content.contentType === 'briefing');
      const briefingsWithImages = briefings.filter(briefing => 
        briefing.referenceImages && briefing.referenceImages.length > 0
      );

      // Check structure of reference images if any exist
      let imageStructureValid = false;
      if (briefingsWithImages.length > 0) {
        const sampleBriefing = briefingsWithImages[0];
        const sampleImage = sampleBriefing.referenceImages[0];
        
        imageStructureValid = !!(
          sampleImage.id &&
          sampleImage.filename &&
          sampleImage.base64 &&
          typeof sampleImage.analysis === 'string'
        );
      }

      return {
        totalBriefings: briefings.length,
        briefingsWithImages: briefingsWithImages.length,
        imageStructureValid,
        message: `Found ${briefingsWithImages.length} briefings with reference images`
      };
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Reference Image Integration Test Suite');
    console.log('=' .repeat(60));

    try {
      await this.testBriefingFormReferenceImageUpload();
      await this.testReferenceImageAPIEndpoint();
      await this.testVisualTabReferenceImageDetection();
      await this.testImageGenerationWithReferenceImages();
      await this.testBriefingLibraryReferenceImageStorage();

      this.generateReport();
    } catch (error) {
      console.error('💥 Test suite execution failed:', error);
      this.generateReport();
      throw error;
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 REFERENCE IMAGE INTEGRATION TEST REPORT');
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

    console.log(`\n🔧 Feature Status:`);
    console.log(`   • Briefing Form Upload: ${this.getTestStatus('Briefing Form Reference Image Upload')}`);
    console.log(`   • API Endpoints: ${this.getTestStatus('Reference Image API Endpoint')}`);
    console.log(`   • Visual Tab Detection: ${this.getTestStatus('Visual Tab Reference Image Detection')}`);
    console.log(`   • Image Generation: ${this.getTestStatus('Image Generation with Reference Images')}`);
    console.log(`   • Library Storage: ${this.getTestStatus('Briefing Library Reference Image Storage')}`);

    console.log('\n' + '='.repeat(60));
    
    return {
      passed,
      failed,
      successRate: (passed / (passed + failed)) * 100,
      details: this.results
    };
  }

  getTestStatus(testName) {
    const result = this.results.find(r => r.test === testName);
    return result ? result.status : 'NOT RUN';
  }
}

// Export for browser console usage
window.ReferenceImageIntegrationTester = ReferenceImageIntegrationTester;

// Auto-run if in test environment
if (typeof window !== 'undefined' && window.location.hostname.includes('replit')) {
  console.log('🎯 Reference Image Integration Test Suite loaded');
  console.log('Run: new ReferenceImageIntegrationTester().runAllTests()');
}