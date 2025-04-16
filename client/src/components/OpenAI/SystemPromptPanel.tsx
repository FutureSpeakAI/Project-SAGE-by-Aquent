import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown, ChevronUp, BookText, Settings } from "lucide-react";
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
  onOpenPersonaLibrary?: () => void;
}

export function SystemPromptPanel({
  systemPrompt,
  setSystemPrompt,
  model,
  setModel,
  temperature,
  setTemperature,
  onOpenPersonaLibrary,
}: SystemPromptPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-black to-gray-800 border-b border-gray-200">
        <CollapsibleTrigger className="flex justify-between items-center w-full">
          <h2 className="font-semibold text-white flex items-center">
            <BookText className="h-4 w-4 mr-2 text-[#FF6600]" />
            AI Configuration
          </h2>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-[#FF6600]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#FF6600]" />
          )}
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent>
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              This is the system prompt field.
            </p>
            
            {onOpenPersonaLibrary && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1 border-[#FF6600] text-[#FF6600] hover:bg-[#FF6600] hover:text-white"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenPersonaLibrary();
                }}
              >
                <BookText className="h-4 w-4" />
                <span>Deploy From Library</span>
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="systemPrompt" className="text-[#FF6600] font-medium">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              className="resize-vertical h-32"
              placeholder="You are a helpful assistant..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="model" className="text-[#FF6600] font-medium">AI Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model" className="border-gray-300 focus:ring-[#FF6600] focus:border-[#FF6600]">
                <SelectValue placeholder="Select an AI model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">GPT-4o (Latest & Most Capable)</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="temperature" className="flex items-center">
                <span className="text-[#FF6600] font-medium">Temperature:</span>
                <span className="ml-2">{temperature.toFixed(1)}</span>
              </Label>
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
