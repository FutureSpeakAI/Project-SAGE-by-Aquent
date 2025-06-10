interface ProviderHealth {
  provider: 'openai' | 'anthropic' | 'gemini' | 'perplexity';
  isHealthy: boolean;
  lastChecked: Date;
  responseTime: number;
  errorCount: number;
  lastError?: string;
}

interface HealthCheckResult {
  availableProviders: string[];
  preferredProvider: string;
  fallbackChain: string[];
}

export class ProviderHealthMonitor {
  private healthStatus: Map<string, ProviderHealth> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60000; // 1 minute
  private readonly MAX_ERROR_COUNT = 5;
  private readonly HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

  constructor() {
    this.initializeHealthStatus();
    this.startPeriodicChecks();
  }

  private initializeHealthStatus() {
    const providers: Array<'openai' | 'anthropic' | 'gemini' | 'perplexity'> = ['openai', 'anthropic', 'gemini', 'perplexity'];
    
    providers.forEach(provider => {
      this.healthStatus.set(provider, {
        provider,
        isHealthy: true, // Assume healthy until proven otherwise
        lastChecked: new Date(),
        responseTime: 0,
        errorCount: 0
      });
    });
  }

  private startPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.CHECK_INTERVAL_MS);
  }

  private async performHealthChecks() {
    const providers = Array.from(this.healthStatus.keys());
    
    await Promise.allSettled(
      providers.map(provider => this.checkProviderHealth(provider))
    );
  }

  private async checkProviderHealth(provider: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await this.pingProvider(provider);
      const responseTime = Date.now() - startTime;
      
      const currentHealth = this.healthStatus.get(provider);
      if (currentHealth) {
        this.healthStatus.set(provider, {
          ...currentHealth,
          isHealthy,
          lastChecked: new Date(),
          responseTime,
          errorCount: isHealthy ? 0 : currentHealth.errorCount + 1,
          lastError: isHealthy ? undefined : currentHealth.lastError
        });
      }
    } catch (error) {
      const currentHealth = this.healthStatus.get(provider);
      if (currentHealth) {
        this.healthStatus.set(provider, {
          ...currentHealth,
          isHealthy: false,
          lastChecked: new Date(),
          responseTime: Date.now() - startTime,
          errorCount: currentHealth.errorCount + 1,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private async pingProvider(provider: string): Promise<boolean> {
    try {
      // Perform actual API test with simple request
      switch (provider) {
        case 'openai':
          if (!process.env.OPENAI_API_KEY) return false;
          return await this.testOpenAI();
        case 'anthropic':
          if (!process.env.ANTHROPIC_API_KEY) return false;
          return await this.testAnthropic();
        case 'gemini':
          if (!process.env.GOOGLE_API_KEY) return false;
          return await this.testGemini();
        case 'perplexity':
          if (!process.env.PERPLEXITY_API_KEY) return false;
          return await this.testPerplexity();
        default:
          return false;
      }
    } catch (error) {
      console.log(`Health check failed for ${provider}:`, error);
      return false;
    }
  }

  private async testOpenAI(): Promise<boolean> {
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 5000 });
      await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  private async testAnthropic(): Promise<boolean> {
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 5000 });
      await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'test' }]
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  private async testGemini(): Promise<boolean> {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      await model.generateContent('test');
      return true;
    } catch (error) {
      return false;
    }
  }

  private async testPerplexity(): Promise<boolean> {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5
        }),
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  public getHealthyProviders(): string[] {
    return Array.from(this.healthStatus.entries())
      .filter(([_, health]) => health.isHealthy && health.errorCount < this.MAX_ERROR_COUNT)
      .map(([provider, _]) => provider);
  }

  public getBestProvider(preferredProviders: string[] = []): HealthCheckResult {
    const healthyProviders = this.getHealthyProviders();
    
    // Try preferred providers first
    for (const preferred of preferredProviders) {
      if (healthyProviders.includes(preferred)) {
        return {
          availableProviders: healthyProviders,
          preferredProvider: preferred,
          fallbackChain: this.getFallbackChain(preferred)
        };
      }
    }

    // Fall back to best available provider based on response time
    const bestProvider = this.getBestPerformingProvider(healthyProviders);
    
    return {
      availableProviders: healthyProviders,
      preferredProvider: bestProvider,
      fallbackChain: this.getFallbackChain(bestProvider)
    };
  }

  private getBestPerformingProvider(availableProviders: string[]): string {
    if (availableProviders.length === 0) {
      // Emergency fallback - return first provider even if unhealthy
      return Array.from(this.healthStatus.keys())[0] || 'anthropic';
    }

    let bestProvider = availableProviders[0];
    let bestResponseTime = Infinity;

    for (const provider of availableProviders) {
      const health = this.healthStatus.get(provider);
      if (health && health.responseTime < bestResponseTime) {
        bestResponseTime = health.responseTime;
        bestProvider = provider;
      }
    }

    return bestProvider;
  }

  private getFallbackChain(primaryProvider: string): string[] {
    const allProviders = ['anthropic', 'openai', 'gemini'];
    const healthyProviders = this.getHealthyProviders();
    
    // Start with healthy providers, prioritizing the primary
    const chain = [primaryProvider];
    
    // Add other healthy providers
    healthyProviders
      .filter(p => p !== primaryProvider)
      .forEach(p => chain.push(p));
    
    // Add unhealthy providers as last resort
    allProviders
      .filter(p => !healthyProviders.includes(p))
      .forEach(p => chain.push(p));
    
    return chain;
  }

  public getProviderHealth(provider: string): ProviderHealth | undefined {
    return this.healthStatus.get(provider);
  }

  public getAllHealthStatus(): ProviderHealth[] {
    return Array.from(this.healthStatus.values());
  }

  public recordProviderError(provider: string, error: string) {
    const health = this.healthStatus.get(provider);
    if (health) {
      this.healthStatus.set(provider, {
        ...health,
        errorCount: health.errorCount + 1,
        lastError: error,
        isHealthy: health.errorCount + 1 < this.MAX_ERROR_COUNT
      });
    }
  }

  public recordProviderSuccess(provider: string, responseTime: number) {
    const health = this.healthStatus.get(provider);
    if (health) {
      this.healthStatus.set(provider, {
        ...health,
        isHealthy: true,
        responseTime,
        errorCount: Math.max(0, health.errorCount - 1), // Gradually recover from errors
        lastError: undefined,
        lastChecked: new Date()
      });
    }
  }

  public destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const providerHealthMonitor = new ProviderHealthMonitor();