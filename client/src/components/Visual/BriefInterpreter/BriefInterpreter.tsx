import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BriefUploadDialog } from "./BriefUploadDialog";
import { BriefingLibrary } from "@/components/Briefing/BriefingLibrary";
import { DocumentUploadDialog } from "@/components/Briefing/DocumentUploadDialog";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Sparkles, Library, Upload } from "lucide-react";
import { ContentType, GeneratedContent } from "@shared/schema";

interface BriefInterpreterProps {
  onPromptGenerated: (prompt: string) => void;
  onSwitchToConversation: () => void;
  onBriefingProcessed?: (briefContent: string, briefTitle: string) => void;
}

interface GeneratePromptFromBriefRequest {
  brief: string;
  model: string;
}

export function BriefInterpreter({ onPromptGenerated, onSwitchToConversation, onBriefingProcessed }: BriefInterpreterProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showBriefingLibrary, setShowBriefingLibrary] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const { toast } = useToast();

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: GeneratePromptFromBriefRequest) => {
      const response = await fetch("/api/interpret-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to process brief: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.prompt) {
        // Check if the prompt contains multiple image requests
        const hasMultipleImages = data.prompt.toLowerCase().includes('image') && 
          (data.prompt.includes('two') || data.prompt.includes('three') || data.prompt.includes('multiple') || 
           data.prompt.includes('several') || /\d+.*image/i.test(data.prompt));
        
        if (hasMultipleImages) {
          // Switch to conversation tab for multiple image handling
          onSwitchToConversation();
          toast({
            title: "Multiple prompts generated",
            description: "Your brief requires multiple images. Switched to Conversation tab to select individual prompts.",
          });
        } else {
          // Single image - use standard mode
          onPromptGenerated(data.prompt);
          toast({
            title: "Brief interpreted successfully",
            description: "Your creative brief has been converted to an image prompt.",
          });
        }
      } else {
        throw new Error(data.message || "Failed to generate prompt");
      }
    },
    onError: (error) => {
      console.error("Brief interpretation error:", error);
      toast({
        title: "Brief interpretation failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleOpenUploadDialog = () => {
    setShowUploadDialog(true);
  };

  const handleCloseUploadDialog = () => {
    setShowUploadDialog(false);
  };

  const handleBriefProcessed = (prompt: string) => {
    onPromptGenerated(prompt);
  };

  const handleSelectBriefing = (content: GeneratedContent) => {
    // Close the briefing library dialog
    setShowBriefingLibrary(false);
    
    // Notify parent that briefing was processed so agent can acknowledge it
    if (onBriefingProcessed) {
      onBriefingProcessed(content.content, content.title);
    }
    
    // Convert the briefing content to an image generation prompt
    mutate({
      brief: content.content,
      model: "gpt-4o"
    });
  };

  const handleDocumentProcessed = (content: string) => {
    // Convert the processed document to an image generation prompt
    mutate({
      brief: content,
      model: "gpt-4o"
    });
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Creative Brief Interpreter</CardTitle>
          <CardDescription>
            Convert creative briefs into optimized image generation prompts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="library" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="library" className="flex items-center gap-2">
                <Library className="h-4 w-4" />
                Library
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="mt-4">
              <div className="flex flex-col items-center justify-center text-center p-6 border border-dashed rounded-lg">
                <Library className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium mb-2">Select from saved briefs</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a previously saved creative brief to convert into an image prompt.
                </p>
                <Button 
                  onClick={() => setShowBriefingLibrary(true)} 
                  disabled={isPending} 
                  className="gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Library className="h-4 w-4" />
                      Browse Briefing Library
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="mt-4">
              <div className="flex flex-col items-center justify-center text-center p-6 border border-dashed rounded-lg">
                <Upload className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium mb-2">Upload brief document</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a PDF, DOCX, or TXT file containing your creative brief.
                </p>
                <Button 
                  onClick={() => setShowDocumentUpload(true)} 
                  disabled={isPending} 
                  className="gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload Document
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <p className="text-xs text-muted-foreground">
            All methods will convert your brief into an optimized image generation prompt.
          </p>
        </CardFooter>
      </Card>

      <BriefUploadDialog
        open={showUploadDialog}
        onClose={handleCloseUploadDialog}
        onUpload={handleBriefProcessed}
      />

      <BriefingLibrary
        open={showBriefingLibrary}
        onOpenChange={setShowBriefingLibrary}
        onSelectBriefing={handleSelectBriefing}
        onUploadDocument={() => setShowDocumentUpload(true)}
      />

      <DocumentUploadDialog
        open={showDocumentUpload}
        onOpenChange={setShowDocumentUpload}
        onDocumentProcessed={handleDocumentProcessed}
      />
    </>
  );
}