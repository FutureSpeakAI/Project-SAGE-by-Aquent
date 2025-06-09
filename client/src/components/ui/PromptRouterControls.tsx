import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface PromptRouterConfig {
  enabled: boolean;
  manualProvider?: 'openai' | 'anthropic' | 'gemini';
  manualModel?: string;
  forceReasoning?: boolean;
}

interface PromptRouterControlsProps {
  onConfigChange: (config: PromptRouterConfig) => void;
  className?: string;
}

const MODEL_OPTIONS = {
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ],
  gemini: [
    { value: 'gemini-1.5-pro-002', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash-002', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' }
  ]
};

export function PromptRouterControls({ onConfigChange, className }: PromptRouterControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [config, setConfig] = useState<PromptRouterConfig>({
    enabled: true,
    manualProvider: undefined,
    manualModel: undefined,
    forceReasoning: undefined
  });

  const updateConfig = (updates: Partial<PromptRouterConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleProviderChange = (provider: string) => {
    if (provider === '') {
      updateConfig({
        manualProvider: undefined,
        manualModel: undefined
      });
    } else {
      const typedProvider = provider as 'openai' | 'anthropic' | 'gemini';
      updateConfig({
        manualProvider: typedProvider,
        manualModel: MODEL_OPTIONS[typedProvider][0].value
      });
    }
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Label htmlFor="router-enabled" className="text-sm font-medium">
            Smart AI Routing
          </Label>
          <Switch
            id="router-enabled"
            checked={config.enabled}
            onCheckedChange={(checked) => updateConfig({ enabled: checked })}
          />
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          Advanced
          {isExpanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manual-provider" className="text-sm">
                Override Provider
              </Label>
              <Select
                value={config.manualProvider || "auto"}
                onValueChange={(value) => handleProviderChange(value === "auto" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto (Recommended)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Recommended)</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                  <SelectItem value="openai">OpenAI GPT</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.manualProvider && (
              <div className="space-y-2">
                <Label htmlFor="manual-model" className="text-sm">
                  Model
                </Label>
                <Select
                  value={config.manualModel || MODEL_OPTIONS[config.manualProvider][0].value}
                  onValueChange={(model) => updateConfig({ manualModel: model })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS[config.manualProvider].map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <Label htmlFor="force-reasoning" className="text-sm">
              Force Deep Analysis
            </Label>
            <Switch
              id="force-reasoning"
              checked={config.forceReasoning || false}
              onCheckedChange={(checked) => updateConfig({ forceReasoning: checked })}
            />
          </div>

          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
            <p className="font-medium mb-1">Automatic Routing:</p>
            <p>• Research queries → Anthropic + Deep Analysis</p>
            <p>• Creative tasks → OpenAI</p>
            <p>• Technical analysis → Gemini</p>
          </div>
        </div>
      )}
    </Card>
  );
}