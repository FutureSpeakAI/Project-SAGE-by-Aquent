import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useModels, getModelDisplayName, getModelProvider } from "@/hooks/useModels";
import { Loader2 } from "lucide-react";

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  type?: 'chat' | 'image';
  className?: string;
  placeholder?: string;
}

export function ModelSelector({ 
  value, 
  onValueChange, 
  type = 'chat', 
  className = "", 
  placeholder = "Select a model" 
}: ModelSelectorProps) {
  const { data: models, isLoading, error } = useModels();

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-gray-500">Loading models...</span>
      </div>
    );
  }

  if (error || !models) {
    return (
      <div className={`text-sm text-red-500 ${className}`}>
        Failed to load models
      </div>
    );
  }

  const getChatModels = () => {
    const allModels = [
      ...models.openai,
      ...models.anthropic,
      ...models.gemini,
      ...(models.perplexity || [])
    ];
    return allModels;
  };

  const getImageModels = () => {
    if (!models?.imageGeneration) {
      return [];
    }
    
    const allModels = [
      ...(models.imageGeneration.openai || []),
      ...(models.imageGeneration.gemini || [])
    ];
    return allModels;
  };

  const availableModels = type === 'chat' ? getChatModels() : getImageModels();

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'OpenAI': return 'bg-green-100 text-green-800';
      case 'Anthropic': return 'bg-orange-100 text-orange-800';
      case 'Google': return 'bg-blue-100 text-blue-800';
      case 'Perplexity': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {availableModels.map((model) => {
          const provider = getModelProvider(model);
          const displayName = getModelDisplayName(model);
          
          return (
            <SelectItem key={model} value={model}>
              <div className="flex items-center justify-between w-full">
                <span>{displayName}</span>
                <Badge 
                  variant="secondary" 
                  className={`ml-2 text-xs ${getProviderColor(provider)}`}
                >
                  {provider}
                </Badge>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}