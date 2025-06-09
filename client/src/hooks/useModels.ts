import { useQuery } from '@tanstack/react-query';

export interface AvailableModels {
  openai: string[];
  anthropic: string[];
  gemini: string[];
  perplexity: string[];
  imageGeneration: {
    openai: string[];
    gemini: string[];
  };
}

export const useModels = () => {
  return useQuery<AvailableModels>({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const response = await fetch('/api/models');
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};

export const getModelDisplayName = (model: string): string => {
  // Convert model names to more user-friendly display names
  const modelMap: Record<string, string> = {
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'claude-sonnet-4-20250514': 'Claude Sonnet 4',
    'claude-3-7-sonnet-20250219': 'Claude 3.7 Sonnet',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    'claude-3-opus-20240229': 'Claude 3 Opus',
    'claude-3-haiku-20240307': 'Claude 3 Haiku',
    'gemini-1.5-pro-002': 'Gemini 1.5 Pro',
    'gemini-1.5-flash-002': 'Gemini 1.5 Flash',
    'gemini-1.0-pro': 'Gemini 1.0 Pro',
    'llama-3.1-sonar-small-128k-online': 'Llama 3.1 Sonar Small (Web)',
    'llama-3.1-sonar-large-128k-online': 'Llama 3.1 Sonar Large (Web)', 
    'llama-3.1-sonar-huge-128k-online': 'Llama 3.1 Sonar Huge (Web)',
    'dall-e-3': 'DALL-E 3',
    'dall-e-2': 'DALL-E 2',
    'gpt-image-1': 'GPT Image 1',
    'imagen-3.0-generate-001': 'Imagen 3.0',
    'imagen-3.0-fast-generate-001': 'Imagen 3.0 Fast'
  };
  
  return modelMap[model] || model;
};

export const getModelProvider = (model: string): string => {
  if (model.startsWith('gpt-') || model.startsWith('dall-e')) return 'OpenAI';
  if (model.startsWith('claude-')) return 'Anthropic';
  if (model.startsWith('gemini-') || model.startsWith('imagen-')) return 'Google';
  if (model.startsWith('llama-') && model.includes('sonar')) return 'Perplexity';
  return 'Unknown';
};