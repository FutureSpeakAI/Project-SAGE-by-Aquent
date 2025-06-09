import { performDeepResearch } from './research-engine';
import { reasoningEngine } from './reasoning-engine';
import { providerHealthMonitor } from './provider-health';
import * as OpenAI from './openai';
import * as GeminiAPI from './gemini';
import * as AnthropicAPI from './anthropic';

export interface RoutingDecision {
  provider: 'openai' | 'anthropic' | 'gemini';
  model: string;
  useReasoning: boolean;
  rationale: string;
}

export interface PromptRouterConfig {
  enabled: boolean;
  manualProvider?: 'openai' | 'anthropic' | 'gemini';
  manualModel?: string;
  forceReasoning?: boolean;
}

export interface WorkflowContext {
  stage?: 'discovery' | 'research' | 'strategic_brief' | 'content' | 'visuals' | 'finalization';
  projectType?: 'campaign' | 'content' | 'analysis' | 'strategy';
  complexity?: 'simple' | 'moderate' | 'complex';
  priority?: 'speed' | 'quality' | 'cost';
}

export class PromptRouter {
  
  async routePrompt(
    message: string, 
    researchContext: string,
    config: PromptRouterConfig = { enabled: true }
  ): Promise<RoutingDecision> {
    
    // Manual override mode
    if (!config.enabled || config.manualProvider) {
      return {
        provider: config.manualProvider || 'anthropic',
        model: config.manualModel || this.getDefaultModel(config.manualProvider || 'anthropic'),
        useReasoning: config.forceReasoning || this.shouldUseReasoning(message, researchContext),
        rationale: 'Manual selection'
      };
    }

    // Automatic routing based on query characteristics
    return this.analyzeAndRoute(message, researchContext);
  }

  private analyzeAndRoute(message: string, researchContext: string): RoutingDecision {
    const lowerMessage = message.toLowerCase();
    const lowerContext = researchContext.toLowerCase();

    // Research & Analysis queries -> Anthropic + Reasoning
    if (this.isResearchQuery(lowerMessage, lowerContext)) {
      return {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        useReasoning: true,
        rationale: 'Research and analysis task'
      };
    }

    // Creative & Image generation -> OpenAI or Gemini
    if (this.isCreativeQuery(lowerMessage)) {
      return {
        provider: 'openai',
        model: 'gpt-4o',
        useReasoning: false,
        rationale: 'Creative content generation'
      };
    }

    // Technical & Data queries -> Gemini
    if (this.isTechnicalQuery(lowerMessage)) {
      return {
        provider: 'gemini',
        model: 'gemini-1.5-pro-002',
        useReasoning: false,
        rationale: 'Technical analysis task'
      };
    }

    // Default to Anthropic for marketing strategy
    return {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      useReasoning: this.shouldUseReasoning(message, researchContext),
      rationale: 'Marketing strategy and consultation'
    };
  }

  private isResearchQuery(message: string, context: string): boolean {
    const researchIndicators = [
      'research', 'analyze', 'study', 'investigate', 'examine',
      'competitive', 'market analysis', 'trends', 'insights',
      'comprehensive', 'detailed', 'thorough', 'deep dive'
    ];
    
    return researchIndicators.some(indicator => 
      message.includes(indicator) || context.includes(indicator)
    );
  }

  private isCreativeQuery(message: string): boolean {
    const creativeIndicators = [
      'create', 'write', 'generate', 'design', 'brainstorm',
      'campaign', 'content', 'copy', 'headline', 'slogan',
      'creative brief', 'story', 'narrative', 'image'
    ];
    
    return creativeIndicators.some(indicator => message.includes(indicator));
  }

  private isTechnicalQuery(message: string): boolean {
    const technicalIndicators = [
      'data', 'metrics', 'analytics', 'performance', 'roi',
      'calculate', 'measure', 'optimize', 'algorithm',
      'technical', 'implementation', 'integration'
    ];
    
    return technicalIndicators.some(indicator => message.includes(indicator));
  }

  private shouldUseReasoning(message: string, researchContext: string): boolean {
    const reasoningIndicators = [
      'comprehensive', 'detailed', 'deep research', 'complete analysis',
      'compare', 'versus', 'competitive analysis', 'strategy',
      'why did', 'what made', 'driving', 'insights into'
    ];
    
    return reasoningIndicators.some(indicator => 
      message.toLowerCase().includes(indicator) || 
      researchContext.toLowerCase().includes(indicator)
    );
  }

  private getDefaultModel(provider: 'openai' | 'anthropic' | 'gemini'): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4o';
      case 'anthropic':
        return 'claude-sonnet-4-20250514';
      case 'gemini':
        return 'gemini-1.5-pro-002';
      default:
        return 'claude-sonnet-4-20250514';
    }
  }

  async executeRoutedPrompt(
    decision: RoutingDecision,
    message: string,
    researchContext: string,
    systemPrompt: string
  ): Promise<{ content: string; actualProvider: string; actualModel: string }> {
    
    let researchResults = '';
    
    // Perform research if needed
    if (researchContext && researchContext.trim().length > 0 && decision.useReasoning) {
      console.log(`Using ${decision.provider} with reasoning loop`);
      const reasoningResult = await reasoningEngine.performReasoningLoop(message, researchContext);
      researchResults = reasoningResult.finalInsights;
    } else if (researchContext && researchContext.trim().length > 0) {
      console.log(`Using ${decision.provider} with direct research`);
      researchResults = await performDeepResearch(message, researchContext);
    }

    // Build enhanced system prompt
    const enhancedSystemPrompt = researchResults ? 
      `${systemPrompt}\n\n=== RESEARCH DATA ===\n${researchResults}\n=== END RESEARCH DATA ===` : 
      systemPrompt;

    // Try primary provider with fallback chain
    const fallbackChain = this.getFallbackChain(decision.provider);
    
    for (const provider of fallbackChain) {
      try {
        console.log(`Attempting to use ${provider.name}...`);
        const result = await this.executeWithProvider(provider, message, enhancedSystemPrompt);
        console.log(`Successfully used ${provider.name}`);
        return {
          content: result,
          actualProvider: provider.name,
          actualModel: provider.model
        };
      } catch (error: any) {
        console.warn(`Failed to use ${provider.name}:`, error.message);
        if (provider === fallbackChain[fallbackChain.length - 1]) {
          // Last fallback failed, throw error
          throw new Error(`All AI providers failed. Last error: ${error.message}`);
        }
        // Continue to next fallback
        continue;
      }
    }
    
    throw new Error('All AI providers failed');
  }

  private getFallbackChain(primaryProvider: string): Array<{name: string, model: string}> {
    const providers = [
      { name: 'openai', model: 'gpt-4o' },
      { name: 'gemini', model: 'gemini-1.5-pro' },
      { name: 'anthropic', model: 'claude-sonnet-4-20250514' }
    ];

    // Put primary provider first, then others
    const primary = providers.find(p => p.name === primaryProvider);
    const others = providers.filter(p => p.name !== primaryProvider);
    
    return primary ? [primary, ...others] : providers;
  }

  private async executeWithProvider(
    provider: {name: string, model: string}, 
    message: string, 
    systemPrompt: string
  ): Promise<string> {
    
    switch (provider.name) {
      case 'anthropic':
        return await AnthropicAPI.generateContent({
          model: provider.model,
          prompt: message,
          systemPrompt: systemPrompt,
          temperature: 0.7,
          maxTokens: 2000
        });

      case 'openai':
        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const completion = await openai.chat.completions.create({
          model: provider.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 2000
        });
        
        return completion.choices[0].message.content || "I apologize, but I couldn't generate a response.";

      case 'gemini':
        return await GeminiAPI.generateContent({
          model: provider.model,
          prompt: message,
          systemPrompt: systemPrompt,
          temperature: 0.7,
          maxTokens: 2000
        });

      default:
        throw new Error(`Unsupported provider: ${provider.name}`);
    }
  }
}

export const promptRouter = new PromptRouter();