import { motion } from "framer-motion";
import { pageTransition } from "@/App";
import { SystemPromptPanel } from "@/components/OpenAI/SystemPromptPanel";
import { UserPromptPanel } from "@/components/OpenAI/UserPromptPanel";
import { RichOutputPanel } from "@/components/OpenAI/RichOutputPanel";
import { SavedPersona } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FileBadge } from "lucide-react";

interface ContentTabProps {
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  userPrompt: string;
  setUserPrompt: (prompt: string) => void;
  generatedContent: string;
  isGenerating: boolean;
  error: string | null;
  handleGenerate: () => void;
  handleClearOutput: () => void;
  handleOpenPersonaLibrary: () => void;
  handleOpenPromptLibrary: () => void;
  handleOpenBriefingLibrary: () => void;
  model: string;
  setModel: (model: string) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  personas: SavedPersona[] | undefined;
}

export function ContentTab({
  systemPrompt,
  setSystemPrompt,
  userPrompt,
  setUserPrompt,
  generatedContent,
  isGenerating,
  error,
  handleGenerate,
  handleClearOutput,
  handleOpenPersonaLibrary,
  handleOpenPromptLibrary,
  handleOpenBriefingLibrary,
  apiKey,
  model,
  setModel,
  temperature,
  setTemperature,
  personas
}: ContentTabProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageTransition}
      className="w-full relative overflow-hidden"
    >
      <div className="flex justify-end mb-4">
        <Button 
          variant="outline" 
          onClick={handleOpenBriefingLibrary}
          className="bg-white text-[#F15A22] hover:bg-[#F15A22] hover:text-white border-[#F15A22]"
        >
          <FileBadge className="h-4 w-4 mr-2" />
          Select Briefing
        </Button>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left side (input) */}
        <div className="w-full lg:w-1/2 space-y-6">
          <SystemPromptPanel
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            model={model}
            setModel={setModel}
            temperature={temperature}
            setTemperature={setTemperature}
            onOpenPersonaLibrary={handleOpenPersonaLibrary}
          />
          
          <UserPromptPanel
            userPrompt={userPrompt}
            setUserPrompt={setUserPrompt}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            onOpenPromptLibrary={handleOpenPromptLibrary}
          />
        </div>
        
        {/* Right side (output) */}
        <div className="w-full lg:w-1/2">
          <RichOutputPanel
            content={generatedContent}
            isLoading={isGenerating}
            error={error}
            onClear={handleClearOutput}
            onRetry={handleGenerate}
            model={model}
            temperature={temperature}
            onOpenPersonaLibrary={handleOpenPersonaLibrary}
            personas={personas}
          />
        </div>
      </div>
    </motion.div>
  );
}