import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  FileText,
  Database,
  Thermometer,
  Cpu,
  Settings2,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ContextSettings {
  selectedPersona?: number;
  selectedPrompts?: number[];
  selectedMemories?: number[];
  temperature: number;
  model: string;
  customInstructions?: string;
}

interface ContextControlPanelProps {
  contextSettings: ContextSettings;
  onContextChange: (settings: ContextSettings) => void;
}

export function ContextControlPanel({ contextSettings, onContextChange }: ContextControlPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    persona: true,
    prompts: true,
    memories: true,
    model: true,
    custom: false
  });

  // Load available personas
  const { data: personas = [] } = useQuery({
    queryKey: ["/api/personas"],
    staleTime: 5 * 60 * 1000,
  });

  // Load available prompts
  const { data: prompts = [] } = useQuery({
    queryKey: ["/api/prompts"],
    staleTime: 5 * 60 * 1000,
  });

  // Load project memories (placeholder for now - will be implemented)
  const { data: memories = [] } = useQuery({
    queryKey: ["/api/project-memories"],
    staleTime: 5 * 60 * 1000,
    enabled: false, // Disable until API is implemented
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateContext = (updates: Partial<ContextSettings>) => {
    onContextChange({ ...contextSettings, ...updates });
  };

  const handlePromptToggle = (promptId: number, checked: boolean) => {
    const currentPrompts = contextSettings.selectedPrompts || [];
    const updatedPrompts = checked
      ? [...currentPrompts, promptId]
      : currentPrompts.filter(id => id !== promptId);
    
    updateContext({ selectedPrompts: updatedPrompts });
  };

  const handleMemoryToggle = (memoryId: number, checked: boolean) => {
    const currentMemories = contextSettings.selectedMemories || [];
    const updatedMemories = checked
      ? [...currentMemories, memoryId]
      : currentMemories.filter(id => id !== memoryId);
    
    updateContext({ selectedMemories: updatedMemories });
  };

  const getActiveContextCount = () => {
    let count = 0;
    if (contextSettings.selectedPersona) count++;
    if (contextSettings.selectedPrompts?.length) count += contextSettings.selectedPrompts.length;
    if (contextSettings.selectedMemories?.length) count += contextSettings.selectedMemories.length;
    if (contextSettings.customInstructions?.trim()) count++;
    return count;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center">
          <Settings2 className="h-5 w-5 mr-2 text-[#F15A22]" />
          Context Settings
        </h2>
        <Badge variant="outline">{getActiveContextCount()} Active</Badge>
      </div>

      {/* Persona Selection */}
      <Collapsible open={expandedSections.persona} onOpenChange={() => toggleSection("persona")}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center">
                  <Brain className="h-4 w-4 mr-2 text-purple-500" />
                  AI Persona
                </div>
                {expandedSections.persona ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <Select
                value={contextSettings.selectedPersona?.toString() || ""}
                onValueChange={(value) => updateContext({ selectedPersona: value ? parseInt(value) : undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a persona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Persona</SelectItem>
                  {personas.map((persona: any) => (
                    <SelectItem key={persona.id} value={persona.id.toString()}>
                      {persona.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {contextSettings.selectedPersona && (
                <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
                  <Info className="h-3 w-3 inline mr-1" />
                  Persona will shape the AI's tone and expertise
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Prompt Templates */}
      <Collapsible open={expandedSections.prompts} onOpenChange={() => toggleSection("prompts")}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-blue-500" />
                  Prompt Templates
                  {contextSettings.selectedPrompts?.length ? (
                    <Badge variant="secondary" className="ml-2">
                      {contextSettings.selectedPrompts.length}
                    </Badge>
                  ) : null}
                </div>
                {expandedSections.prompts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {prompts.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {prompts.map((prompt: any) => (
                    <div key={prompt.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`prompt-${prompt.id}`}
                        checked={contextSettings.selectedPrompts?.includes(prompt.id) || false}
                        onCheckedChange={(checked) => handlePromptToggle(prompt.id, checked as boolean)}
                      />
                      <Label htmlFor={`prompt-${prompt.id}`} className="text-sm flex-1 cursor-pointer">
                        {prompt.name}
                        {prompt.category && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {prompt.category}
                          </Badge>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">
                  No saved prompts available
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Project Memories */}
      <Collapsible open={expandedSections.memories} onOpenChange={() => toggleSection("memories")}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center">
                  <Database className="h-4 w-4 mr-2 text-green-500" />
                  Project Memory
                  {contextSettings.selectedMemories?.length ? (
                    <Badge variant="secondary" className="ml-2">
                      {contextSettings.selectedMemories.length}
                    </Badge>
                  ) : null}
                </div>
                {expandedSections.memories ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="text-sm text-gray-500 text-center py-4">
                Project memories coming soon!
                <div className="text-xs mt-1">Upload brand guidelines and style docs</div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Model Settings */}
      <Collapsible open={expandedSections.model} onOpenChange={() => toggleSection("model")}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center">
                  <Cpu className="h-4 w-4 mr-2 text-orange-500" />
                  Model Settings
                </div>
                {expandedSections.model ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Model Selection */}
              <div>
                <Label className="text-sm font-medium">AI Model</Label>
                <Select
                  value={contextSettings.model}
                  onValueChange={(value) => updateContext({ model: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o (Best Quality)</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (Faster)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Temperature Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium flex items-center">
                    <Thermometer className="h-3 w-3 mr-1" />
                    Creativity
                  </Label>
                  <span className="text-sm text-gray-500">{contextSettings.temperature}</span>
                </div>
                <Slider
                  value={[contextSettings.temperature]}
                  onValueChange={(value) => updateContext({ temperature: value[0] })}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Custom Instructions */}
      <Collapsible open={expandedSections.custom} onOpenChange={() => toggleSection("custom")}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center">
                  <Settings2 className="h-4 w-4 mr-2 text-gray-500" />
                  Custom Instructions
                  {contextSettings.customInstructions?.trim() && (
                    <Badge variant="secondary" className="ml-2">Active</Badge>
                  )}
                </div>
                {expandedSections.custom ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <Textarea
                placeholder="Add specific instructions for this conversation..."
                value={contextSettings.customInstructions || ""}
                onChange={(e) => updateContext({ customInstructions: e.target.value })}
                className="min-h-[100px] resize-none"
              />
              <div className="text-xs text-gray-500 mt-2">
                These instructions will be added to every message in this session
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Separator />

      {/* Context Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Active Context Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {contextSettings.selectedPersona && (
              <div className="flex items-center">
                <Brain className="h-3 w-3 mr-2 text-purple-500" />
                <span>Persona active</span>
              </div>
            )}
            {contextSettings.selectedPrompts?.length ? (
              <div className="flex items-center">
                <FileText className="h-3 w-3 mr-2 text-blue-500" />
                <span>{contextSettings.selectedPrompts.length} prompt template(s)</span>
              </div>
            ) : null}
            {contextSettings.customInstructions?.trim() && (
              <div className="flex items-center">
                <Settings2 className="h-3 w-3 mr-2 text-gray-500" />
                <span>Custom instructions</span>
              </div>
            )}
            {getActiveContextCount() === 0 && (
              <div className="text-gray-500 italic">No context selected</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}