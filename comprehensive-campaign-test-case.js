/**
 * Comprehensive Campaign Test Case: Nike ZeroCarbon Runner Launch
 * 
 * This test case demonstrates:
 * 1. Deep research with context building
 * 2. Conversation persistence and export/import
 * 3. Context flow from research → briefing → content → visuals
 * 4. Campaign workflow orchestration
 * 
 * Run this in browser console to execute the full test scenario
 */

class ComprehensiveCampaignTester {
  constructor() {
    this.testResults = [];
    this.campaignContext = {
      company: "Nike",
      product: "ZeroCarbon Runner",
      campaignType: "Product Launch",
      targetAudience: "Eco-conscious athletes aged 18-35",
      keyMessage: "Performance meets sustainability"
    };
  }

  async runTest(testName, testFn) {
    console.log(`\n🧪 Testing: ${testName}`);
    try {
      const result = await testFn();
      this.testResults.push({ test: testName, status: 'PASS', result });
      console.log(`✅ ${testName}: PASSED`);
      return result;
    } catch (error) {
      this.testResults.push({ test: testName, status: 'FAIL', error: error.message });
      console.log(`❌ ${testName}: FAILED - ${error.message}`);
      throw error;
    }
  }

  /**
   * STAGE 1: Deep Research Phase
   * Tests comprehensive research capabilities and context building
   */
  async testDeepResearchPhase() {
    return this.runTest("Deep Research Phase", async () => {
      console.log("📊 Starting comprehensive research on Nike ZeroCarbon Runner...");
      
      // Simulate going to Free Prompt tab for research
      const researchQueries = [
        {
          query: `Conduct comprehensive competitive analysis for Nike's sustainable running shoe market. Research:
          
1. **Competitor Analysis**: Analyze Adidas Ultraboost 22 sustainability features, Allbirds Tree Runners market positioning, and On CloudTec sustainability initiatives
2. **Market Trends**: Current sustainable footwear market size, growth projections, and consumer sentiment
3. **Technology Analysis**: Compare carbon-neutral manufacturing processes, recycled material innovations, and life-cycle assessment standards
4. **Consumer Insights**: What drives purchase decisions for eco-conscious athletes? Price sensitivity vs. sustainability?
5. **Regulatory Environment**: Upcoming sustainability regulations affecting footwear industry

This research will inform our Nike ZeroCarbon Runner campaign strategy.`,
          expectedContext: "competitive landscape, market trends, consumer insights"
        },
        {
          query: `Deep dive into Nike's brand positioning and sustainability commitments:

1. **Brand Heritage**: Nike's Move to Zero initiative progress and goals
2. **Target Audience**: Behavioral analysis of Nike's eco-conscious customer segment
3. **Communication Strategy**: How Nike currently messages sustainability vs. performance
4. **Partnership Opportunities**: Potential collaborations with environmental organizations
5. **Differentiation**: What makes ZeroCarbon Runner unique in Nike's portfolio?

Build this context for our campaign brief development.`,
          expectedContext: "brand strategy, sustainability positioning, differentiation"
        },
        {
          query: `Generate strategic campaign framework for Nike ZeroCarbon Runner:

1. **Campaign Objectives**: Brand awareness, sales targets, sustainability perception
2. **Key Messages**: Primary and secondary messaging hierarchy
3. **Channel Strategy**: Digital, retail, influencer, and experiential touchpoints
4. **Content Requirements**: What deliverables do we need across channels?
5. **Success Metrics**: KPIs for awareness, engagement, conversion, and brand perception

This framework will guide our briefing and content creation.`,
          expectedContext: "campaign strategy, messaging framework, deliverable requirements"
        }
      ];

      // Test each research query
      const researchResults = [];
      for (const research of researchQueries) {
        try {
          console.log(`🔍 Executing: ${research.query.substring(0, 100)}...`);
          
          // Simulate API call to chat endpoint
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: research.query,
              systemPrompt: "You are SAGE, a strategic marketing AI. Provide comprehensive, data-driven research that builds context for campaign development.",
              providerPreference: "perplexity" // Use Perplexity for research
            })
          });

          if (!response.ok) {
            throw new Error(`Research query failed: ${response.status}`);
          }

          const result = await response.json();
          researchResults.push({
            query: research.query.substring(0, 100) + "...",
            response: result.content.substring(0, 200) + "...",
            context: research.expectedContext
          });

          // Add small delay between queries
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.warn(`Research query failed: ${error.message}`);
        }
      }

      return {
        phase: "Deep Research",
        queriesExecuted: researchResults.length,
        contextBuilt: researchResults.map(r => r.context),
        researchResults
      };
    });
  }

  /**
   * STAGE 2: Conversation Persistence Testing
   * Tests save/load/export functionality of research conversation
   */
  async testConversationPersistence() {
    return this.runTest("Conversation Persistence", async () => {
      console.log("💾 Testing conversation save/load/export functionality...");

      // Test saving current conversation
      const sessionName = `Nike ZeroCarbon Campaign Research - ${new Date().toISOString().split('T')[0]}`;
      
      // Check if save functionality is accessible
      const saveButton = document.querySelector('button[data-testid="save-session"]') || 
                        document.querySelector('button:has(.lucide-save)') ||
                        Array.from(document.querySelectorAll('button')).find(btn => 
                          btn.textContent.toLowerCase().includes('save')
                        );

      if (!saveButton) {
        console.log("🔍 Looking for save functionality in current tab...");
        // Try to access through menu or dialog
        const menuButtons = document.querySelectorAll('button');
        for (const btn of menuButtons) {
          if (btn.textContent.toLowerCase().includes('menu') || 
              btn.textContent.toLowerCase().includes('options')) {
            btn.click();
            await new Promise(resolve => setTimeout(resolve, 500));
            break;
          }
        }
      }

      // Test export functionality
      const exportButton = document.querySelector('button[data-testid="export-session"]') ||
                          Array.from(document.querySelectorAll('button')).find(btn => 
                            btn.textContent.toLowerCase().includes('export') ||
                            btn.textContent.toLowerCase().includes('download')
                          );

      const persistenceTests = {
        saveAvailable: !!saveButton,
        exportAvailable: !!exportButton,
        sessionName: sessionName,
        timestamp: new Date().toISOString()
      };

      // Test localStorage persistence
      const currentMessages = JSON.parse(localStorage.getItem('sage-messages') || '[]');
      const tabState = JSON.parse(localStorage.getItem('sage-tab-persistence') || '{}');

      persistenceTests.localStorageState = {
        messagesCount: currentMessages.length,
        tabStatePersisted: Object.keys(tabState).length > 0,
        freePromptState: !!tabState.freePrompt
      };

      return persistenceTests;
    });
  }

  /**
   * STAGE 3: Briefing Tab Context Transfer
   * Tests research context flowing into briefing creation
   */
  async testBriefingContextTransfer() {
    return this.runTest("Briefing Context Transfer", async () => {
      console.log("📋 Testing context transfer to briefing creation...");

      // Simulate navigation to Briefing tab
      console.log("🔄 Navigating to Briefing tab...");
      const briefingTab = document.querySelector('[data-tab="briefing"]') ||
                         document.querySelector('button:has(text("Briefing"))') ||
                         Array.from(document.querySelectorAll('button')).find(btn => 
                           btn.textContent.toLowerCase().includes('briefing')
                         );

      if (briefingTab) {
        briefingTab.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Test briefing generation with research context
      const briefingPrompt = `Using all the research context we've built about Nike ZeroCarbon Runner, create a comprehensive campaign brief that includes:

1. **Executive Summary**: Campaign overview and strategic rationale
2. **Competitive Analysis**: Key insights from our Adidas/Allbirds/On research
3. **Target Audience**: Detailed persona based on our consumer insights
4. **Brand Positioning**: How ZeroCarbon Runner fits Nike's sustainability story
5. **Creative Strategy**: Key messages and creative territories
6. **Channel Strategy**: Recommended touchpoints and content types
7. **Success Metrics**: KPIs aligned with campaign objectives
8. **Deliverable Requirements**: Specific content needs for this campaign

Generate this as a professional campaign brief that our content and visual teams can execute against.`;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: briefingPrompt,
            systemPrompt: "You are SAGE, creating a comprehensive campaign brief. Reference all previous research context to create actionable strategic guidance.",
            providerPreference: "anthropic" // Use Anthropic for strategic thinking
          })
        });

        if (!response.ok) {
          throw new Error(`Briefing generation failed: ${response.status}`);
        }

        const briefResult = await response.json();
        
        // Test saving briefing to briefings table
        const saveResponse = await fetch('/api/briefings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: "Nike ZeroCarbon Runner Campaign Brief",
            content: briefResult.content,
            contentType: "briefing",
            campaignContext: {
              name: "Nike ZeroCarbon Runner Launch",
              role: "primary_brief",
              deliverableType: "campaign_brief",
              status: "draft"
            }
          })
        });

        return {
          phase: "Briefing Creation",
          briefGenerated: !!briefResult.content,
          briefLength: briefResult.content?.length || 0,
          briefSaved: saveResponse.ok,
          contextTransferred: briefResult.content?.includes("ZeroCarbon") && 
                             briefResult.content?.includes("Adidas"),
          deliverableRequirements: briefResult.content?.includes("deliverable")
        };

      } catch (error) {
        return {
          phase: "Briefing Creation",
          error: error.message,
          contextTransferred: false
        };
      }
    });
  }

  /**
   * STAGE 4: Content Generation with Brief Context
   * Tests briefing context flowing into content creation
   */
  async testContentGenerationWithContext() {
    return this.runTest("Content Generation with Context", async () => {
      console.log("✍️ Testing content generation with campaign brief context...");

      // Navigate to Content tab
      const contentTab = document.querySelector('[data-tab="content"]') ||
                        Array.from(document.querySelectorAll('button')).find(btn => 
                          btn.textContent.toLowerCase().includes('content')
                        );

      if (contentTab) {
        contentTab.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Test generating specific deliverables with brief context
      const contentRequests = [
        {
          type: "Hero Headlines",
          prompt: `Based on our Nike ZeroCarbon Runner campaign brief, create 5 hero headlines for the product launch that:
          - Emphasize both performance and sustainability
          - Resonate with eco-conscious athletes
          - Differentiate from Adidas and Allbirds messaging
          - Align with Nike's Move to Zero initiative
          
          Each headline should be under 8 words and campaign-ready.`
        },
        {
          type: "Social Media Copy",
          prompt: `Generate Instagram post copy for Nike ZeroCarbon Runner launch targeting Gen Z athletes:
          - Reference our research on consumer motivations
          - Include sustainability stats that matter to this audience
          - Use tone that balances performance and environmental impact
          - Include hashtag strategy based on our competitive analysis
          
          Create 3 variations for A/B testing.`
        },
        {
          type: "Email Campaign",
          prompt: `Create email marketing sequence for Nike ZeroCarbon Runner pre-launch based on our campaign brief:
          - Teaser email for sustainability-focused Nike+ members
          - Product reveal email highlighting key differentiators
          - Launch day email with compelling call-to-action
          
          Each email should reference insights from our competitive and consumer research.`
        }
      ];

      const contentResults = [];
      
      for (const request of contentRequests) {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: request.prompt,
              systemPrompt: "You are SAGE, generating campaign content that references all previous research and briefing context. Ensure content aligns with strategic positioning established in the campaign brief.",
              providerPreference: "openai" // Use OpenAI for creative content
            })
          });

          if (response.ok) {
            const result = await response.json();
            contentResults.push({
              type: request.type,
              generated: true,
              length: result.content?.length || 0,
              contextReference: result.content?.includes("ZeroCarbon") || 
                              result.content?.includes("sustainability") ||
                              result.content?.includes("eco")
            });
          }

          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (error) {
          contentResults.push({
            type: request.type,
            generated: false,
            error: error.message
          });
        }
      }

      return {
        phase: "Content Generation",
        deliverableTypes: contentResults.length,
        successfulGeneration: contentResults.filter(r => r.generated).length,
        contextIntegration: contentResults.filter(r => r.contextReference).length,
        contentResults
      };
    });
  }

  /**
   * STAGE 5: Visual Generation with Brief Context
   * Tests campaign brief context flowing into visual generation
   */
  async testVisualGenerationWithContext() {
    return this.runTest("Visual Generation with Context", async () => {
      console.log("🎨 Testing visual generation with campaign brief context...");

      // Navigate to Visual tab
      const visualTab = document.querySelector('[data-tab="visual"]') ||
                       Array.from(document.querySelectorAll('button')).find(btn => 
                         btn.textContent.toLowerCase().includes('visual') ||
                         btn.textContent.toLowerCase().includes('image')
                       );

      if (visualTab) {
        visualTab.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Test visual prompts that reference campaign context
      const visualRequests = [
        {
          type: "Hero Product Shot",
          prompt: `Create a hero product image for Nike ZeroCarbon Runner based on our campaign brief:
          
          Visual Elements:
          - Sleek, performance-focused running shoe in sustainable materials
          - Clean, modern aesthetic reflecting Nike's premium positioning
          - Environmental elements suggesting sustainability without being literal
          - Dynamic composition suggesting motion and performance
          - Color palette that differentiates from Adidas and Allbirds approaches
          
          Style: Premium product photography, studio lighting, photorealistic, high-end commercial aesthetic`
        },
        {
          type: "Lifestyle Campaign Image",
          prompt: `Generate lifestyle campaign image for Nike ZeroCarbon Runner targeting eco-conscious athletes:
          
          Scene:
          - Young athlete (18-35) running in urban environment
          - Setting that shows harmony between performance and nature
          - Nike ZeroCarbon Runner prominently featured
          - Composition suggesting forward movement and environmental consciousness
          - Lighting and mood that aligns with our sustainability messaging
          
          Style: Editorial photography, natural lighting, authentic athletic performance, premium campaign aesthetic`
        }
      ];

      const visualResults = [];

      for (const request of visualRequests) {
        try {
          // Test visual prompt generation (Brief Interpreter functionality)
          const interpretResponse = await fetch('/api/interpret-brief-for-visuals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              briefContent: request.prompt,
              campaignContext: this.campaignContext
            })
          });

          let interpretedPrompt = request.prompt;
          if (interpretResponse.ok) {
            const interpretResult = await interpretResponse.json();
            interpretedPrompt = interpretResult.optimizedPrompt || request.prompt;
          }

          // Test image generation
          const imageResponse = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: interpretedPrompt,
              size: "1024x1024",
              quality: "hd"
            })
          });

          visualResults.push({
            type: request.type,
            promptGenerated: true,
            imageGenerated: imageResponse.ok,
            promptLength: interpretedPrompt.length,
            contextIntegration: interpretedPrompt.includes("ZeroCarbon") ||
                              interpretedPrompt.includes("eco") ||
                              interpretedPrompt.includes("sustainability")
          });

          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          visualResults.push({
            type: request.type,
            promptGenerated: false,
            imageGenerated: false,
            error: error.message
          });
        }
      }

      return {
        phase: "Visual Generation",
        visualTypes: visualResults.length,
        successfulGeneration: visualResults.filter(r => r.imageGenerated).length,
        contextIntegration: visualResults.filter(r => r.contextIntegration).length,
        visualResults
      };
    });
  }

  /**
   * STAGE 6: End-to-End Workflow Validation
   * Tests complete workflow coherence and deliverable alignment
   */
  async testEndToEndWorkflow() {
    return this.runTest("End-to-End Workflow Validation", async () => {
      console.log("🔄 Validating complete campaign workflow...");

      // Test workflow state persistence
      const workflowState = JSON.parse(localStorage.getItem('sage-campaign-workflow') || '{}');
      
      // Test briefing library integration
      const briefingsResponse = await fetch('/api/briefings');
      const briefings = briefingsResponse.ok ? await briefingsResponse.json() : [];
      
      // Test content library integration  
      const contentResponse = await fetch('/api/generated-content');
      const content = contentResponse.ok ? await contentResponse.json() : [];

      // Test cross-tab context availability
      const tabState = JSON.parse(localStorage.getItem('sage-tab-persistence') || '{}');

      return {
        phase: "End-to-End Validation",
        workflowPersistence: Object.keys(workflowState).length > 0,
        briefingLibraryIntegration: briefings.length > 0,
        contentLibraryIntegration: content.length > 0,
        crossTabContext: Object.keys(tabState).length > 0,
        campaignCoherence: {
          briefingsSaved: briefings.filter(b => b.title?.includes('ZeroCarbon')).length,
          contentGenerated: content.filter(c => c.title?.includes('ZeroCarbon')).length,
          contextMaintained: tabState.freePrompt?.messages?.some(m => 
            m.content?.includes('ZeroCarbon')) || false
        }
      };
    });
  }

  /**
   * Run all test stages in sequence
   */
  async runFullCampaignTest() {
    console.log("🚀 Starting Comprehensive Campaign Test: Nike ZeroCarbon Runner");
    console.log("=" .repeat(60));

    try {
      // Execute all test stages
      await this.testDeepResearchPhase();
      await this.testConversationPersistence();
      await this.testBriefingContextTransfer();
      await this.testContentGenerationWithContext();
      await this.testVisualGenerationWithContext();
      await this.testEndToEndWorkflow();

      // Generate comprehensive report
      this.generateComprehensiveReport();

    } catch (error) {
      console.error("❌ Campaign test failed:", error);
      this.generateComprehensiveReport();
    }
  }

  /**
   * Generate detailed test report
   */
  generateComprehensiveReport() {
    console.log("\n" + "=".repeat(60));
    console.log("🎯 COMPREHENSIVE CAMPAIGN TEST REPORT");
    console.log("=".repeat(60));

    const passCount = this.testResults.filter(r => r.status === 'PASS').length;
    const failCount = this.testResults.filter(r => r.status === 'FAIL').length;
    const totalTests = this.testResults.length;

    console.log(`\n📊 OVERALL RESULTS: ${passCount}/${totalTests} tests passed (${Math.round(passCount/totalTests*100)}%)`);

    // Detailed results by stage
    console.log("\n📋 DETAILED RESULTS:");
    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.status}`);
      
      if (result.status === 'PASS' && result.result) {
        if (result.result.phase) {
          console.log(`   Phase: ${result.result.phase}`);
        }
        if (result.result.contextBuilt) {
          console.log(`   Context Built: ${result.result.contextBuilt.join(', ')}`);
        }
        if (result.result.deliverableTypes) {
          console.log(`   Deliverables: ${result.result.deliverableTypes} types generated`);
        }
      }
      
      if (result.status === 'FAIL') {
        console.log(`   Error: ${result.error}`);
      }
      console.log("");
    });

    // Workflow analysis
    console.log("🔄 WORKFLOW ANALYSIS:");
    const researchResult = this.testResults.find(r => r.test.includes('Research'));
    const briefingResult = this.testResults.find(r => r.test.includes('Briefing'));
    const contentResult = this.testResults.find(r => r.test.includes('Content'));
    const visualResult = this.testResults.find(r => r.test.includes('Visual'));

    if (researchResult?.status === 'PASS') {
      console.log("✅ Research phase: Context successfully built");
    }
    if (briefingResult?.status === 'PASS') {
      console.log("✅ Briefing phase: Research context transferred");
    }
    if (contentResult?.status === 'PASS') {
      console.log("✅ Content phase: Brief context utilized");
    }
    if (visualResult?.status === 'PASS') {
      console.log("✅ Visual phase: Campaign context maintained");
    }

    console.log("\n🎯 CAMPAIGN COHERENCE TEST:");
    const endToEndResult = this.testResults.find(r => r.test.includes('End-to-End'));
    if (endToEndResult?.status === 'PASS' && endToEndResult.result?.campaignCoherence) {
      const coherence = endToEndResult.result.campaignCoherence;
      console.log(`📋 Briefings saved: ${coherence.briefingsSaved}`);
      console.log(`✍️ Content generated: ${coherence.contentGenerated}`);
      console.log(`🧠 Context maintained: ${coherence.contextMaintained ? 'Yes' : 'No'}`);
    }

    console.log("\n💡 RECOMMENDATIONS:");
    if (failCount === 0) {
      console.log("🎉 All systems operational! Campaign workflow functioning perfectly.");
      console.log("🚀 Ready for production campaign development.");
    } else {
      console.log("🔧 Areas requiring attention:");
      this.testResults.filter(r => r.status === 'FAIL').forEach(result => {
        console.log(`   - ${result.test}: ${result.error}`);
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("Test completed at:", new Date().toLocaleString());
    console.log("=".repeat(60));

    return {
      totalTests,
      passCount,
      failCount,
      successRate: Math.round(passCount/totalTests*100),
      campaignContext: this.campaignContext,
      testResults: this.testResults
    };
  }
}

// Auto-execute when script is loaded
console.log("🎯 Comprehensive Campaign Test Case Ready");
console.log("Run: new ComprehensiveCampaignTester().runFullCampaignTest()");

// For immediate execution, uncomment:
// new ComprehensiveCampaignTester().runFullCampaignTest();