import { useState, useEffect, createContext, useContext } from 'react';
import { PromptRouterConfig } from '@/components/ui/PromptRouterControls';

interface GlobalRoutingState {
  config: PromptRouterConfig;
  updateConfig: (updates: Partial<PromptRouterConfig>) => void;
  resetConfig: () => void;
}

const defaultConfig: PromptRouterConfig = {
  enabled: true,
  manualProvider: undefined,
  manualModel: undefined,
  forceReasoning: undefined
};

const ROUTING_CONFIG_KEY = 'sage_routing_config';

export const GlobalRoutingContext = createContext<GlobalRoutingState | null>(null);

export const useGlobalRoutingConfig = (): GlobalRoutingState => {
  const context = useContext(GlobalRoutingContext);
  if (!context) {
    throw new Error('useGlobalRoutingConfig must be used within GlobalRoutingProvider');
  }
  return context;
};

export const useRoutingConfigState = () => {
  const [config, setConfig] = useState<PromptRouterConfig>(() => {
    // Load from localStorage on initialization
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(ROUTING_CONFIG_KEY);
        if (saved) {
          return { ...defaultConfig, ...JSON.parse(saved) };
        }
      } catch (error) {
        console.warn('Failed to load routing config from localStorage:', error);
      }
    }
    return defaultConfig;
  });

  // Save to localStorage whenever config changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ROUTING_CONFIG_KEY, JSON.stringify(config));
      } catch (error) {
        console.warn('Failed to save routing config to localStorage:', error);
      }
    }
  }, [config]);

  const updateConfig = (updates: Partial<PromptRouterConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const resetConfig = () => {
    setConfig(defaultConfig);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(ROUTING_CONFIG_KEY);
      } catch (error) {
        console.warn('Failed to clear routing config from localStorage:', error);
      }
    }
  };

  return { config, updateConfig, resetConfig };
};