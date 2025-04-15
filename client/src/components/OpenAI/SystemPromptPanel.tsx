import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown, ChevronUp, BookText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

interface SystemPromptPanelProps {
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  model: string;
  setModel: (model: string) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  onOpenPromptLibrary?: () => void;
}

export function SystemPromptPanel({
  systemPrompt,
  setSystemPrompt,
  model,
  setModel,
  temperature,
  setTemperature,
  onOpenPromptLibrary,
}: SystemPromptPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <CollapsibleTrigger className="flex justify-between items-center w-full">
          <h2 className="font-semibold text-gray-700">System Prompt</h2>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent>
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Configure how the AI should behave when responding to your prompts.
            </p>
            
            {onOpenPromptLibrary && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenPromptLibrary();
                }}
              >
                <BookText className="h-4 w-4" />
                <span>Prompt Library</span>
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Instructions</Label>
            <Textarea
              id="systemPrompt"
              className="resize-none h-32"
              placeholder="You are a helpful assistant..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                <SelectItem value="gpt-3.5-turbo-16k">GPT-3.5 Turbo (16K)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="temperature">Temperature: {temperature.toFixed(1)}</Label>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={[temperature]}
              onValueChange={(values) => setTemperature(values[0])}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Precise</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
