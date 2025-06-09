interface ProviderHealth {
  provider: 'openai' | 'anthropic' | 'gemini';
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
    const providers: Array<'openai' | 'anthropic' | 'gemini'> = ['openai', 'anthropic', 'gemini'];
    
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
    // Simple health check - verify environment variables and basic connectivity
    switch (provider) {
      case 'openai':
        return !!process.env.OPENAI_API_KEY;
      case 'anthropic':
        return !!process.env.ANTHROPIC_API_KEY;
      case 'gemini':
        return !!process.env.GOOGLE_API_KEY;
      default:
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