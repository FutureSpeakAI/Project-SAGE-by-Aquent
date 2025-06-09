import { createContext, useContext, useState, useCallback } from 'react';

export interface PromptRouterConfig {
  enabled: boolean;
  manualProvider?: 'openai' | 'anthropic' | 'gemini' | 'perplexity';
  manualModel?: string;
  forceReasoning?: boolean;
}

interface GlobalRoutingState {
  config: PromptRouterConfig;
  updateConfig: (newConfig: Partial<PromptRouterConfig>) => void;
  resetConfig: () => void;
}

const defaultConfig: PromptRouterConfig = {
  enabled: true,
  manualProvider: undefined,
  manualModel: undefined,
  forceReasoning: false
};

export const GlobalRoutingContext = createContext<GlobalRoutingState | null>(null);

export const useGlobalRoutingConfig = () => {
  const context = useContext(GlobalRoutingContext);
  if (!context) {
    throw new Error('useGlobalRoutingConfig must be used within a GlobalRoutingProvider');
  }
  return context;
};

export const useRoutingConfigState = (): GlobalRoutingState => {
  const [config, setConfig] = useState<PromptRouterConfig>(() => {
    // Try to load from localStorage on initialization
    try {
      const saved = localStorage.getItem('sage-routing-config');
      return saved ? JSON.parse(saved) : defaultConfig;
    } catch {
      return defaultConfig;
    }
  });

  const updateConfig = useCallback((newConfig: Partial<PromptRouterConfig>) => {
    setConfig(prevConfig => {
      const updatedConfig = { ...prevConfig, ...newConfig };
      // Persist to localStorage
      try {
        localStorage.setItem('sage-routing-config', JSON.stringify(updatedConfig));
      } catch (error) {
        console.warn('Failed to save routing config to localStorage:', error);
      }
      return updatedConfig;
    });
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
    try {
      localStorage.removeItem('sage-routing-config');
    } catch (error) {
      console.warn('Failed to remove routing config from localStorage:', error);
    }
  }, []);

  return {
    config,
    updateConfig,
    resetConfig
  };
};