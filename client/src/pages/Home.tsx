import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/Layout/Header";
import { SystemPromptPanel } from "@/components/OpenAI/SystemPromptPanel";
import { UserPromptPanel } from "@/components/OpenAI/UserPromptPanel";
import { RichOutputPanel } from "@/components/OpenAI/RichOutputPanel";
import { ApiKeyModal } from "@/components/OpenAI/ApiKeyModal";
import { LibraryDialog } from "@/components/OpenAI/LibraryDialog";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { GenerateRequest, GenerateResponse, SavedPrompt, SavedPersona } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Library } from "lucide-react";

export default function Home() {
  // API key state
  const [apiKey, setApiKey] = useLocalStorage<string>("openai-api-key", "");
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  
  // Library dialog state
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [activeLibraryTab, setActiveLibraryTab] = useState<"prompts" | "personas">("prompts");
  
  // Configuration state
  const [systemPrompt, setSystemPrompt] = useLocalStorage<string>(
    "system-prompt",
    "You are a helpful assistant that responds to user questions with clear, factual, and concise information. If you're unsure about something, acknowledge your uncertainty. Write in a friendly, conversational tone."
  );
  const [model, setModel] = useLocalStorage<string>("openai-model", "gpt-3.5-turbo");
  const [temperature, setTemperature] = useLocalStorage<number>("openai-temperature", 0.7);
  
  // User input state
  const [userPrompt, setUserPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  
  const { toast } = useToast();

  // Create a mutation to handle generation
  const generateMutation = useMutation({
    mutationFn: async (data: GenerateRequest) => {
      const response = await apiRequest("POST", "/api/generate", data);
      return response.json() as Promise<GenerateResponse>;
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!apiKey) {
      setApiKeyModalOpen(true);
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key to generate content.",
        variant: "destructive",
      });
      return;
    }

    if (!userPrompt.trim()) {
      toast({
        title: "Empty Prompt",
        description: "Please enter a prompt to generate content.",
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({
      apiKey,
      model,
      systemPrompt,
      userPrompt,
      temperature,
    });
  };

  const handleClearOutput = () => {
    setGeneratedContent("");
  };

  // Handle selecting a saved prompt
  const handleSelectPrompt = (prompt: SavedPrompt) => {
    if (prompt.systemPrompt) {
      setSystemPrompt(prompt.systemPrompt);
    }
    
    if (prompt.userPrompt) {
      setUserPrompt(prompt.userPrompt);
    }
    
    toast({
      title: "Prompt Loaded",
      description: `The prompt "${prompt.name}" has been loaded.`,
    });
  };

  // Handle selecting a persona for the context menu
  const handleSelectPersona = (persona: SavedPersona) => {
    // This will be used in the context menu component
    toast({
      title: "Persona Selected",
      description: `The persona "${persona.name}" is now active for text transformations.`,
    });
  };

  // Open the library dialog to the prompts tab
  const handleOpenPromptLibrary = () => {
    setActiveLibraryTab("prompts");
    setLibraryOpen(true);
  };

  // Open the library dialog to the personas tab
  const handleOpenPersonaLibrary = () => {
    setActiveLibraryTab("personas");
    setLibraryOpen(true);
  };

  // Check for API key on component mount
  useEffect(() => {
    if (!apiKey) {
      setApiKeyModalOpen(true);
    }
  }, [apiKey]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onOpenApiKeyModal={() => setApiKeyModalOpen(true)} />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Hero section with ninja theme */}
          <div className="mb-6 p-6 bg-gradient-to-r from-black to-gray-800 rounded-lg shadow-md text-white">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-4 md:mb-0">
                <h2 className="text-2xl font-bold mb-2">Welcome to <span className="text-[#FF6600]">MyMarketing</span>.Ninja</h2>
                <p className="text-gray-300 max-w-xl">Unleash the power of AI to create stunning marketing content with ninja-like precision and stealth. Generate, edit, and transform text in seconds.</p>
              </div>
              <div className="flex-shrink-0">
                <svg width="80" height="80" viewBox="0 0 24 24" className="opacity-80">
                  <path fill="#FF6600" d="M12,2C6.5,2,2,6.5,2,12c0,5.5,4.5,10,10,10s10-4.5,10-10C22,6.5,17.5,2,12,2z"/>
                  <path fill="black" d="M12,7c-2.8,0-5,2.2-5,5c0,0.3,0,0.7,0.1,1h9.7c0.1-0.3,0.1-0.7,0.1-1C17,9.2,14.8,7,12,7z"/>
                  <path fill="white" d="M9,10c0.6,0,1,0.4,1,1s-0.4,1-1,1s-1-0.4-1-1S8.4,10,9,10z M15,10c0.6,0,1,0.4,1,1s-0.4,1-1,1s-1-0.4-1-1S14.4,10,15,10z"/>
                </svg>
              </div>
            </div>
          </div>
          
          {/* Library button */}
          <div className="mb-4 flex justify-end">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 border-[#FF6600] text-[#FF6600] hover:bg-[#FF6600] hover:text-white"
              onClick={() => setLibraryOpen(true)}
            >
              <Library className="h-4 w-4" />
              <span>Open Library</span>
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
                onOpenPromptLibrary={handleOpenPromptLibrary}
              />
              
              <UserPromptPanel
                userPrompt={userPrompt}
                setUserPrompt={setUserPrompt}
                onGenerate={handleGenerate}
                isGenerating={generateMutation.isPending}
                onOpenPromptLibrary={handleOpenPromptLibrary}
              />
            </div>
            
            {/* Right side (output) */}
            <div className="w-full lg:w-1/2">
              <RichOutputPanel
                content={generatedContent}
                isLoading={generateMutation.isPending}
                error={generateMutation.error?.message || null}
                onClear={handleClearOutput}
                onRetry={handleGenerate}
                apiKey={apiKey}
                model={model}
                temperature={temperature}
                onOpenPersonaLibrary={handleOpenPersonaLibrary}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Modals & Dialogs */}
      <ApiKeyModal
        open={apiKeyModalOpen}
        onOpenChange={setApiKeyModalOpen}
        apiKey={apiKey}
        setApiKey={setApiKey}
      />
      
      <LibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelectPrompt={handleSelectPrompt}
        onSelectPersona={handleSelectPersona}
        initialTab={activeLibraryTab}
      />
    </div>
  );
}
