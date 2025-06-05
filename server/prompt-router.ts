import { performDeepResearch } from './research-engine';
import { reasoningEngine } from './reasoning-engine';
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
        model: 'gemini-1.5-pro',
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
        return 'gemini-1.5-pro';
      default:
        return 'claude-sonnet-4-20250514';
    }
  }

  async executeRoutedPrompt(
    decision: RoutingDecision,
    message: string,
    researchContext: string,
    systemPrompt: string
  ): Promise<string> {
    
    let researchResults = '';
    
    // Perform research if needed
    if (researchContext && researchContext.trim().length > 0) {
      if (decision.useReasoning) {
        console.log(`Using ${decision.provider} with reasoning loop`);
        const reasoningResult = await reasoningEngine.performReasoningLoop(message, researchContext);
        researchResults = reasoningResult.finalInsights;
      } else {
        console.log(`Using ${decision.provider} with direct research`);
        researchResults = await performDeepResearch(message, researchContext);
      }
    }

    // Build enhanced system prompt
    const enhancedSystemPrompt = researchResults ? 
      `${systemPrompt}\n\n=== RESEARCH DATA ===\n${researchResults}\n=== END RESEARCH DATA ===` : 
      systemPrompt;

    // Route to appropriate provider
    switch (decision.provider) {
      case 'anthropic':
        return await AnthropicAPI.generateContent({
          model: decision.model,
          prompt: message,
          systemPrompt: enhancedSystemPrompt,
          temperature: 0.7,
          maxTokens: 2000
        });

      case 'openai':
        // Note: OpenAI endpoint expects different format
        const openaiResponse = await fetch('/api/generate-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: decision.model,
            systemPrompt: enhancedSystemPrompt,
            userPrompt: message,
            temperature: 0.7
          })
        });
        return await openaiResponse.text();

      case 'gemini':
        return await GeminiAPI.generateContent({
          model: decision.model,
          prompt: message,
          systemPrompt: enhancedSystemPrompt,
          temperature: 0.7,
          maxTokens: 2000
        });

      default:
        throw new Error(`Unsupported provider: ${decision.provider}`);
    }
  }
}

export const promptRouter = new PromptRouter();