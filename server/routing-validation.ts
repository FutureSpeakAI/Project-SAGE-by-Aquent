import { promptRouter, PromptRouterConfig, WorkflowContext } from './prompt-router';
import { providerHealthMonitor } from './provider-health';

export interface ValidationTestCase {
  id: string;
  name: string;
  query: string;
  context: string;
  expectedProvider: 'openai' | 'anthropic' | 'gemini';
  expectedReasoning: boolean;
  workflowContext?: WorkflowContext;
  config?: PromptRouterConfig;
}

export interface ValidationResult {
  testId: string;
  passed: boolean;
  actualProvider: string;
  expectedProvider: string;
  actualReasoning: boolean;
  expectedReasoning: boolean;
  rationale: string;
  responseTime: number;
  errors: string[];
}

export class RoutingValidationEngine {
  private testCases: ValidationTestCase[] = [
    // Research & Analysis Tests
    {
      id: 'research-1',
      name: 'Competitive Analysis Query',
      query: 'Conduct a comprehensive competitive analysis of Tesla vs traditional automakers, examining market share trends, technological advantages, and strategic positioning over the past 5 years',
      context: 'market research competitive analysis automotive industry trends',
      expectedProvider: 'anthropic',
      expectedReasoning: true,
      workflowContext: { stage: 'research', priority: 'quality' }
    },
    {
      id: 'research-2', 
      name: 'Deep Industry Research',
      query: 'Analyze the impact of AI adoption on healthcare outcomes, including detailed examination of implementation challenges, regulatory considerations, and measurable patient benefits',
      context: 'healthcare AI implementation research regulatory analysis',
      expectedProvider: 'anthropic',
      expectedReasoning: true,
      workflowContext: { stage: 'discovery', priority: 'quality' }
    },

    // Creative Content Tests
    {
      id: 'creative-1',
      name: 'Brand Story Creation',
      query: 'Create a compelling brand story for a sustainable fashion startup targeting Gen Z consumers, including emotional hooks and social media campaign concepts',
      context: 'brand storytelling creative content marketing campaign',
      expectedProvider: 'openai',
      expectedReasoning: false,
      workflowContext: { stage: 'content', priority: 'speed' }
    },
    {
      id: 'creative-2',
      name: 'Visual Design Concepts',
      query: 'Design concepts for luxury hotel branding including visual identity, color palette recommendations, and architectural photography style guidelines',
      context: 'visual design branding creative direction',
      expectedProvider: 'openai',
      expectedReasoning: false,
      workflowContext: { stage: 'visuals', priority: 'quality' }
    },

    // Technical Analysis Tests
    {
      id: 'technical-1',
      name: 'Performance Optimization',
      query: 'Analyze website performance metrics, calculate conversion rate optimization opportunities, and provide technical implementation recommendations for e-commerce platforms',
      context: 'technical analysis performance optimization data metrics',
      expectedProvider: 'gemini',
      expectedReasoning: false,
      workflowContext: { stage: 'finalization', priority: 'quality' }
    },
    {
      id: 'technical-2',
      name: 'Data Analytics Implementation',
      query: 'Implement advanced analytics tracking for SaaS platform user engagement, including cohort analysis, churn prediction, and feature adoption metrics',
      context: 'data analytics implementation technical metrics tracking',
      expectedProvider: 'gemini',
      expectedReasoning: false,
      workflowContext: { stage: 'finalization', priority: 'speed' }
    },

    // Complex Multi-Step Tests
    {
      id: 'complex-1',
      name: 'Complete Go-to-Market Strategy',
      query: 'Develop a complete go-to-market strategy for a B2B SaaS product including market research, competitive positioning, pricing strategy, and 12-month execution roadmap',
      context: 'comprehensive strategy development multi-step analysis gtm planning',
      expectedProvider: 'anthropic',
      expectedReasoning: true,
      workflowContext: { stage: 'strategic_brief', priority: 'quality', complexity: 'complex' }
    },

    // Manual Override Tests
    {
      id: 'override-1',
      name: 'Manual OpenAI Override',
      query: 'Research emerging AI trends in enterprise software',
      context: 'AI trends research enterprise analysis',
      expectedProvider: 'openai',
      expectedReasoning: false,
      config: { enabled: false, manualProvider: 'openai', manualModel: 'gpt-4o' }
    },
    {
      id: 'override-2',
      name: 'Manual Gemini Override with Reasoning',
      query: 'Create marketing campaign for tech startup',
      context: 'marketing campaign creative development',
      expectedProvider: 'gemini',
      expectedReasoning: true,
      config: { enabled: false, manualProvider: 'gemini', forceReasoning: true }
    }
  ];

  async runValidationSuite(): Promise<ValidationResult[]> {
    console.log('🚀 Starting comprehensive routing validation suite...');
    const results: ValidationResult[] = [];

    for (const testCase of this.testCases) {
      try {
        const result = await this.executeTestCase(testCase);
        results.push(result);
        console.log(`${result.passed ? '✅' : '❌'} ${testCase.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
        if (!result.passed) {
          console.log(`   Expected: ${result.expectedProvider}, Got: ${result.actualProvider}`);
          console.log(`   Errors: ${result.errors.join(', ')}`);
        }
      } catch (error) {
        results.push({
          testId: testCase.id,
          passed: false,
          actualProvider: 'error',
          expectedProvider: testCase.expectedProvider,
          actualReasoning: false,
          expectedReasoning: testCase.expectedReasoning,
          rationale: 'Test execution failed',
          responseTime: 0,
          errors: [error instanceof Error ? error.message : String(error)]
        });
      }
    }

    this.generateValidationReport(results);
    return results;
  }

  private async executeTestCase(testCase: ValidationTestCase): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Execute routing decision
      const decision = await promptRouter.routePrompt(
        testCase.query,
        testCase.context,
        testCase.config || { enabled: true },
        testCase.workflowContext
      );

      const responseTime = Date.now() - startTime;

      // Validate provider selection
      const providerMatch = decision.provider === testCase.expectedProvider;
      if (!providerMatch) {
        errors.push(`Provider mismatch: expected ${testCase.expectedProvider}, got ${decision.provider}`);
      }

      // Validate reasoning usage
      const reasoningMatch = decision.useReasoning === testCase.expectedReasoning;
      if (!reasoningMatch) {
        errors.push(`Reasoning mismatch: expected ${testCase.expectedReasoning}, got ${decision.useReasoning}`);
      }

      // Validate rationale quality
      if (!decision.rationale || decision.rationale.length < 10) {
        errors.push('Rationale is missing or too short');
      }

      return {
        testId: testCase.id,
        passed: errors.length === 0,
        actualProvider: decision.provider,
        expectedProvider: testCase.expectedProvider,
        actualReasoning: decision.useReasoning,
        expectedReasoning: testCase.expectedReasoning,
        rationale: decision.rationale,
        responseTime,
        errors
      };

    } catch (error) {
      return {
        testId: testCase.id,
        passed: false,
        actualProvider: 'error',
        expectedProvider: testCase.expectedProvider,
        actualReasoning: false,
        expectedReasoning: testCase.expectedReasoning,
        rationale: 'Execution failed',
        responseTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  async testProviderHealthIntegration(): Promise<{ healthyProviders: string[]; fallbackScenarios: any[] }> {
    console.log('🔍 Testing provider health integration...');
    
    const healthyProviders = providerHealthMonitor.getHealthyProviders();
    const fallbackScenarios = [];

    // Test fallback scenarios
    const testQueries = [
      { type: 'research', query: 'Analyze market trends', context: 'market research analysis' },
      { type: 'creative', query: 'Create brand story', context: 'creative content generation' },
      { type: 'technical', query: 'Optimize performance', context: 'technical performance analysis' }
    ];

    for (const test of testQueries) {
      const decision = await promptRouter.routePrompt(test.query, test.context);
      fallbackScenarios.push({
        queryType: test.type,
        selectedProvider: decision.provider,
        rationale: decision.rationale,
        healthyProviders: [...healthyProviders]
      });
    }

    return { healthyProviders, fallbackScenarios };
  }

  async testCrossTabPersistence(): Promise<{ persistenceTests: any[] }> {
    console.log('🔄 Testing cross-tab persistence simulation...');
    
    const persistenceTests = [];
    
    // Simulate different tab configurations
    const configs = [
      { enabled: true, manualProvider: undefined },
      { enabled: false, manualProvider: 'openai' as const, manualModel: 'gpt-4o' },
      { enabled: true, forceReasoning: true },
      { enabled: false, manualProvider: 'anthropic' as const, forceReasoning: false }
    ];

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      const testQuery = 'Test persistence across configuration changes';
      const decision = await promptRouter.routePrompt(testQuery, 'test context', config);
      
      persistenceTests.push({
        configIndex: i,
        config,
        decision: {
          provider: decision.provider,
          model: decision.model,
          useReasoning: decision.useReasoning,
          rationale: decision.rationale
        }
      });
    }

    return { persistenceTests };
  }

  private generateValidationReport(results: ValidationResult[]): void {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = (passedTests / totalTests) * 100;

    console.log('\n📊 VALIDATION REPORT');
    console.log('==========================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    console.log('==========================================');

    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      results.filter(r => !r.passed).forEach(result => {
        console.log(`- ${result.testId}: ${result.errors.join(', ')}`);
      });
    }

    // Performance analysis
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    console.log(`\n⚡ Average Response Time: ${avgResponseTime.toFixed(2)}ms`);

    // Provider distribution analysis
    const providerCounts = results.reduce((acc, r) => {
      acc[r.actualProvider] = (acc[r.actualProvider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n🤖 Provider Distribution:');
    Object.entries(providerCounts).forEach(([provider, count]) => {
      console.log(`- ${provider}: ${count} tests (${((count / totalTests) * 100).toFixed(1)}%)`);
    });
  }
}

export const routingValidator = new RoutingValidationEngine();