import { promptRouter, PromptRouterConfig } from './prompt-router';
import { ANTHROPIC_MODELS } from './anthropic';
import { GEMINI_MODELS } from './gemini';

interface ValidationResult {
  testName: string;
  passed: boolean;
  expected: any;
  actual: any;
  error?: string;
}

interface RoutingTestCase {
  name: string;
  query: string;
  context: string;
  expectedProvider: 'openai' | 'anthropic' | 'gemini';
  expectedReasoning: boolean;
  config?: PromptRouterConfig;
}

export class SmartRoutingValidator {
  
  async runAllTests(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Test 1: Model Synchronization
    results.push(...await this.validateModelSynchronization());
    
    // Test 2: Routing Decision Algorithm
    results.push(...await this.validateRoutingDecisions());
    
    // Test 3: Manual Override Functionality
    results.push(...await this.validateManualOverrides());
    
    // Test 4: Context Integration
    results.push(...await this.validateContextIntegration());
    
    return results;
  }

  private async validateModelSynchronization(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      // Fetch available models from API
      const response = await fetch('/api/models');
      const apiModels = await response.json();
      
      // Compare Anthropic models
      const anthropicMatch = this.compareArrays(ANTHROPIC_MODELS, apiModels.anthropic);
      results.push({
        testName: 'Anthropic Models Synchronization',
        passed: anthropicMatch.passed,
        expected: apiModels.anthropic,
        actual: ANTHROPIC_MODELS,
        error: anthropicMatch.error
      });
      
      // Compare OpenAI models
      const openaiExpected = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
      const openaiMatch = this.compareArrays(openaiExpected, apiModels.openai);
      results.push({
        testName: 'OpenAI Models Synchronization',
        passed: openaiMatch.passed,
        expected: apiModels.openai,
        actual: openaiExpected,
        error: openaiMatch.error
      });
      
      // Compare Gemini models
      const geminiMatch = this.compareArrays(GEMINI_MODELS.chat, apiModels.gemini);
      results.push({
        testName: 'Gemini Models Synchronization',
        passed: geminiMatch.passed,
        expected: apiModels.gemini,
        actual: GEMINI_MODELS.chat,
        error: geminiMatch.error
      });
      
    } catch (error) {
      results.push({
        testName: 'Model API Access',
        passed: false,
        expected: 'Successful API response',
        actual: 'API request failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return results;
  }

  private async validateRoutingDecisions(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    const testCases: RoutingTestCase[] = [
      {
        name: 'Research Query Routing',
        query: 'Conduct comprehensive competitor analysis for this industry',
        context: 'market research needed',
        expectedProvider: 'anthropic',
        expectedReasoning: true
      },
      {
        name: 'Creative Content Routing',
        query: 'Create a compelling campaign headline for our new product',
        context: '',
        expectedProvider: 'openai',
        expectedReasoning: false
      },
      {
        name: 'Technical Analysis Routing',
        query: 'Calculate ROI metrics and optimize performance data',
        context: '',
        expectedProvider: 'gemini',
        expectedReasoning: false
      },
      {
        name: 'Default Marketing Strategy Routing',
        query: 'Develop a marketing strategy for B2B software',
        context: 'comprehensive strategy needed',
        expectedProvider: 'anthropic',
        expectedReasoning: true
      }
    ];

    for (const testCase of testCases) {
      try {
        const decision = await promptRouter.routePrompt(
          testCase.query,
          testCase.context,
          { enabled: true }
        );
        
        const providerMatch = decision.provider === testCase.expectedProvider;
        const reasoningMatch = decision.useReasoning === testCase.expectedReasoning;
        
        results.push({
          testName: testCase.name,
          passed: providerMatch && reasoningMatch,
          expected: {
            provider: testCase.expectedProvider,
            reasoning: testCase.expectedReasoning
          },
          actual: {
            provider: decision.provider,
            reasoning: decision.useReasoning,
            rationale: decision.rationale
          },
          error: !providerMatch ? `Provider mismatch` : !reasoningMatch ? `Reasoning mismatch` : undefined
        });
        
      } catch (error) {
        results.push({
          testName: testCase.name,
          passed: false,
          expected: testCase.expectedProvider,
          actual: 'Error occurred',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  private async validateManualOverrides(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Test manual provider override
    try {
      const decision = await promptRouter.routePrompt(
        'Any query',
        '',
        {
          enabled: true,
          manualProvider: 'openai',
          manualModel: 'gpt-4o'
        }
      );
      
      results.push({
        testName: 'Manual Provider Override',
        passed: decision.provider === 'openai' && decision.model === 'gpt-4o',
        expected: { provider: 'openai', model: 'gpt-4o' },
        actual: { provider: decision.provider, model: decision.model },
        error: decision.provider !== 'openai' ? 'Provider override failed' : 
               decision.model !== 'gpt-4o' ? 'Model override failed' : undefined
      });
      
    } catch (error) {
      results.push({
        testName: 'Manual Provider Override',
        passed: false,
        expected: 'Successful override',
        actual: 'Override failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Test force reasoning override
    try {
      const decision = await promptRouter.routePrompt(
        'Simple hello message',
        '',
        {
          enabled: true,
          forceReasoning: true
        }
      );
      
      results.push({
        testName: 'Force Reasoning Override',
        passed: decision.useReasoning === true,
        expected: { reasoning: true },
        actual: { reasoning: decision.useReasoning },
        error: !decision.useReasoning ? 'Force reasoning failed' : undefined
      });
      
    } catch (error) {
      results.push({
        testName: 'Force Reasoning Override',
        passed: false,
        expected: 'Forced reasoning enabled',
        actual: 'Reasoning override failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return results;
  }

  private async validateContextIntegration(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Test context influence on routing
    try {
      const baseQuery = 'Help me with this task';
      
      // Test with research context
      const researchDecision = await promptRouter.routePrompt(
        baseQuery,
        'comprehensive market analysis needed',
        { enabled: true }
      );
      
      // Test with creative context
      const creativeDecision = await promptRouter.routePrompt(
        baseQuery,
        'creative campaign development',
        { enabled: true }
      );
      
      const contextInfluence = researchDecision.provider !== creativeDecision.provider;
      
      results.push({
        testName: 'Context Influence on Routing',
        passed: contextInfluence,
        expected: 'Different providers for different contexts',
        actual: {
          research: researchDecision.provider,
          creative: creativeDecision.provider
        },
        error: !contextInfluence ? 'Context not influencing routing decisions' : undefined
      });
      
    } catch (error) {
      results.push({
        testName: 'Context Influence on Routing',
        passed: false,
        expected: 'Context-aware routing',
        actual: 'Context evaluation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return results;
  }

  private compareArrays(arr1: string[], arr2: string[]): { passed: boolean; error?: string } {
    if (arr1.length !== arr2.length) {
      return {
        passed: false,
        error: `Length mismatch: expected ${arr2.length}, got ${arr1.length}`
      };
    }
    
    const missing = arr2.filter(item => !arr1.includes(item));
    const extra = arr1.filter(item => !arr2.includes(item));
    
    if (missing.length > 0 || extra.length > 0) {
      return {
        passed: false,
        error: `Missing: [${missing.join(', ')}], Extra: [${extra.join(', ')}]`
      };
    }
    
    return { passed: true };
  }

  generateTestReport(results: ValidationResult[]): string {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    let report = `# Smart AI Routing Validation Report\n\n`;
    report += `**Summary:** ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)\n\n`;
    
    if (failedTests > 0) {
      report += `## ❌ Failed Tests (${failedTests})\n\n`;
      results.filter(r => !r.passed).forEach(result => {
        report += `### ${result.testName}\n`;
        report += `- **Expected:** ${JSON.stringify(result.expected, null, 2)}\n`;
        report += `- **Actual:** ${JSON.stringify(result.actual, null, 2)}\n`;
        if (result.error) {
          report += `- **Error:** ${result.error}\n`;
        }
        report += `\n`;
      });
    }
    
    report += `## ✅ Passed Tests (${passedTests})\n\n`;
    results.filter(r => r.passed).forEach(result => {
      report += `- ${result.testName}\n`;
    });
    
    return report;
  }
}

export const routingValidator = new SmartRoutingValidator();