import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/Layout/Header";
import { ApiKeyModal } from "@/components/OpenAI/ApiKeyModal";
import { LibraryDialog } from "@/components/OpenAI/LibraryDialog";
import { SavedContentLibrary } from "@/components/OpenAI/SavedContentLibrary";
import { SystemPromptPanel } from "@/components/OpenAI/SystemPromptPanel";
import { UserPromptPanel } from "@/components/OpenAI/UserPromptPanel";
import { RichOutputPanel } from "@/components/OpenAI/RichOutputPanel";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { GenerateRequest, GenerateResponse, SavedPrompt, SavedPersona } from "@/lib/types";
import { ContentType, GeneratedContent } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Library } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TabNavigation } from "@/components/Layout/TabNavigation";
import { ContentTab } from "@/components/Content/ContentTab";
import { BriefingTab } from "@/components/Briefing/BriefingTab";
import { BriefingLibrary } from "@/components/Briefing/BriefingLibrary";
import { DocumentUploadDialog } from "@/components/Briefing/DocumentUploadDialog";
import { DatabaseStatusAlert } from "@/components/ui/DatabaseStatus";
import { DataMigrationDialog } from "@/components/ui/DataMigrationDialog";
import { AppTab } from "@/App";

export default function Home() {
  // API key is now stored in environment variables on the server
  // These state variables are kept to avoid breaking changes in the UI
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  // Dummy state for API key to maintain compatibility with existing components
  const [apiKey, setApiKey] = useState("stored-in-environment");
  
  // Library dialog state
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [activeLibraryTab, setActiveLibraryTab] = useState<"prompts" | "personas">("prompts");
  
  // Saved content library state
  const [savedContentLibraryOpen, setSavedContentLibraryOpen] = useState(false);
  
  // Data migration dialog state
  const [dataMigrationOpen, setDataMigrationOpen] = useState(false);
  
  // Fetch personas for context menu
  const { data: personas = [] } = useQuery<SavedPersona[]>({ 
    queryKey: ["/api/personas"],
  });
  
  // Configuration state
  const [systemPrompt, setSystemPrompt] = useLocalStorage<string>(
    "system-prompt",
    "You are a helpful assistant that responds to user questions with clear, factual, and concise information. If you're unsure about something, acknowledge your uncertainty. Write in a friendly, conversational tone."
  );
  const [model, setModel] = useLocalStorage<string>("openai-model", "gpt-4o");
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
      // Check if this is an API key related error
      const isApiKeyError = error.message && (
        error.message.includes("API key") || 
        error.message.includes("authentication") || 
        error.message.includes("401")
      );
      
      toast({
        title: isApiKeyError ? "API Authentication Error" : "Generation failed",
        description: isApiKeyError 
          ? "The server's OpenAI API key appears to be invalid. Please contact the administrator."
          : error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!userPrompt.trim()) {
      toast({
        title: "Empty Prompt",
        description: "Please enter a prompt to generate content.",
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({
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
    // Use the persona for text transformations and/or set as system prompt
    if (activeLibraryTab === "personas") {
      // If opened from the system prompt panel, set the system prompt
      setSystemPrompt(persona.instruction);
      toast({
        title: "Persona Deployed",
        description: `The persona "${persona.name}" has been deployed as your system prompt.`,
      });
    } else {
      // Otherwise it's being used for the AI context menu
      toast({
        title: "Persona Selected",
        description: `The persona "${persona.name}" is now active for text transformations.`,
      });
    }
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
  
  // Handle opening the saved content library
  const handleOpenSavedContentLibrary = () => {
    setSavedContentLibraryOpen(true);
  };
  
  // Handle opening the data migration dialog
  const handleOpenDataMigration = () => {
    setDataMigrationOpen(true);
  };
  
  // Handle selecting saved content from the library
  const handleSelectSavedContent = (content: GeneratedContent) => {
    setGeneratedContent(content.content);
    if (content.systemPrompt) {
      setSystemPrompt(content.systemPrompt);
    }
    if (content.userPrompt) {
      setUserPrompt(content.userPrompt);
    }
    
    toast({
      title: "Content Loaded",
      description: `The content "${content.title}" has been loaded.`,
    });
  };
  
  // Tab-related state
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.BRIEFING);
  const [briefingLibraryOpen, setBriefingLibraryOpen] = useState(false);
  const [documentUploadOpen, setDocumentUploadOpen] = useState(false);
  const [briefingContent, setBriefingContent] = useState("");
  
  // Handle briefing-related actions
  const handleOpenBriefingLibrary = () => {
    setBriefingLibraryOpen(true);
  };
  
  // Helper function to convert HTML to plain text
  const convertHtmlToPlainText = (html: string): string => {
    // First, remove any CSS/style content completely
    let cleanedHtml = html
      // Remove any <style> tags and their contents
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove any inline style attributes
      .replace(/\s+style=["'][^"']*["']/gi, '')
      // Remove any <head> section completely
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      // Remove any DOCTYPE, html, and body tags
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<\/?html[^>]*>/gi, '')
      .replace(/<\/?body[^>]*>/gi, '');
    
    // Create a temporary element to handle HTML content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanedHtml;
    
    // Format the HTML into a structured text
    let formattedText = cleanedHtml
      // Add newlines and spacing for headings
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n\n#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n\n##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n\n###### $1\n\n')
      
      // Format strong and bold text
      .replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**')
      
      // Format italic text
      .replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*')
      
      // Format list items with bullet points
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n• $1')
      
      // Fix nested lists
      .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, '\n$1\n')
      .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, '\n$1\n')
      
      // Add newlines after paragraphs and divs
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      
      // Add spacing for horizontal rules
      .replace(/<hr[^>]*>/gi, '\n\n---\n\n')
      
      // Handle line breaks
      .replace(/<br[^>]*>/gi, '\n')
      
      // Remove all remaining HTML tags
      .replace(/<[^>]*>/g, '')
      
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      
      // Fix multiple consecutive line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      
      // Trim leading/trailing whitespace
      .trim();
      
    // Final cleanup to improve readability
    return formattedText
      // Ensure sections and list items are properly spaced
      .replace(/•\s*\n\s*•/g, '•\n•')
      // Make sure numbered sections stand out
      .replace(/\n(\d+)\.\s/g, '\n\n$1. ')
      // Remove any residual indentation that might have come from HTML
      .replace(/\n\s{2,}/g, '\n')
      // Add a blank line after main title
      .replace(/(^.+$)/, '$1\n');
  };

  const handleSelectBriefing = (content: GeneratedContent) => {
    // Convert HTML content to plain text for better usage in the content prompt
    const plainTextContent = convertHtmlToPlainText(content.content);
    
    // Set the converted plain text briefing as the user prompt
    setUserPrompt(plainTextContent);
    
    // Switch to the Content tab after selecting a briefing
    setActiveTab(AppTab.CONTENT);
    
    // Show a toast notification with clearer instructions
    toast({
      title: "Briefing Selected",
      description: `The briefing "${content.title}" has been loaded as your prompt. Click "Generate" to create content based on these instructions.`,
    });
    
    setBriefingLibraryOpen(false);
  };
  
  const handleOpenDocumentUpload = () => {
    setDocumentUploadOpen(true);
  };
  
  const handleDocumentProcessed = (content: string) => {
    // Check if the content appears to be HTML and convert it if needed
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(content);
    
    // Set the processed document content as the user prompt, converting if it's HTML
    if (isHtml) {
      const plainTextContent = convertHtmlToPlainText(content);
      setUserPrompt(plainTextContent);
    } else {
      setUserPrompt(content);
    }
    
    toast({
      title: "Document Processed",
      description: "Your document has been processed and loaded into the prompt.",
    });
  };
  
  const handleSaveBriefing = (title: string, content: string) => {
    // Create a new saved content record with type 'briefing'
    const newBriefing = {
      title,
      content,
      contentType: ContentType.BRIEFING, // Ensure this is 'briefing'
      systemPrompt: null,
      userPrompt: null,
      model: null,
      temperature: null,
      metadata: null
    };
    
    fetch('/api/generated-contents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newBriefing),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to save briefing');
        }
        return response.json();
      })
      .then(() => {
        toast({
          title: "Briefing Saved",
          description: "Your briefing has been saved to the library.",
        });
      })
      .catch(error => {
        toast({
          title: "Error",
          description: error.message || "Failed to save briefing.",
          variant: "destructive",
        });
      });
  };

  // No longer need to check for API key as it's stored in environment

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onOpenApiKeyModal={() => setApiKeyModalOpen(true)} 
        onOpenSavedContentLibrary={handleOpenSavedContentLibrary}
        onOpenDataMigration={handleOpenDataMigration}
      />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Database status alert */}
          <DatabaseStatusAlert />
          
          {/* Tab navigation */}
          <TabNavigation activeTab={activeTab} onChangeTab={setActiveTab} />
          
          {/* Tab content with animations */}
          <div className="mt-6">
            <AnimatePresence mode="wait">
              {activeTab === AppTab.CONTENT ? (
                <ContentTab 
                  key="content-tab"
                  systemPrompt={systemPrompt}
                  setSystemPrompt={setSystemPrompt}
                  userPrompt={userPrompt}
                  setUserPrompt={setUserPrompt}
                  generatedContent={generatedContent}
                  isGenerating={generateMutation.isPending}
                  error={generateMutation.error?.message || null}
                  handleGenerate={handleGenerate}
                  handleClearOutput={handleClearOutput}
                  handleOpenPersonaLibrary={handleOpenPersonaLibrary}
                  handleOpenPromptLibrary={handleOpenPromptLibrary}
                  handleOpenBriefingLibrary={handleOpenBriefingLibrary}
                  model={model}
                  setModel={setModel}
                  temperature={temperature}
                  setTemperature={setTemperature}
                  personas={personas}
                />
              ) : (
                <BriefingTab
                  key="briefing-tab"
                  model={model}
                  temperature={temperature}
                  personas={personas}
                  handleOpenPersonaLibrary={handleOpenPersonaLibrary}
                  handleSaveBriefing={handleSaveBriefing}
                  handleUploadDocument={handleOpenDocumentUpload}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Modals & Dialogs */}
      {/* ApiKeyModal is no longer needed as we use server environment variables now */}
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
      
      <SavedContentLibrary
        open={savedContentLibraryOpen}
        onOpenChange={setSavedContentLibraryOpen}
        onSelectContent={handleSelectSavedContent}
      />
      
      <BriefingLibrary
        open={briefingLibraryOpen}
        onOpenChange={setBriefingLibraryOpen}
        onSelectBriefing={handleSelectBriefing}
        onUploadDocument={handleOpenDocumentUpload}
      />
      
      <DocumentUploadDialog
        open={documentUploadOpen}
        onOpenChange={setDocumentUploadOpen}
        onDocumentProcessed={handleDocumentProcessed}
      />
      
      <DataMigrationDialog
        open={dataMigrationOpen}
        onOpenChange={setDataMigrationOpen}
      />
    </div>
  );
}
