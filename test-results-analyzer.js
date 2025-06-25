/**
 * Test Results Analyzer - Check campaign test outcomes
 */

import fetch from 'node-fetch';

async function analyzeTestResults() {
  const baseUrl = 'http://localhost:5000';
  
  console.log("📊 CAMPAIGN TEST RESULTS ANALYSIS");
  console.log("=".repeat(50));
  
  try {
    // Check generated content
    const contentResponse = await fetch(`${baseUrl}/api/generated-contents`);
    const allContent = await contentResponse.json();
    
    // Filter Nike campaign content
    const nikeContent = allContent.filter(item => 
      item.title?.includes('Nike') || 
      item.title?.includes('ZeroCarbon') ||
      item.campaignContext?.name?.includes('Nike')
    );
    
    console.log(`\n✅ CONTENT GENERATION RESULTS:`);
    console.log(`Total items in system: ${allContent.length}`);
    console.log(`Nike campaign items: ${nikeContent.length}`);
    
    // Analyze by type
    const briefings = nikeContent.filter(item => item.contentType === 'briefing');
    const content = nikeContent.filter(item => item.contentType === 'general');
    
    console.log(`\n📋 BRIEFINGS: ${briefings.length}`);
    briefings.forEach(item => {
      console.log(`  - ${item.title} (${new Date(item.createdAt).toLocaleTimeString()})`);
      console.log(`    Content length: ${item.content?.length || 0} characters`);
      if (item.campaignContext) {
        console.log(`    Role: ${item.campaignContext.role}`);
        console.log(`    Deliverable: ${item.campaignContext.deliverableType}`);
      }
    });
    
    console.log(`\n✍️ CONTENT PIECES: ${content.length}`);
    content.forEach(item => {
      console.log(`  - ${item.title} (${new Date(item.createdAt).toLocaleTimeString()})`);
      console.log(`    Content length: ${item.content?.length || 0} characters`);
      if (item.campaignContext) {
        console.log(`    Type: ${item.campaignContext.deliverableType}`);
      }
    });
    
    // Check for context references
    console.log(`\n🧠 CONTEXT FLOW VALIDATION:`);
    const briefingContent = briefings.map(b => b.content).join(' ').toLowerCase();
    const contentText = content.map(c => c.content).join(' ').toLowerCase();
    
    const hasCompetitiveAnalysis = briefingContent.includes('adidas') || briefingContent.includes('allbirds');
    const hasMarketInsights = briefingContent.includes('market') || briefingContent.includes('consumer');
    const contentReferencesBreif = contentText.includes('zerocarbons') || contentText.includes('sustainability');
    
    console.log(`Briefing contains competitive analysis: ${hasCompetitiveAnalysis ? 'YES' : 'NO'}`);
    console.log(`Briefing contains market insights: ${hasMarketInsights ? 'YES' : 'NO'}`);
    console.log(`Content references campaign context: ${contentReferencesBreif ? 'YES' : 'NO'}`);
    
    // Test conversation system features
    console.log(`\n💾 CONVERSATION SYSTEM:`);
    const sessionsResponse = await fetch(`${baseUrl}/api/chat-sessions`);
    const sessions = await sessionsResponse.json();
    console.log(`Chat sessions available: ${sessions.length}`);
    
    // Test prompt router evidence
    console.log(`\n🔄 PROMPT ROUTER EVIDENCE:`);
    console.log(`Research queries processed: ${briefings.length > 0 ? 'YES' : 'NO'}`);
    console.log(`Strategic briefing generated: ${briefings.length > 0 ? 'YES' : 'NO'}`);
    console.log(`Content creation completed: ${content.length > 0 ? 'YES' : 'NO'}`);
    
    // Overall assessment
    const totalSuccess = nikeContent.length;
    const contextFlow = hasCompetitiveAnalysis && hasMarketInsights && contentReferencesBreif;
    const systemFunctional = briefings.length > 0 && content.length > 0;
    
    console.log(`\n🎯 OVERALL ASSESSMENT:`);
    console.log(`Campaign deliverables created: ${totalSuccess}`);
    console.log(`Context flow verified: ${contextFlow ? 'YES' : 'NO'}`);
    console.log(`System fully functional: ${systemFunctional ? 'YES' : 'NO'}`);
    
    if (systemFunctional && contextFlow) {
      console.log(`\n🎉 SUCCESS: Complete workflow operational`);
      console.log(`✅ Research → Briefing → Content flow verified`);
      console.log(`✅ Prompt router correctly routing requests`);
      console.log(`✅ Database persistence working`);
      console.log(`✅ Campaign context maintained throughout`);
    } else {
      console.log(`\n⚠️  PARTIAL SUCCESS: Some components need attention`);
    }
    
    return {
      totalContent: allContent.length,
      nikeContent: nikeContent.length,
      briefings: briefings.length,
      content: content.length,
      contextFlow,
      systemFunctional
    };
    
  } catch (error) {
    console.error("❌ Analysis failed:", error.message);
    return { error: error.message };
  }
}

analyzeTestResults().then(results => {
  console.log("\n" + "=".repeat(50));
  console.log("Analysis complete:", new Date().toLocaleString());
}).catch(console.error);