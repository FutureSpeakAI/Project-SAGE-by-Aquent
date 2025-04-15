import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/Layout/Header";
import { SystemPromptPanel } from "@/components/OpenAI/SystemPromptPanel";
import { UserPromptPanel } from "@/components/OpenAI/UserPromptPanel";
import { RichOutputPanel } from "@/components/OpenAI/RichOutputPanel";
import { ApiKeyModal } from "@/components/OpenAI/ApiKeyModal";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { GenerateRequest, GenerateResponse } from "@/lib/types";

export default function Home() {
  // API key state
  const [apiKey, setApiKey] = useLocalStorage<string>("openai-api-key", "");
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  
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
              />
              
              <UserPromptPanel
                userPrompt={userPrompt}
                setUserPrompt={setUserPrompt}
                onGenerate={handleGenerate}
                isGenerating={generateMutation.isPending}
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
              />
            </div>
          </div>
        </div>
      </main>

      <ApiKeyModal
        open={apiKeyModalOpen}
        onOpenChange={setApiKeyModalOpen}
        apiKey={apiKey}
        setApiKey={setApiKey}
      />
    </div>
  );
}
