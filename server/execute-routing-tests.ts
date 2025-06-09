import { routingValidator } from './routing-validation';
import { promptRouter } from './prompt-router';
import { providerHealthMonitor } from './provider-health';

interface TestScenario {
  name: string;
  query: string;
  context: string;
  expectedBehavior: string;
  workflowContext?: any;
  config?: any;
}

const diverseTestScenarios: TestScenario[] = [
  {
    name: 'Complex Research Query',
    query: 'Conduct a comprehensive competitive analysis of Tesla vs traditional automakers, examining market share trends, technological advantages, and strategic positioning over the past 5 years',
    context: 'automotive industry competitive analysis market research',
    expectedBehavior: 'Should route to Anthropic with reasoning enabled for deep analysis'
  },
  {
    name: 'Creative Brand Development',
    query: 'Create a compelling brand story for a sustainable fashion startup targeting Gen Z consumers, including emotional hooks and social media campaign concepts',
    context: 'brand storytelling creative content marketing',
    expectedBehavior: 'Should route to OpenAI for creative content generation'
  },
  {
    name: 'Technical Performance Analysis',
    query: 'Analyze website performance metrics, calculate conversion rate optimization opportunities, and provide technical implementation recommendations for e-commerce platforms',
    context: 'technical analysis performance metrics data optimization',
    expectedBehavior: 'Should route to Gemini for technical and data analysis'
  },
  {
    name: 'Multi-Step Strategic Planning',
    query: 'Develop a complete go-to-market strategy for a B2B SaaS product including market research, competitive positioning, pricing strategy, and 12-month execution roadmap',
    context: 'comprehensive strategy development multi-step planning',
    expectedBehavior: 'Should route to Anthropic with reasoning for complex strategy work',
    workflowContext: { stage: 'strategic_brief', priority: 'quality', complexity: 'complex' }
  },
  {
    name: 'Visual Design Concepts',
    query: 'Design concepts for luxury hotel branding including visual identity, color palette recommendations, and architectural photography style guidelines',
    context: 'visual design branding creative direction',
    expectedBehavior: 'Should route to OpenAI for visual creativity',
    workflowContext: { stage: 'visuals', priority: 'quality' }
  },
  {
    name: 'Data Science Implementation',
    query: 'Implement advanced analytics tracking for SaaS platform user engagement, including cohort analysis, churn prediction, and feature adoption metrics',
    context: 'data science analytics implementation technical',
    expectedBehavior: 'Should route to Gemini for technical implementation'
  },
  {
    name: 'Marketing Campaign Strategy',
    query: 'Develop an integrated marketing campaign for enterprise software launch targeting Fortune 500 companies',
    context: 'marketing campaign strategy enterprise B2B',
    expectedBehavior: 'Should route to Anthropic for marketing strategy'
  },
  {
    name: 'Content Creation with Research',
    query: 'Write thought leadership articles about AI trends in healthcare, backed by recent industry research and expert opinions',
    context: 'content creation thought leadership industry research',
    expectedBehavior: 'Should route to OpenAI for content creation or Anthropic if research-heavy'
  },
  {
    name: 'Quick Creative Task',
    query: 'Generate catchy headlines for social media posts about our new product launch',
    context: 'social media creative content headlines',
    expectedBehavior: 'Should route to OpenAI for quick creative content'
  },
  {
    name: 'Complex Research Synthesis',
    query: 'Synthesize findings from multiple market research reports to identify emerging opportunities in the fintech sector',
    context: 'market research synthesis analysis fintech trends',
    expectedBehavior: 'Should route to Anthropic with reasoning for research synthesis'
  }
];

const manualOverrideTests = [
  {
    name: 'Force OpenAI for Research',
    query: 'Conduct market research analysis',
    context: 'market research',
    config: { enabled: false, manualProvider: 'openai', manualModel: 'gpt-4o' },
    expectedBehavior: 'Should use OpenAI despite research context'
  },
  {
    name: 'Force Gemini with Reasoning',
    query: 'Create marketing campaign',
    context: 'creative marketing',
    config: { enabled: false, manualProvider: 'gemini', forceReasoning: true },
    expectedBehavior: 'Should use Gemini with reasoning enabled'
  },
  {
    name: 'Disable Smart Routing',
    query: 'Complex technical analysis',
    context: 'technical data analysis',
    config: { enabled: false },
    expectedBehavior: 'Should fall back to default provider (Anthropic)'
  }
];

export async function executeComprehensiveValidation() {
  console.log('🚀 Starting Comprehensive Smart AI Routing Validation\n');
  
  // Test 1: Provider Health Status
  console.log('1️⃣  PROVIDER HEALTH CHECK');
  console.log('========================');
  const healthyProviders = providerHealthMonitor.getHealthyProviders();
  const allHealth = providerHealthMonitor.getAllHealthStatus();
  
  console.log(`Healthy Providers: ${healthyProviders.join(', ')}`);
  allHealth.forEach(provider => {
    const status = provider.isHealthy ? '✅' : '❌';
    console.log(`${status} ${provider.provider}: ${provider.responseTime}ms (errors: ${provider.errorCount})`);
  });
  console.log('');

  // Test 2: Diverse Query Routing
  console.log('2️⃣  DIVERSE QUERY ROUTING TESTS');
  console.log('==============================');
  const routingResults = [];
  
  for (const scenario of diverseTestScenarios) {
    try {
      const startTime = Date.now();
      const decision = await promptRouter.routePrompt(
        scenario.query,
        scenario.context,
        { enabled: true },
        scenario.workflowContext
      );
      const responseTime = Date.now() - startTime;
      
      routingResults.push({
        name: scenario.name,
        provider: decision.provider,
        model: decision.model,
        useReasoning: decision.useReasoning,
        rationale: decision.rationale,
        responseTime,
        expected: scenario.expectedBehavior
      });
      
      console.log(`✓ ${scenario.name}`);
      console.log(`  Provider: ${decision.provider} | Model: ${decision.model} | Reasoning: ${decision.useReasoning}`);
      console.log(`  Rationale: ${decision.rationale}`);
      console.log(`  Response Time: ${responseTime}ms`);
      console.log('');
    } catch (error) {
      console.log(`❌ ${scenario.name}: ${error}`);
    }
  }

  // Test 3: Manual Override Validation
  console.log('3️⃣  MANUAL OVERRIDE TESTS');
  console.log('========================');
  
  for (const test of manualOverrideTests) {
    try {
      const decision = await promptRouter.routePrompt(
        test.query,
        test.context,
        test.config
      );
      
      console.log(`✓ ${test.name}`);
      console.log(`  Provider: ${decision.provider} | Reasoning: ${decision.useReasoning}`);
      console.log(`  Rationale: ${decision.rationale}`);
      console.log('');
    } catch (error) {
      console.log(`❌ ${test.name}: ${error}`);
    }
  }

  // Test 4: Workflow Context Integration
  console.log('4️⃣  WORKFLOW CONTEXT INTEGRATION');
  console.log('===============================');
  
  const workflowStages = ['discovery', 'research', 'strategic_brief', 'content', 'visuals', 'finalization'];
  const priorities = ['speed', 'quality', 'cost'];
  
  for (const stage of workflowStages) {
    for (const priority of priorities) {
      try {
        const decision = await promptRouter.routePrompt(
          'Analyze market opportunities for our product',
          'market analysis strategic planning',
          { enabled: true },
          { stage: stage as any, priority: priority as any }
        );
        
        console.log(`${stage} + ${priority}: ${decision.provider} (${decision.rationale})`);
      } catch (error) {
        console.log(`❌ ${stage} + ${priority}: ${error}`);
      }
    }
  }
  console.log('');

  // Test 5: Performance and Consistency Analysis
  console.log('5️⃣  PERFORMANCE & CONSISTENCY ANALYSIS');
  console.log('=====================================');
  
  const sameQueryTests = [];
  const testQuery = 'Create a marketing strategy for a new tech product';
  const testContext = 'marketing strategy technology product launch';
  
  // Run same query multiple times to check consistency
  for (let i = 0; i < 5; i++) {
    try {
      const startTime = Date.now();
      const decision = await promptRouter.routePrompt(testQuery, testContext);
      const responseTime = Date.now() - startTime;
      
      sameQueryTests.push({
        iteration: i + 1,
        provider: decision.provider,
        model: decision.model,
        useReasoning: decision.useReasoning,
        responseTime
      });
    } catch (error) {
      console.log(`❌ Iteration ${i + 1}: ${error}`);
    }
  }
  
  // Analyze consistency
  const providers = Array.from(new Set(sameQueryTests.map(t => t.provider)));
  const avgConsistencyResponseTime = sameQueryTests.reduce((sum, t) => sum + t.responseTime, 0) / sameQueryTests.length;
  
  console.log(`Consistency Test Results (5 iterations):`);
  console.log(`Providers used: ${providers.join(', ')}`);
  console.log(`Average response time: ${avgConsistencyResponseTime.toFixed(2)}ms`);
  console.log(`Consistency: ${providers.length === 1 ? '✅ Perfect' : '⚠️  Variable'}`);
  console.log('');

  // Test 6: Error Handling and Fallbacks
  console.log('6️⃣  ERROR HANDLING & FALLBACK TESTS');
  console.log('==================================');
  
  try {
    // Test with invalid configuration
    const decision1 = await promptRouter.routePrompt(
      'Test query',
      'test context',
      { enabled: false, manualProvider: 'invalid' as any }
    );
    console.log(`Invalid provider fallback: ${decision1.provider} (${decision1.rationale})`);
  } catch (error) {
    console.log(`❌ Invalid provider test: ${error}`);
  }

  try {
    // Test with empty query
    const decision2 = await promptRouter.routePrompt('', '');
    console.log(`Empty query handling: ${decision2.provider} (${decision2.rationale})`);
  } catch (error) {
    console.log(`❌ Empty query test: ${error}`);
  }

  // Summary and Recommendations
  console.log('📊 VALIDATION SUMMARY');
  console.log('====================');
  console.log(`Total scenarios tested: ${diverseTestScenarios.length + manualOverrideTests.length}`);
  console.log(`Provider distribution in routing tests:`);
  
  const providerCounts = routingResults.reduce((acc, result) => {
    acc[result.provider] = (acc[result.provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(providerCounts).forEach(([provider, count]) => {
    const percentage = ((count / routingResults.length) * 100).toFixed(1);
    console.log(`  ${provider}: ${count} tests (${percentage}%)`);
  });
  
  const avgResponseTime = routingResults.reduce((sum, r) => sum + r.responseTime, 0) / routingResults.length;
  console.log(`Average routing decision time: ${avgResponseTime.toFixed(2)}ms`);
  
  console.log('\n✅ Comprehensive validation completed!');
  
  return {
    healthyProviders,
    routingResults,
    performanceMetrics: {
      avgResponseTime,
      providerDistribution: providerCounts,
      consistency: providers.length === 1
    }
  };
}

// Execute if run directly
if (require.main === module) {
  executeComprehensiveValidation().catch(console.error);
}