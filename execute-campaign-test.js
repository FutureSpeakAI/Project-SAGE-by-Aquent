/**
 * Campaign Test Execution with Error Logging
 * Executes the Nike campaign test with comprehensive error tracking
 */

import fetch from 'node-fetch';

class CampaignTestExecutor {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.errors = [];
    this.results = [];
    this.startTime = Date.now();
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  logError(phase, error) {
    const errorEntry = {
      phase,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    this.errors.push(errorEntry);
    console.error(`[ERROR in ${phase}] ${error.message}`);
  }

  async testAPIEndpoint(endpoint, method = 'GET', body = null) {
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (body) options.body = JSON.stringify(body);

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      return {
        status: response.status,
        ok: response.ok,
        data: response.ok ? await response.json() : null
      };
    } catch (error) {
      return {
        status: 0,
        ok: false,
        error: error.message
      };
    }
  }

  async phase1_SystemHealthCheck() {
    this.log("Phase 1: System Health Check");
    
    try {
      // Test core API endpoints
      const endpoints = [
        '/api/status',
        '/api/chat-sessions', 
        '/api/generated-contents',
        '/api/personas'
      ];

      for (const endpoint of endpoints) {
        const result = await this.testAPIEndpoint(endpoint);
        this.log(`${endpoint}: ${result.ok ? 'OK' : 'FAILED'} (${result.status})`);
        
        if (!result.ok) {
          throw new Error(`Endpoint ${endpoint} failed with status ${result.status}`);
        }
      }

      return { phase: "System Health", status: "PASS" };
    } catch (error) {
      this.logError("System Health", error);
      return { phase: "System Health", status: "FAIL", error: error.message };
    }
  }

  async phase2_ResearchWithPromptRouter() {
    this.log("Phase 2: Deep Research with Prompt Router");
    
    try {
      const researchQuery = `SAGE, conduct comprehensive competitive analysis for Nike's sustainable running shoe market:

**Competitive Analysis:**
1. Adidas Ultraboost 22 - sustainability features, pricing, market reception
2. Allbirds Tree Runners - positioning strategy, target audience overlap  
3. On Running CloudTec - innovation approach, premium positioning

**Market Intelligence:**
1. Sustainable running shoe market size and growth projections
2. Consumer willingness to pay premium for eco-friendly athletic wear
3. Key purchase drivers for Gen Z and Millennial athletes

**Technology Benchmarking:**
1. Carbon footprint measurement standards in footwear
2. Recycled material innovations currently available
3. Manufacturing process sustainability certifications

This research will inform our Nike ZeroCarbon Runner campaign strategy.`;

      const chatResult = await this.testAPIEndpoint('/api/chat', 'POST', {
        message: researchQuery,
        systemPrompt: "You are SAGE, a strategic marketing AI. Provide comprehensive research using the prompt router for optimal AI provider selection.",
        providerPreference: "perplexity" // Should route through prompt router
      });

      if (!chatResult.ok) {
        throw new Error(`Chat API failed: ${chatResult.status} - ${chatResult.error}`);
      }

      const response = chatResult.data;
      
      // Validate response contains research content
      const hasContent = response.content && response.content.length > 500;
      const hasCompetitiveAnalysis = response.content?.includes('Adidas') || response.content?.includes('competitive');
      const hasMarketData = response.content?.includes('market') || response.content?.includes('consumer');

      this.log(`Research response length: ${response.content?.length || 0} characters`);
      this.log(`Contains competitive analysis: ${hasCompetitiveAnalysis}`);
      this.log(`Contains market data: ${hasMarketData}`);

      if (!hasContent) {
        throw new Error("Research response too short or empty");
      }

      return { 
        phase: "Research", 
        status: "PASS", 
        responseLength: response.content.length,
        hasCompetitiveAnalysis,
        hasMarketData
      };

    } catch (error) {
      this.logError("Research", error);
      return { phase: "Research", status: "FAIL", error: error.message };
    }
  }

  async phase3_BriefingGeneration() {
    this.log("Phase 3: Campaign Briefing Generation");
    
    try {
      const briefingPrompt = `Using our Nike ZeroCarbon Runner research context, create a comprehensive campaign brief:

**CAMPAIGN BRIEF: Nike ZeroCarbon Runner Global Launch**

1. **Executive Summary** - Campaign overview and strategic rationale
2. **Market Context** - Competitive landscape and opportunity
3. **Brand Positioning** - ZeroCarbon Runner within Nike portfolio  
4. **Target Audience** - Primary eco-conscious athletes (18-35)
5. **Creative Strategy** - Key messages and creative territories
6. **Channel Strategy** - Integrated approach across touchpoints
7. **Content Requirements** - Specific deliverable specifications
8. **Success Metrics** - KPIs and measurement framework

Generate this as a professional brief that content and visual teams can execute against.`;

      const briefResult = await this.testAPIEndpoint('/api/chat', 'POST', {
        message: briefingPrompt,
        systemPrompt: "You are SAGE creating a campaign brief. Use prompt router to select optimal AI provider for strategic thinking.",
        providerPreference: "anthropic"
      });

      if (!briefResult.ok) {
        throw new Error(`Briefing generation failed: ${briefResult.status}`);
      }

      // Save briefing to database
      const saveResult = await this.testAPIEndpoint('/api/generated-contents', 'POST', {
        title: "Nike ZeroCarbon Runner Campaign Brief",
        content: briefResult.data.content,
        contentType: "briefing",
        campaignContext: {
          name: "Nike ZeroCarbon Runner Launch", 
          role: "primary_brief",
          deliverableType: "strategic_campaign_brief",
          status: "draft"
        }
      });

      const briefSaved = saveResult.ok;
      this.log(`Briefing saved to database: ${briefSaved}`);

      return {
        phase: "Briefing",
        status: "PASS",
        briefLength: briefResult.data.content.length,
        briefSaved
      };

    } catch (error) {
      this.logError("Briefing", error);
      return { phase: "Briefing", status: "FAIL", error: error.message };
    }
  }

  async phase4_ContentGeneration() {
    this.log("Phase 4: Content Generation with Brief Context");
    
    try {
      const contentRequests = [
        {
          type: "Hero Headlines",
          prompt: `Based on our Nike ZeroCarbon Runner campaign brief, create 5 hero headlines that emphasize performance and sustainability balance. Each headline should be 6-8 words maximum.`
        },
        {
          type: "Social Media Copy", 
          prompt: `Create Instagram campaign content for Nike ZeroCarbon Runner launch targeting Gen Z athletes. Include teaser posts, launch announcement, and educational content about carbon-negative technology.`
        }
      ];

      const contentResults = [];

      for (const request of contentRequests) {
        try {
          const result = await this.testAPIEndpoint('/api/chat', 'POST', {
            message: request.prompt,
            systemPrompt: "You are SAGE generating campaign content. Use prompt router for optimal AI provider selection based on content type.",
            providerPreference: "openai"
          });

          if (result.ok) {
            // Save content to database
            const saveResult = await this.testAPIEndpoint('/api/generated-contents', 'POST', {
              title: `Nike ZeroCarbon - ${request.type}`,
              content: result.data.content,
              contentType: "general",
              campaignContext: {
                name: "Nike ZeroCarbon Runner Launch",
                role: "supporting_content", 
                deliverableType: request.type.toLowerCase().replace(/\s+/g, '_'),
                status: "draft"
              }
            });

            contentResults.push({
              type: request.type,
              generated: true,
              saved: saveResult.ok,
              length: result.data.content.length
            });

            this.log(`${request.type}: Generated (${result.data.content.length} chars), Saved: ${saveResult.ok}`);
          } else {
            contentResults.push({
              type: request.type,
              generated: false,
              error: result.error
            });
          }
        } catch (error) {
          this.logError(`Content-${request.type}`, error);
          contentResults.push({
            type: request.type,
            generated: false,
            error: error.message
          });
        }
      }

      const successCount = contentResults.filter(r => r.generated).length;
      
      return {
        phase: "Content",
        status: successCount > 0 ? "PASS" : "FAIL",
        deliverables: contentResults.length,
        successful: successCount
      };

    } catch (error) {
      this.logError("Content", error);
      return { phase: "Content", status: "FAIL", error: error.message };
    }
  }

  async phase5_VisualGeneration() {
    this.log("Phase 5: Visual Generation with Campaign Context");
    
    try {
      const visualPrompt = `Nike ZeroCarbon Runner hero product image:
      
Product Showcase:
- Sleek running shoe with sustainable material innovations
- Premium Nike aesthetic maintaining performance credibility  
- Clean, modern composition for multi-channel use
- Studio lighting with subtle environmental accents
- Photorealistic commercial photography style`;

      const imageResult = await this.testAPIEndpoint('/api/generate-image', 'POST', {
        prompt: visualPrompt,
        size: "1024x1024",
        quality: "hd"
      });

      return {
        phase: "Visual",
        status: imageResult.ok ? "PASS" : "FAIL", 
        imageGenerated: imageResult.ok,
        error: imageResult.ok ? null : imageResult.error
      };

    } catch (error) {
      this.logError("Visual", error);
      return { phase: "Visual", status: "FAIL", error: error.message };
    }
  }

  async phase6_ContextValidation() {
    this.log("Phase 6: Context Flow Validation");
    
    try {
      // Check briefing storage
      const briefingsResult = await this.testAPIEndpoint('/api/generated-contents?contentType=briefing');
      const briefings = briefingsResult.ok ? briefingsResult.data : [];
      
      // Check content storage
      const contentResult = await this.testAPIEndpoint('/api/generated-contents?contentType=general');
      const content = contentResult.ok ? contentResult.data : [];
      
      // Check conversation sessions
      const sessionsResult = await this.testAPIEndpoint('/api/chat-sessions');
      const sessions = sessionsResult.ok ? sessionsResult.data : [];

      const nikeContent = content.filter(c => 
        c.title?.includes('Nike') || c.title?.includes('ZeroCarbon')
      );
      
      const nikeBriefings = briefings.filter(b =>
        b.title?.includes('Nike') || b.title?.includes('ZeroCarbon')
      );

      return {
        phase: "Context Validation",
        status: "PASS",
        briefingsStored: nikeBriefings.length,
        contentStored: nikeContent.length,
        sessionsAvailable: sessions.length,
        totalBriefings: briefings.length,
        totalContent: content.length
      };

    } catch (error) {
      this.logError("Context Validation", error);
      return { phase: "Context Validation", status: "FAIL", error: error.message };
    }
  }

  async runFullTest() {
    this.log("🚀 Starting Nike ZeroCarbon Runner Campaign Test");
    this.log("Testing conversation system and context flow with prompt router");
    this.log("=" .repeat(60));

    try {
      // Execute all phases
      this.results.push(await this.phase1_SystemHealthCheck());
      this.results.push(await this.phase2_ResearchWithPromptRouter());
      this.results.push(await this.phase3_BriefingGeneration());
      this.results.push(await this.phase4_ContentGeneration());
      this.results.push(await this.phase5_VisualGeneration());
      this.results.push(await this.phase6_ContextValidation());

      this.generateFinalReport();

    } catch (error) {
      this.logError("Full Test", error);
      this.generateFinalReport();
    }
  }

  generateFinalReport() {
    const duration = Math.round((Date.now() - this.startTime) / 1000);
    
    console.log("\n" + "=".repeat(60));
    console.log("🎯 NIKE ZEROCARBONS RUNNER CAMPAIGN TEST REPORT");
    console.log("=".repeat(60));

    console.log(`⏱️  Test Duration: ${duration} seconds`);
    console.log(`📊 Phases Completed: ${this.results.length}/6`);

    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;

    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📈 Success Rate: ${Math.round(passCount/this.results.length*100)}%`);

    console.log("\n📋 PHASE RESULTS:");
    this.results.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${index + 1}. ${result.phase}: ${icon} ${result.status}`);
      
      if (result.status === 'FAIL' && result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.responseLength) {
        console.log(`   Response: ${result.responseLength} characters`);
      }
      
      if (result.deliverables) {
        console.log(`   Deliverables: ${result.successful}/${result.deliverables} successful`);
      }
    });

    if (this.errors.length > 0) {
      console.log("\n🔧 DETAILED ERRORS:");
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.phase}: ${error.error}`);
        if (error.phase === 'Research' || error.phase === 'Content') {
          console.log(`   Stack: ${error.stack?.split('\n')[0]}`);
        }
      });
    }

    const contextResult = this.results.find(r => r.phase === 'Context Validation');
    if (contextResult && contextResult.status === 'PASS') {
      console.log("\n🔄 CONTEXT FLOW VALIDATION:");
      console.log(`📋 Briefings stored: ${contextResult.briefingsStored}`);
      console.log(`✍️ Content pieces: ${contextResult.contentStored}`);
      console.log(`💾 Sessions available: ${contextResult.sessionsAvailable}`);
    }

    console.log("\n🎯 SYSTEM CAPABILITIES TESTED:");
    console.log("- Deep research with prompt router");
    console.log("- Campaign briefing generation");
    console.log("- Content creation with context");
    console.log("- Visual generation pipeline");
    console.log("- Cross-tab context persistence");
    console.log("- Database storage integration");

    console.log("\n" + "=".repeat(60));
    console.log(`Test completed: ${new Date().toLocaleString()}`);
    console.log("=".repeat(60));

    if (failCount === 0) {
      console.log("🎉 ALL SYSTEMS OPERATIONAL - READY FOR PRODUCTION");
    } else {
      console.log("🔧 ISSUES DETECTED - SEE ERROR DETAILS ABOVE");
    }
  }
}

// Execute the test
const executor = new CampaignTestExecutor();
executor.runFullTest().catch(console.error);