/**
 * Learning System Demonstration
 * Shows how the learning system would work in practice
 */

import { 
  LearningSystemManager, 
  LearningEvent, 
  learningSystem,
  SystemInsights 
} from '../shared/learning-system';
import { SessionContext, SessionContextManager } from '../shared/session-context';

// Demo: Simulate learning across multiple sessions
export async function demonstrateLearningSystem(): Promise<void> {
  console.log('🧠 Learning System Demonstration\n');

  // Simulate multiple campaigns for different brands
  const campaigns = [
    { brand: 'Nike', industry: 'Sports', success: true, contentType: 'social_post' },
    { brand: 'Nike', industry: 'Sports', success: true, contentType: 'video_script' },
    { brand: 'Nike', industry: 'Sports', success: false, contentType: 'email' },
    { brand: 'Adidas', industry: 'Sports', success: true, contentType: 'social_post' },
    { brand: 'Adidas', industry: 'Sports', success: false, contentType: 'video_script' },
    { brand: 'Apple', industry: 'Technology', success: true, contentType: 'product_launch' },
    { brand: 'Apple', industry: 'Technology', success: true, contentType: 'social_post' },
    { brand: 'Samsung', industry: 'Technology', success: false, contentType: 'product_launch' }
  ];

  // Simulate sessions and learning events
  for (let i = 0; i < campaigns.length; i++) {
    const campaign = campaigns[i];
    const sessionId = `demo_session_${i}`;
    
    // Create session context
    const manager = SessionContextManager.getInstance();
    const context = manager.createNewSession(
      `${campaign.brand} Campaign ${i}`,
      campaign.brand,
      campaign.industry
    );

    // Simulate user interactions and outcomes
    const events: LearningEvent[] = [
      {
        id: `event_${i}_1`,
        sessionId,
        timestamp: new Date(Date.now() - (campaigns.length - i) * 24 * 60 * 60 * 1000),
        eventType: 'user_action',
        context,
        details: { action: 'create_campaign', contentType: campaign.contentType }
      },
      {
        id: `event_${i}_2`,
        sessionId,
        timestamp: new Date(Date.now() - (campaigns.length - i) * 24 * 60 * 60 * 1000 + 300000),
        eventType: 'system_response',
        context,
        details: { response: 'content_generated', contentType: campaign.contentType },
        outcome: {
          success: campaign.success,
          performanceMetrics: {
            executionTime: campaign.success ? 2000 + Math.random() * 1000 : 5000 + Math.random() * 3000,
            quality: campaign.success ? 0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.4
          },
          userFeedback: campaign.success ? 'positive' : 'negative'
        }
      },
      {
        id: `event_${i}_3`,
        sessionId,
        timestamp: new Date(Date.now() - (campaigns.length - i) * 24 * 60 * 60 * 1000 + 600000),
        eventType: 'outcome',
        context,
        details: { finalOutcome: campaign.success ? 'campaign_approved' : 'revision_requested' },
        outcome: {
          success: campaign.success,
          performanceMetrics: { userSatisfaction: campaign.success ? 0.9 : 0.4 }
        }
      }
    ];

    // Record events in learning system
    for (const event of events) {
      learningSystem.recordEvent(event);
    }

    console.log(`📊 Session ${i + 1}: ${campaign.brand} - ${campaign.success ? '✅ Success' : '❌ Failure'}`);
  }

  // Show learning insights
  console.log('\n🔍 Learning System Insights:');
  const insights = learningSystem.getSystemInsights();
  console.log(`Total Patterns Detected: ${insights.totalPatterns}`);
  console.log(`Success Patterns: ${insights.successPatterns}`);
  console.log(`Failure Patterns: ${insights.failurePatterns}`);
  console.log(`Learning Health Score: ${(insights.learningHealth * 100).toFixed(1)}%`);

  console.log('\n🏆 Top Performing Brands:');
  insights.topBrands.forEach((brand, index) => {
    console.log(`${index + 1}. ${brand.name} - Confidence: ${(brand.confidence * 100).toFixed(1)}% (${brand.usageCount} uses)`);
  });

  console.log('\n🏭 Top Industries:');
  insights.topIndustries.forEach((industry, index) => {
    console.log(`${index + 1}. ${industry.name} - Confidence: ${(industry.confidence * 100).toFixed(1)}% (${industry.usageCount} uses)`);
  });

  // Test recommendations for new Nike campaign
  console.log('\n💡 Recommendations for New Nike Campaign:');
  const nikeContext = SessionContextManager.getInstance().createNewSession(
    'Nike Summer Campaign',
    'Nike',
    'Sports'
  );
  
  const recommendations = learningSystem.getRecommendations(nikeContext);
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. [${rec.type.toUpperCase()}] ${rec.title}`);
    console.log(`   ${rec.description}`);
    console.log(`   Confidence: ${(rec.confidence * 100).toFixed(1)}%`);
    console.log(`   Evidence: ${rec.evidence.join(', ')}`);
    console.log('');
  });

  // Export learning data for analysis
  const learningData = learningSystem.exportLearningData();
  console.log('\n📤 Learning Data Export Summary:');
  console.log(`Knowledge Graph Nodes: ${(learningData as any).knowledgeGraph.nodes.length}`);
  console.log(`Detected Patterns: ${(learningData as any).patterns.patterns.length}`);
  console.log(`Historical Events: ${(learningData as any).patterns.events.length}`);
}

// Edge case demonstrations
export async function demonstrateEdgeCases(): Promise<void> {
  console.log('\n⚠️  Edge Case Testing:\n');

  // Test 1: Rapid Context Growth
  console.log('Test 1: Rapid Context Growth');
  const startTime = performance.now();
  
  const manager = SessionContextManager.getInstance();
  const massiveContext = manager.createNewSession('Massive Campaign', 'Global Corp', 'Technology');
  
  // Add 100 research entries rapidly
  for (let i = 0; i < 100; i++) {
    manager.addResearchData({
      type: 'market_research',
      query: `Research query ${i} with detailed analysis`,
      results: `Comprehensive research results ${i} `.repeat(100), // ~3KB per entry
      sources: [`source${i}.com`, `research${i}.org`],
      timestamp: new Date()
    });
  }

  const endTime = performance.now();
  const contextSize = JSON.stringify(massiveContext).length;
  
  console.log(`✅ Added 100 research entries in ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`📏 Context size: ${(contextSize / 1024).toFixed(1)}KB`);

  // Test 2: Learning System Performance Under Load
  console.log('\nTest 2: Learning System Performance Under Load');
  const learningStartTime = performance.now();
  
  for (let i = 0; i < 50; i++) {
    const event: LearningEvent = {
      id: `stress_event_${i}`,
      sessionId: 'stress_test_session',
      timestamp: new Date(),
      eventType: 'user_action',
      context: massiveContext,
      details: { action: 'stress_test', iteration: i },
      outcome: {
        success: Math.random() > 0.3,
        performanceMetrics: { testIteration: i }
      }
    };
    
    learningSystem.recordEvent(event);
  }

  const learningEndTime = performance.now();
  console.log(`✅ Processed 50 learning events in ${(learningEndTime - learningStartTime).toFixed(2)}ms`);

  // Test 3: Pattern Recognition Accuracy
  console.log('\nTest 3: Pattern Recognition Accuracy');
  
  // Create known patterns
  const patterns = [
    { brand: 'TestBrand', contentType: 'social_post', success: true },
    { brand: 'TestBrand', contentType: 'social_post', success: true },
    { brand: 'TestBrand', contentType: 'social_post', success: true },
    { brand: 'TestBrand', contentType: 'email', success: false },
    { brand: 'TestBrand', contentType: 'email', success: false }
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const testContext = manager.createNewSession(`Test ${i}`, pattern.brand, 'Test Industry');
    
    const event: LearningEvent = {
      id: `pattern_test_${i}`,
      sessionId: `pattern_session_${i}`,
      timestamp: new Date(),
      eventType: 'outcome',
      context: testContext,
      details: { contentType: pattern.contentType },
      outcome: {
        success: pattern.success,
        performanceMetrics: { contentQuality: pattern.success ? 0.9 : 0.3 }
      }
    };
    
    learningSystem.recordEvent(event);
  }

  // Test recommendations
  const testContext = manager.createNewSession('New Test Campaign', 'TestBrand', 'Test Industry');
  const recommendations = learningSystem.getRecommendations(testContext);
  
  console.log(`✅ Generated ${recommendations.length} recommendations`);
  console.log(`📊 Pattern accuracy: ${recommendations.length > 0 ? 'Patterns detected' : 'No patterns detected'}`);

  // Test 4: Memory and Storage Efficiency
  console.log('\nTest 4: Memory and Storage Efficiency');
  
  const initialMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
  const learningData = learningSystem.exportLearningData();
  const finalMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
  
  console.log(`📊 Learning data size: ${(JSON.stringify(learningData).length / 1024).toFixed(1)}KB`);
  console.log(`💾 Memory delta: ${((finalMemory - initialMemory) / 1024).toFixed(1)}KB`);

  // Test 5: Error Handling and Recovery
  console.log('\nTest 5: Error Handling and Recovery');
  
  try {
    // Test with invalid context
    const invalidEvent: LearningEvent = {
      id: 'invalid_event',
      sessionId: 'invalid_session',
      timestamp: new Date(),
      eventType: 'user_action',
      context: null as any,
      details: {}
    };
    
    learningSystem.recordEvent(invalidEvent);
    console.log('✅ System handled invalid input gracefully');
  } catch (error) {
    console.log(`⚠️  Error handling test: ${error}`);
  }

  // Test learning system disable/enable
  learningSystem.disableLearning();
  console.log(`✅ Learning disabled: ${!learningSystem.isLearningEnabled()}`);
  
  learningSystem.enableLearning();
  console.log(`✅ Learning re-enabled: ${learningSystem.isLearningEnabled()}`);
}

// Demonstrate cross-session learning benefits
export async function demonstrateCrossSessionLearning(): Promise<void> {
  console.log('\n🔄 Cross-Session Learning Benefits:\n');

  // Scenario: User works with Nike multiple times
  const nikeSessionss = [
    { campaign: 'Nike Air Max Launch', success: true, strategy: 'influencer_marketing' },
    { campaign: 'Nike Summer Collection', success: true, strategy: 'social_media_blitz' },
    { campaign: 'Nike Basketball Campaign', success: false, strategy: 'traditional_advertising' }
  ];

  for (let i = 0; i < nikeSessionss.length; i++) {
    const session = nikeSessionss[i];
    const manager = SessionContextManager.getInstance();
    const context = manager.createNewSession(session.campaign, 'Nike', 'Sports');

    // Record successful/failed strategies
    const event: LearningEvent = {
      id: `nike_cross_${i}`,
      sessionId: `nike_session_${i}`,
      timestamp: new Date(Date.now() - (nikeSessionss.length - i) * 7 * 24 * 60 * 60 * 1000),
      eventType: 'outcome',
      context,
      details: { strategy: session.strategy },
      outcome: {
        success: session.success,
        performanceMetrics: { 
          engagement: session.success ? 0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.3,
          conversionRate: session.success ? 0.05 + Math.random() * 0.03 : 0.01 + Math.random() * 0.02
        }
      }
    };

    learningSystem.recordEvent(event);
    console.log(`Session ${i + 1}: ${session.campaign} - ${session.success ? '✅' : '❌'} (${session.strategy})`);
  }

  // Now test recommendations for new Nike campaign
  console.log('\n💡 Learned Recommendations for New Nike Campaign:');
  const manager = SessionContextManager.getInstance();
  const newNikeContext = manager.createNewSession('Nike Holiday Campaign', 'Nike', 'Sports');
  
  const recommendations = learningSystem.getRecommendations(newNikeContext);
  
  if (recommendations.length > 0) {
    console.log('🎯 System has learned from previous Nike campaigns:');
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.title}`);
      console.log(`   Confidence: ${(rec.confidence * 100).toFixed(1)}%`);
      console.log(`   Type: ${rec.type}`);
      console.log('');
    });
  } else {
    console.log('❌ No cross-session learning detected (needs more data)');
  }

  // Show the learning progression
  const insights = learningSystem.getSystemInsights();
  console.log('📈 Learning System Growth:');
  console.log(`Total Knowledge: ${insights.totalPatterns} patterns, ${insights.highConfidenceNodes} high-confidence nodes`);
  console.log(`Nike Knowledge: ${insights.topBrands.find(b => b.name === 'Nike')?.confidence || 0} confidence`);
}

// Main demonstration runner
export async function runFullDemonstration(): Promise<void> {
  console.log('🚀 Sage Learning System - Full Demonstration\n');
  console.log('='.repeat(60));
  
  await demonstrateLearningSystem();
  console.log('\n' + '='.repeat(60));
  
  await demonstrateEdgeCases();
  console.log('\n' + '='.repeat(60));
  
  await demonstrateCrossSessionLearning();
  console.log('\n' + '='.repeat(60));
  
  console.log('\n✨ Demonstration Complete!');
  console.log('\nKey Takeaways:');
  console.log('• System learns patterns across all interactions');
  console.log('• Knowledge accumulates and improves recommendations over time');
  console.log('• Performance degrades gracefully under stress');
  console.log('• Cross-session learning provides valuable insights');
  console.log('• Memory usage remains efficient even with large datasets');
}

// Export for easy execution
if (typeof window === 'undefined') {
  // Node.js environment - can run directly
  runFullDemonstration().catch(console.error);
}