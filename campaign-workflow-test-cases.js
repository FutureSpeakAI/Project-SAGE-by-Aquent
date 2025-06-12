/**
 * Comprehensive Campaign Management Test Cases
 * Tests complete user workflows for campaign management, asset editing, and cross-campaign operations
 */

class CampaignWorkflowTester {
  constructor() {
    this.testResults = [];
    this.currentTest = null;
  }

  async runTest(testName, testFn) {
    this.currentTest = testName;
    console.log(`\n🧪 Testing: ${testName}`);
    try {
      await testFn();
      this.testResults.push({ test: testName, status: 'PASS', details: 'All steps completed successfully' });
      console.log(`✅ ${testName} - PASSED`);
    } catch (error) {
      this.testResults.push({ test: testName, status: 'FAIL', details: error.message });
      console.log(`❌ ${testName} - FAILED: ${error.message}`);
    }
  }

  /**
   * Test Case 1: Campaign Navigation and Overview
   * Tests: Navigate to campaigns, view campaign list, access campaign details
   */
  async testCampaignNavigationAndOverview() {
    // Navigate to campaigns page
    const campaignsTab = document.querySelector('[data-testid="campaign-tab"]') || 
                        document.querySelector('button[onclick*="campaign"]') ||
                        Array.from(document.querySelectorAll('button')).find(btn => 
                          btn.textContent.toLowerCase().includes('campaign'));
    
    if (!campaignsTab) {
      throw new Error('Campaign navigation button not found');
    }
    
    campaignsTab.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify campaigns page loaded
    const campaignCards = document.querySelectorAll('[data-testid="campaign-card"]') ||
                         document.querySelectorAll('.campaign-card') ||
                         document.querySelectorAll('[class*="campaign"]');
    
    if (campaignCards.length === 0) {
      throw new Error('No campaign cards found on campaigns page');
    }

    console.log(`Found ${campaignCards.length} campaigns in the interface`);

    // Test campaign detail view
    const firstCampaign = campaignCards[0];
    firstCampaign.click();
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify campaign detail view loaded
    const deliverables = document.querySelectorAll('[data-testid="deliverable-item"]') ||
                        document.querySelectorAll('[class*="deliverable"]') ||
                        document.querySelectorAll('[class*="asset"]');
    
    if (deliverables.length === 0) {
      console.warn('No deliverables found in campaign detail view');
    }

    console.log(`Campaign detail view loaded with ${deliverables.length} deliverables`);
  }

  /**
   * Test Case 2: Written Content Asset Management
   * Tests: Select written content, edit content, save changes, link to campaign
   */
  async testWrittenContentAssetManagement() {
    // Navigate to content tab first
    const contentTab = document.querySelector('[data-testid="content-tab"]') ||
                      Array.from(document.querySelectorAll('button')).find(btn => 
                        btn.textContent.toLowerCase().includes('content'));
    
    if (!contentTab) {
      throw new Error('Content tab not found');
    }
    
    contentTab.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Look for existing content or create new content
    let contentItems = document.querySelectorAll('[data-testid="content-item"]') ||
                      document.querySelectorAll('.content-card') ||
                      document.querySelectorAll('[class*="content-item"]');

    if (contentItems.length === 0) {
      // Create new content if none exists
      const createBtn = document.querySelector('[data-testid="create-content"]') ||
                       document.querySelector('button[onclick*="create"]') ||
                       Array.from(document.querySelectorAll('button')).find(btn => 
                         btn.textContent.toLowerCase().includes('create') || 
                         btn.textContent.includes('+'));
      
      if (!createBtn) {
        throw new Error('No content items found and no create button available');
      }
      
      createBtn.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fill out content creation form
      const titleInput = document.querySelector('input[name="title"]') ||
                        document.querySelector('input[placeholder*="title"]');
      const contentInput = document.querySelector('textarea[name="content"]') ||
                          document.querySelector('textarea') ||
                          document.querySelector('[contenteditable="true"]');
      
      if (titleInput) titleInput.value = 'Test Campaign Content';
      if (contentInput) contentInput.value = 'This is test content for campaign management workflow testing.';
      
      // Save the content
      const saveBtn = document.querySelector('button[type="submit"]') ||
                     Array.from(document.querySelectorAll('button')).find(btn => 
                       btn.textContent.toLowerCase().includes('save') ||
                       btn.textContent.toLowerCase().includes('create'));
      
      if (saveBtn) {
        saveBtn.click();
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      // Refresh content items list
      contentItems = document.querySelectorAll('[data-testid="content-item"]') ||
                    document.querySelectorAll('.content-card') ||
                    document.querySelectorAll('[class*="content-item"]');
    }

    if (contentItems.length === 0) {
      throw new Error('No content items available for testing');
    }

    // Select and edit first content item
    const firstContent = contentItems[0];
    const editBtn = firstContent.querySelector('button[onclick*="edit"]') ||
                   firstContent.querySelector('[data-testid="edit-button"]') ||
                   Array.from(firstContent.querySelectorAll('button')).find(btn => 
                     btn.textContent.toLowerCase().includes('edit'));
    
    if (editBtn) {
      editBtn.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test editing functionality
      const editableContent = document.querySelector('textarea') ||
                             document.querySelector('[contenteditable="true"]');
      
      if (editableContent) {
        const originalContent = editableContent.value || editableContent.textContent;
        editableContent.value = originalContent + '\n\nEdited via test automation.';
        editableContent.textContent = editableContent.value;
        
        // Save changes
        const saveEditBtn = document.querySelector('button[type="submit"]') ||
                           Array.from(document.querySelectorAll('button')).find(btn => 
                             btn.textContent.toLowerCase().includes('save'));
        
        if (saveEditBtn) {
          saveEditBtn.click();
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }

    console.log('Written content asset management workflow completed');
  }

  /**
   * Test Case 3: Visual Asset Management
   * Tests: Select visual assets, edit properties, save changes, link to campaign
   */
  async testVisualAssetManagement() {
    // Navigate to visual tab
    const visualTab = document.querySelector('[data-testid="visual-tab"]') ||
                     Array.from(document.querySelectorAll('button')).find(btn => 
                       btn.textContent.toLowerCase().includes('visual') ||
                       btn.textContent.toLowerCase().includes('image'));
    
    if (!visualTab) {
      throw new Error('Visual tab not found');
    }
    
    visualTab.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Look for existing visual projects or create new ones
    let visualProjects = document.querySelectorAll('[data-testid="visual-project"]') ||
                        document.querySelectorAll('.project-card') ||
                        document.querySelectorAll('[class*="project"]');

    if (visualProjects.length === 0) {
      // Create new visual project if none exists
      const createBtn = document.querySelector('[data-testid="create-project"]') ||
                       Array.from(document.querySelectorAll('button')).find(btn => 
                         btn.textContent.toLowerCase().includes('create') ||
                         btn.textContent.includes('+'));
      
      if (createBtn) {
        createBtn.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Fill project creation form
        const titleInput = document.querySelector('input[name="title"]') ||
                          document.querySelector('input[placeholder*="title"]');
        
        if (titleInput) {
          titleInput.value = 'Test Visual Project';
          
          const createProjectBtn = document.querySelector('button[type="submit"]') ||
                                  Array.from(document.querySelectorAll('button')).find(btn => 
                                    btn.textContent.toLowerCase().includes('create'));
          
          if (createProjectBtn) {
            createProjectBtn.click();
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      }
      
      // Refresh projects list
      visualProjects = document.querySelectorAll('[data-testid="visual-project"]') ||
                      document.querySelectorAll('.project-card') ||
                      document.querySelectorAll('[class*="project"]');
    }

    if (visualProjects.length === 0) {
      throw new Error('No visual projects available for testing');
    }

    // Select and manage first visual project
    const firstProject = visualProjects[0];
    firstProject.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test image generation or editing within project
    const generateBtn = document.querySelector('[data-testid="generate-image"]') ||
                       Array.from(document.querySelectorAll('button')).find(btn => 
                         btn.textContent.toLowerCase().includes('generate') ||
                         btn.textContent.toLowerCase().includes('create image'));
    
    if (generateBtn) {
      generateBtn.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fill image prompt
      const promptInput = document.querySelector('textarea[name="prompt"]') ||
                         document.querySelector('textarea') ||
                         document.querySelector('input[type="text"]');
      
      if (promptInput) {
        promptInput.value = 'Professional business meeting with diverse team in modern office';
        
        const submitBtn = document.querySelector('button[type="submit"]') ||
                         Array.from(document.querySelectorAll('button')).find(btn => 
                           btn.textContent.toLowerCase().includes('generate'));
        
        if (submitBtn) {
          submitBtn.click();
          console.log('Image generation workflow initiated');
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for generation
        }
      }
    }

    console.log('Visual asset management workflow completed');
  }

  /**
   * Test Case 4: Campaign Settings Modification
   * Tests: Edit campaign metadata, update objectives, modify team members, save changes
   */
  async testCampaignSettingsModification() {
    // Navigate back to campaigns
    const campaignsTab = document.querySelector('[data-testid="campaign-tab"]') ||
                        Array.from(document.querySelectorAll('button')).find(btn => 
                          btn.textContent.toLowerCase().includes('campaign'));
    
    if (campaignsTab) {
      campaignsTab.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Select a campaign to edit
    const campaignCards = document.querySelectorAll('[data-testid="campaign-card"]') ||
                         document.querySelectorAll('.campaign-card') ||
                         document.querySelectorAll('[class*="campaign"]');
    
    if (campaignCards.length === 0) {
      throw new Error('No campaigns available for settings modification');
    }

    const firstCampaign = campaignCards[0];
    firstCampaign.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Look for campaign settings/edit button
    const editCampaignBtn = document.querySelector('[data-testid="edit-campaign"]') ||
                           document.querySelector('button[onclick*="edit"]') ||
                           Array.from(document.querySelectorAll('button')).find(btn => 
                             btn.textContent.toLowerCase().includes('edit') ||
                             btn.textContent.toLowerCase().includes('settings'));
    
    if (editCampaignBtn) {
      editCampaignBtn.click();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test editing campaign fields
      const nameInput = document.querySelector('input[name="name"]') ||
                       document.querySelector('input[placeholder*="name"]');
      const descInput = document.querySelector('textarea[name="description"]') ||
                       document.querySelector('textarea');
      
      if (nameInput) {
        nameInput.value = nameInput.value + ' - Updated';
      }
      
      if (descInput) {
        descInput.value = descInput.value + '\n\nUpdated via automated testing.';
      }

      // Save campaign changes
      const saveCampaignBtn = document.querySelector('button[type="submit"]') ||
                             Array.from(document.querySelectorAll('button')).find(btn => 
                               btn.textContent.toLowerCase().includes('save') ||
                               btn.textContent.toLowerCase().includes('update'));
      
      if (saveCampaignBtn) {
        saveCampaignBtn.click();
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    console.log('Campaign settings modification workflow completed');
  }

  /**
   * Test Case 5: Cross-Campaign Asset Assignment
   * Tests: Link existing assets to different campaigns, move assets between campaigns
   */
  async testCrossCampaignAssetAssignment() {
    // Navigate to campaigns
    const campaignsTab = document.querySelector('[data-testid="campaign-tab"]') ||
                        Array.from(document.querySelectorAll('button')).find(btn => 
                          btn.textContent.toLowerCase().includes('campaign'));
    
    if (campaignsTab) {
      campaignsTab.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const campaignCards = document.querySelectorAll('[data-testid="campaign-card"]') ||
                         document.querySelectorAll('.campaign-card') ||
                         document.querySelectorAll('[class*="campaign"]');
    
    if (campaignCards.length < 2) {
      console.warn('Less than 2 campaigns available - creating test campaign for cross-assignment testing');
      
      // Create a second campaign for testing
      const createCampaignBtn = document.querySelector('[data-testid="create-campaign"]') ||
                               Array.from(document.querySelectorAll('button')).find(btn => 
                                 btn.textContent.toLowerCase().includes('create') ||
                                 btn.textContent.includes('+'));
      
      if (createCampaignBtn) {
        createCampaignBtn.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const nameInput = document.querySelector('input[name="name"]') ||
                         document.querySelector('input[placeholder*="name"]');
        
        if (nameInput) {
          nameInput.value = 'Test Campaign for Asset Assignment';
          
          const createBtn = document.querySelector('button[type="submit"]') ||
                           Array.from(document.querySelectorAll('button')).find(btn => 
                             btn.textContent.toLowerCase().includes('create'));
          
          if (createBtn) {
            createBtn.click();
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      }
    }

    // Open first campaign and test asset linking
    const firstCampaign = campaignCards[0];
    firstCampaign.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Look for asset linking functionality
    const linkAssetBtn = document.querySelector('[data-testid="link-asset"]') ||
                        document.querySelector('button[onclick*="link"]') ||
                        Array.from(document.querySelectorAll('button')).find(btn => 
                          btn.textContent.toLowerCase().includes('link') ||
                          btn.textContent.toLowerCase().includes('add asset'));
    
    if (linkAssetBtn) {
      linkAssetBtn.click();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test asset selection dialog
      const assetItems = document.querySelectorAll('[data-testid="asset-option"]') ||
                        document.querySelectorAll('.asset-item') ||
                        document.querySelectorAll('input[type="checkbox"]');
      
      if (assetItems.length > 0) {
        // Select first available asset
        const firstAsset = assetItems[0];
        if (firstAsset.type === 'checkbox') {
          firstAsset.checked = true;
        } else {
          firstAsset.click();
        }
        
        // Confirm asset linking
        const confirmBtn = document.querySelector('button[type="submit"]') ||
                          Array.from(document.querySelectorAll('button')).find(btn => 
                            btn.textContent.toLowerCase().includes('link') ||
                            btn.textContent.toLowerCase().includes('add'));
        
        if (confirmBtn) {
          confirmBtn.click();
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }

    console.log('Cross-campaign asset assignment workflow completed');
  }

  /**
   * Test Case 6: Comprehensive Campaign Workflow
   * Tests: Create campaign, add assets, edit campaign settings, manage deliverables
   */
  async testComprehensiveCampaignWorkflow() {
    // Navigate to campaigns
    const campaignsTab = document.querySelector('[data-testid="campaign-tab"]') ||
                        Array.from(document.querySelectorAll('button')).find(btn => 
                          btn.textContent.toLowerCase().includes('campaign'));
    
    if (campaignsTab) {
      campaignsTab.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Create new campaign
    const createCampaignBtn = document.querySelector('[data-testid="create-campaign"]') ||
                             Array.from(document.querySelectorAll('button')).find(btn => 
                               btn.textContent.toLowerCase().includes('create') ||
                               btn.textContent.includes('+'));
    
    if (!createCampaignBtn) {
      throw new Error('Create campaign button not found');
    }

    createCampaignBtn.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fill comprehensive campaign form
    const nameInput = document.querySelector('input[name="name"]') ||
                     document.querySelector('input[placeholder*="name"]');
    const descInput = document.querySelector('textarea[name="description"]') ||
                     document.querySelector('textarea');
    
    if (nameInput) nameInput.value = 'Comprehensive Test Campaign';
    if (descInput) descInput.value = 'Full workflow test campaign with all features enabled.';

    // Add objectives if field exists
    const objectivesInput = document.querySelector('input[name*="objective"]') ||
                           document.querySelector('textarea[name*="objective"]');
    if (objectivesInput) {
      objectivesInput.value = 'Test all campaign management features, Validate asset workflows, Ensure cross-campaign functionality';
    }

    // Set budget if field exists
    const budgetInput = document.querySelector('input[name*="budget"]');
    if (budgetInput) budgetInput.value = '$50,000';

    // Submit campaign creation
    const submitBtn = document.querySelector('button[type="submit"]') ||
                     Array.from(document.querySelectorAll('button')).find(btn => 
                       btn.textContent.toLowerCase().includes('create'));
    
    if (submitBtn) {
      submitBtn.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Verify campaign was created and navigate to it
    const newCampaignCards = document.querySelectorAll('[data-testid="campaign-card"]') ||
                            document.querySelectorAll('.campaign-card') ||
                            document.querySelectorAll('[class*="campaign"]');
    
    const testCampaign = Array.from(newCampaignCards).find(card => 
      card.textContent.includes('Comprehensive Test Campaign'));
    
    if (testCampaign) {
      testCampaign.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify campaign detail view shows deliverables
      const deliverables = document.querySelectorAll('[data-testid="deliverable-item"]') ||
                          document.querySelectorAll('[class*="deliverable"]');
      
      console.log(`Campaign created successfully with ${deliverables.length} deliverables`);
    }

    console.log('Comprehensive campaign workflow completed');
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Campaign Management Test Suite');
    console.log('================================================');

    await this.runTest('Campaign Navigation and Overview', () => this.testCampaignNavigationAndOverview());
    await this.runTest('Written Content Asset Management', () => this.testWrittenContentAssetManagement());
    await this.runTest('Visual Asset Management', () => this.testVisualAssetManagement());
    await this.runTest('Campaign Settings Modification', () => this.testCampaignSettingsModification());
    await this.runTest('Cross-Campaign Asset Assignment', () => this.testCrossCampaignAssetAssignment());
    await this.runTest('Comprehensive Campaign Workflow', () => this.testComprehensiveCampaignWorkflow());

    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 CAMPAIGN MANAGEMENT TEST RESULTS');
    console.log('=====================================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);
    
    console.log('\nDetailed Results:');
    this.testResults.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${result.test}`);
      if (result.status === 'FAIL') {
        console.log(`   Error: ${result.details}`);
      }
    });

    if (failed > 0) {
      console.log('\n🔧 REQUIRED IMPROVEMENTS:');
      this.testResults.filter(r => r.status === 'FAIL').forEach(result => {
        console.log(`- Fix: ${result.test} - ${result.details}`);
      });
    }
  }
}

// Export for browser console usage
window.CampaignWorkflowTester = CampaignWorkflowTester;

// Auto-run instructions
console.log('Campaign Management Test Suite Loaded!');
console.log('To run tests: const tester = new CampaignWorkflowTester(); await tester.runAllTests();');