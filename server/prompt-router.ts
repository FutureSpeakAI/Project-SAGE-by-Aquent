import { performDeepResearch } from './research-engine';
import { reasoningEngine } from './reasoning-engine';
import { providerHealthMonitor } from './provider-health';
import * as OpenAI from './openai';
import * as GeminiAPI from './gemini';
import * as AnthropicAPI from './anthropic';

export interface RoutingDecision {
  provider: 'openai' | 'anthropic' | 'gemini' | 'perplexity';
  model: string;
  useReasoning: boolean;
  rationale: string;
}

export interface PromptRouterConfig {
  userPrompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  requestModel?: string;
  enabled?: boolean;
  manualProvider?: 'openai' | 'anthropic' | 'gemini' | 'perplexity';
  manualModel?: string;
  forceReasoning?: boolean;
}

interface InternalPromptRouterConfig {
  enabled: boolean;
  manualProvider?: 'openai' | 'anthropic' | 'gemini' | 'perplexity';
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
  
  async routeRequest(config: PromptRouterConfig): Promise<RoutingDecision> {
    return this.routePrompt(
      config.userPrompt,
      '',
      {
        enabled: config.enabled ?? true,
        manualProvider: config.manualProvider,
        manualModel: config.requestModel || config.manualModel,
        forceReasoning: config.forceReasoning
      } as InternalPromptRouterConfig
    );
  }
  
  async routePrompt(
    message: string, 
    researchContext: string,
    config: InternalPromptRouterConfig = { enabled: true },
    workflowContext?: WorkflowContext
  ): Promise<RoutingDecision> {
    
    // Get healthy providers for routing decisions
    const healthyProviders = providerHealthMonitor.getHealthyProviders();
    
    // Manual override mode with health checking
    if (!config.enabled || config.manualProvider) {
      const requestedProvider = config.manualProvider || 'anthropic';
      
      // If requested provider is unhealthy, find best alternative
      if (!healthyProviders.includes(requestedProvider)) {
        const healthResult = providerHealthMonitor.getBestProvider([requestedProvider]);
        return {
          provider: healthResult.preferredProvider as 'openai' | 'anthropic' | 'gemini',
          model: config.manualModel || this.getDefaultModel(healthResult.preferredProvider as 'openai' | 'anthropic' | 'gemini'),
          useReasoning: config.forceReasoning || this.shouldUseReasoning(message, researchContext),
          rationale: `Manual selection (${requestedProvider} unavailable, using ${healthResult.preferredProvider})`
        };
      }
      
      return {
        provider: requestedProvider,
        model: config.manualModel || this.getDefaultModel(requestedProvider),
        useReasoning: config.forceReasoning || this.shouldUseReasoning(message, researchContext),
        rationale: 'Manual selection'
      };
    }

    // Automatic routing with workflow context consideration
    return this.analyzeAndRoute(message, researchContext, workflowContext, healthyProviders);
  }

  private analyzeAndRoute(
    message: string, 
    researchContext: string, 
    workflowContext?: WorkflowContext,
    healthyProviders: string[] = ['anthropic', 'openai', 'gemini']
  ): RoutingDecision {
    const lowerMessage = message.toLowerCase();
    const lowerContext = researchContext.toLowerCase();

    // Workflow context influences routing decisions
    const preferredProviders = this.getWorkflowPreferredProviders(workflowContext, healthyProviders);

    // Research & Analysis queries -> Perplexity for real-time data, Anthropic for analysis (with health checking)
    if (this.isResearchQuery(lowerMessage, lowerContext)) {
      // Check if query needs real-time/current data
      const needsCurrentData = lowerMessage.includes('current') || lowerMessage.includes('latest') || 
                              lowerMessage.includes('recent') || lowerMessage.includes('2024') || 
                              lowerMessage.includes('2025') || lowerMessage.includes('today') ||
                              lowerContext.includes('competitive analysis') || lowerContext.includes('market research');
      
      if (needsCurrentData && healthyProviders.includes('perplexity')) {
        return {
          provider: 'perplexity',
          model: this.getDefaultModel('perplexity'),
          useReasoning: false, // Perplexity has built-in web search
          rationale: 'Real-time research with web access (using perplexity)'
        };
      }
      
      const provider = preferredProviders.includes('anthropic') ? 'anthropic' : preferredProviders[0] || 'anthropic';
      return {
        provider: provider as 'openai' | 'anthropic' | 'gemini' | 'perplexity',
        model: this.getDefaultModel(provider as 'openai' | 'anthropic' | 'gemini' | 'perplexity'),
        useReasoning: true,
        rationale: `Research and analysis task (using ${provider})`
      };
    }

    // Creative & Image generation with complexity-aware routing
    if (this.isCreativeQuery(lowerMessage)) {
      // Check for complex brief execution that may cause timeouts
      const isBriefExecution = message.includes('CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)');
      const isComplexBrief = isBriefExecution && (
        message.length > 1000 || 
        message.includes('deliverables') ||
        message.includes('multiple') ||
        message.toLowerCase().includes('loreal') ||
        message.toLowerCase().includes("l'oreal") ||
        (message.match(/\n/g) || []).length > 10
      );

      // For complex briefs, prefer Anthropic for better handling and timeout avoidance
      if (isComplexBrief && healthyProviders.includes('anthropic')) {
        return {
          provider: 'anthropic',
          model: this.getDefaultModel('anthropic'),
          useReasoning: false,
          rationale: 'Complex brief execution (optimized for Anthropic performance)'
        };
      }

      // For simple creative tasks, prefer OpenAI or fallback
      const provider = preferredProviders.includes('openai') ? 'openai' : preferredProviders[0] || 'openai';
      return {
        provider: provider as 'openai' | 'anthropic' | 'gemini',
        model: this.getDefaultModel(provider as 'openai' | 'anthropic' | 'gemini'),
        useReasoning: false,
        rationale: `Creative content generation (using ${provider})`
      };
    }

    // Technical & Data queries -> Gemini (with health checking)
    if (this.isTechnicalQuery(lowerMessage)) {
      const provider = preferredProviders.includes('gemini') ? 'gemini' : preferredProviders[0] || 'gemini';
      return {
        provider: provider as 'openai' | 'anthropic' | 'gemini',
        model: this.getDefaultModel(provider as 'openai' | 'anthropic' | 'gemini'),
        useReasoning: false,
        rationale: `Technical analysis task (using ${provider})`
      };
    }

    // Default to best available provider for marketing strategy
    const defaultProvider = preferredProviders.includes('anthropic') ? 'anthropic' : preferredProviders[0] || 'anthropic';
    return {
      provider: defaultProvider as 'openai' | 'anthropic' | 'gemini',
      model: this.getDefaultModel(defaultProvider as 'openai' | 'anthropic' | 'gemini'),
      useReasoning: this.shouldUseReasoning(message, researchContext),
      rationale: `Marketing strategy and consultation (using ${defaultProvider})`
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

  private getDefaultModel(provider: 'openai' | 'anthropic' | 'gemini' | 'perplexity'): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4o';
      case 'anthropic':
        return 'claude-sonnet-4-20250514';
      case 'gemini':
        return 'gemini-1.5-pro-002';
      case 'perplexity':
        return 'llama-3.1-sonar-small-128k-online';
      default:
        return 'claude-sonnet-4-20250514';
    }
  }

  private getWorkflowPreferredProviders(workflowContext?: WorkflowContext, healthyProviders: string[] = []): string[] {
    if (!workflowContext) {
      return healthyProviders;
    }

    // Stage-specific provider preferences
    const stagePreferences: Record<string, string[]> = {
      'discovery': ['anthropic', 'gemini', 'openai'], // Research-heavy
      'research': ['anthropic', 'gemini', 'openai'], // Deep analysis
      'strategic_brief': ['anthropic', 'openai', 'gemini'], // Strategy formulation
      'content': ['openai', 'anthropic', 'gemini'], // Creative content
      'visuals': ['openai', 'gemini', 'anthropic'], // Visual creativity
      'finalization': ['anthropic', 'openai', 'gemini'] // Review and refinement
    };

    // Priority-based adjustments
    const priorityAdjustments: Record<string, string[]> = {
      'speed': ['gemini', 'openai', 'anthropic'], // Faster models first
      'quality': ['anthropic', 'openai', 'gemini'], // Higher quality models
      'cost': ['gemini', 'openai', 'anthropic'] // More cost-effective options
    };

    let preferredOrder = stagePreferences[workflowContext.stage || 'discovery'] || healthyProviders;

    // Apply priority adjustments
    if (workflowContext.priority && priorityAdjustments[workflowContext.priority]) {
      preferredOrder = priorityAdjustments[workflowContext.priority];
    }

    // Filter to only healthy providers while maintaining preference order
    return preferredOrder.filter(provider => healthyProviders.includes(provider));
  }

  async executeRoutedPrompt(
    decision: RoutingDecision,
    message: string,
    researchContext: string,
    systemPrompt: string
  ): Promise<{ content: string; actualProvider: string; actualModel: string }> {
    
    let researchResults = '';
    
    // Perform research if needed with graceful fallback
    if (researchContext && researchContext.trim().length > 0 && decision.useReasoning) {
      console.log(`Using ${decision.provider} with reasoning loop`);
      try {
        const reasoningResult = await reasoningEngine.performReasoningLoop(message, researchContext);
        researchResults = reasoningResult.finalInsights;
      } catch (error) {
        console.log('Reasoning loop failed, using direct research fallback');
        try {
          researchResults = await performDeepResearch(message, researchContext);
        } catch (fallbackError) {
          console.log('Research failed, proceeding without research context');
          researchResults = '';
        }
      }
    } else if (researchContext && researchContext.trim().length > 0) {
      console.log(`Using ${decision.provider} with direct research`);
      try {
        researchResults = await performDeepResearch(message, researchContext);
      } catch (error) {
        console.log('Direct research failed, proceeding without research context');
        researchResults = '';
      }
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