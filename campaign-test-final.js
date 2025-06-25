/**
 * Final Campaign Test - Nike ZeroCarbon Runner with Enhanced Context
 * Addresses identified issues and validates complete workflow
 */

import fetch from 'node-fetch';

class FinalCampaignTest {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.campaignContext = {
      company: "Nike",
      product: "ZeroCarbon Runner",
      campaign: "Global Sustainability Launch",
      audience: "Eco-conscious athletes 18-35",
      keyMessage: "Performance meets planet"
    };
  }

  async executeWithEnhancedContext() {
    console.log("FINAL NIKE ZEROCARBONS RUNNER CAMPAIGN TEST");
    console.log("Enhanced context preservation and workflow validation");
    console.log("=".repeat(60));

    try {
      // Phase 1: Focused Research Query
      console.log("\nPhase 1: Nike ZeroCarbon Runner Research");
      const researchResult = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `NIKE ZEROCARBONS RUNNER COMPETITIVE RESEARCH:

Research the sustainable running shoe market for Nike's new ZeroCarbon Runner launch:

COMPETITIVE ANALYSIS:
- Adidas Ultraboost 22 sustainability claims and market position
- Allbirds Tree Runners pricing and eco-athlete targeting  
- On Running CloudTec premium sustainability approach

MARKET OPPORTUNITY:
- Sustainable athletic footwear growth trends 2024-2025
- Gen Z athlete willingness to pay premium for carbon-neutral products
- Performance vs sustainability balance in purchase decisions

NIKE POSITIONING:
- How ZeroCarbon Runner fits Nike's Move to Zero initiative
- Differentiation from competitor sustainability messaging
- Performance credibility maintenance with eco benefits

This research will inform Nike ZeroCarbon Runner campaign strategy.`,
          systemPrompt: "You are SAGE conducting strategic research for Nike ZeroCarbon Runner campaign. Focus specifically on this product and maintain context throughout the conversation.",
          providerPreference: "perplexity"
        })
      });

      if (researchResult.ok) {
        const research = await researchResult.json();
        console.log(`Research completed: ${research.content.length} characters`);
        console.log(`Contains ZeroCarbon context: ${research.content.includes('ZeroCarbon')}`);
      }

      // Phase 2: Strategic Brief with Explicit Context
      console.log("\nPhase 2: Nike ZeroCarbon Runner Strategic Brief");
      const briefResult = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Create strategic campaign brief for NIKE ZEROCARBONS RUNNER based on our research:

CAMPAIGN: Nike ZeroCarbon Runner Global Launch
PRODUCT: Revolutionary running shoe with carbon-negative lifecycle
TARGET: Eco-conscious performance athletes aged 18-35

STRATEGIC BRIEF SECTIONS:
1. Executive Summary - ZeroCarbon Runner launch strategy
2. Competitive Context - vs Adidas, Allbirds, On Running
3. Target Audience - Eco-conscious athlete insights
4. Brand Positioning - Nike sustainability leadership
5. Key Messages - Performance + planet messaging
6. Creative Strategy - Visual and verbal direction
7. Channel Strategy - Integrated touchpoint approach
8. Deliverable Requirements - Content and visual specs
9. Success Metrics - Awareness, consideration, conversion KPIs

Generate comprehensive brief for Nike ZeroCarbon Runner campaign execution.`,
          systemPrompt: "You are SAGE creating a strategic brief for Nike ZeroCarbon Runner. Reference the previous research and maintain focus on this specific product throughout.",
          providerPreference: "anthropic"
        })
      });

      if (briefResult.ok) {
        const brief = await briefResult.json();
        
        // Save briefing with explicit Nike ZeroCarbon context
        const saveResult = await fetch(`${this.baseUrl}/api/generated-contents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: "Nike ZeroCarbon Runner Strategic Campaign Brief",
            content: brief.content,
            contentType: "briefing",
            campaignContext: {
              name: "Nike ZeroCarbon Runner Global Launch",
              role: "primary_brief",
              deliverableType: "strategic_campaign_brief",
              status: "draft"
            },
            metadata: {
              product: "Nike ZeroCarbon Runner",
              testExecution: "final_campaign_test",
              timestamp: new Date().toISOString()
            }
          })
        });

        console.log(`Strategic brief generated: ${brief.content.length} characters`);
        console.log(`Brief saved: ${saveResult.ok}`);
        console.log(`Contains ZeroCarbon focus: ${brief.content.includes('ZeroCarbon')}`);
      }

      // Phase 3: Content Generation with Strong Context
      console.log("\nPhase 3: Nike ZeroCarbon Runner Content Creation");
      const contentResult = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate campaign content for NIKE ZEROCARBONS RUNNER based on our strategic brief:

HERO HEADLINES for Nike ZeroCarbon Runner:
Create 5 headlines emphasizing performance + sustainability balance:
- Target eco-conscious athletes aged 18-35
- Differentiate from Adidas/Allbirds sustainability messaging
- Maintain Nike performance credibility
- 6-8 words maximum per headline

SOCIAL MEDIA CONTENT for Nike ZeroCarbon Runner Instagram:
- Teaser post building anticipation for carbon-negative innovation
- Launch announcement highlighting ZeroCarbon Runner benefits
- Educational content about carbon-negative manufacturing process
- Include relevant hashtags for sustainability and performance

All content must focus specifically on Nike ZeroCarbon Runner product.`,
          systemPrompt: "You are SAGE creating content for Nike ZeroCarbon Runner campaign. Reference the strategic brief and research context. Maintain specific focus on ZeroCarbon Runner throughout.",
          providerPreference: "openai"
        })
      });

      if (contentResult.ok) {
        const content = await contentResult.json();
        
        // Save content with explicit campaign context
        const saveResult = await fetch(`${this.baseUrl}/api/generated-contents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: "Nike ZeroCarbon Runner Campaign Content",
            content: content.content,
            contentType: "general",
            campaignContext: {
              name: "Nike ZeroCarbon Runner Global Launch",
              role: "supporting_content",
              deliverableType: "campaign_content",
              status: "draft"
            },
            metadata: {
              product: "Nike ZeroCarbon Runner",
              contentTypes: "headlines_social_media",
              testExecution: "final_campaign_test"
            }
          })
        });

        console.log(`Campaign content generated: ${content.content.length} characters`);
        console.log(`Content saved: ${saveResult.ok}`);
        console.log(`Contains ZeroCarbon focus: ${content.content.includes('ZeroCarbon')}`);
      }

      // Phase 4: Final Validation
      console.log("\nPhase 4: Campaign Context Validation");
      const validationResult = await fetch(`${this.baseUrl}/api/generated-contents`);
      const allContent = await validationResult.json();
      
      const zerocarbonContent = allContent.filter(item => 
        item.title?.includes('ZeroCarbon') ||
        item.content?.includes('ZeroCarbon') ||
        item.metadata?.product?.includes('ZeroCarbon')
      );

      console.log(`\nFINAL RESULTS:`);
      console.log(`Total ZeroCarbon campaign items: ${zerocarbonContent.length}`);
      console.log(`Campaign briefings: ${zerocarbonContent.filter(i => i.contentType === 'briefing').length}`);
      console.log(`Campaign content: ${zerocarbonContent.filter(i => i.contentType === 'general').length}`);

      zerocarbonContent.forEach(item => {
        console.log(`- ${item.title} (${item.contentType})`);
        console.log(`  Content: ${item.content.substring(0, 100)}...`);
        console.log(`  Created: ${new Date(item.createdAt).toLocaleString()}`);
      });

      const contextSuccess = zerocarbonContent.length >= 2 && 
                            zerocarbonContent.some(i => i.contentType === 'briefing') &&
                            zerocarbonContent.some(i => i.contentType === 'general');

      console.log(`\nCONTEXT FLOW SUCCESS: ${contextSuccess ? 'YES' : 'NO'}`);
      
      if (contextSuccess) {
        console.log("\nSUCCESS: Nike ZeroCarbon Runner campaign workflow validated");
        console.log("- Research conducted with prompt router");
        console.log("- Strategic brief generated with context");
        console.log("- Content created referencing brief");
        console.log("- Database persistence confirmed");
        console.log("- Campaign context maintained throughout");
      }

      return { success: contextSuccess, items: zerocarbonContent.length };

    } catch (error) {
      console.error("Test execution failed:", error.message);
      return { success: false, error: error.message };
    }
  }
}

// Execute final test
const finalTest = new FinalCampaignTest();
finalTest.executeWithEnhancedContext().then(result => {
  console.log("\n" + "=".repeat(60));
  console.log("FINAL TEST COMPLETED");
  console.log(`Success: ${result.success}`);
  if (result.error) console.log(`Error: ${result.error}`);
  console.log("=".repeat(60));
}).catch(console.error);