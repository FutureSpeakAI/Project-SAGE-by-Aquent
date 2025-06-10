import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BriefUploadDialog } from "./BriefUploadDialog";
import { BriefingLibrary } from "@/components/Briefing/BriefingLibrary";
import { DocumentUploadDialog } from "@/components/Briefing/DocumentUploadDialog";

import { useToast } from "@/hooks/use-toast";
import { FileText, Sparkles, Library, Upload } from "lucide-react";
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

  const processBrief = (briefContent: string, briefTitle: string) => {
    // Switch to conversation with the brief content
    onSwitchToConversation();
    
    // Create clean user message
    const userMessage = `I've selected the "${briefTitle}" brief. Please analyze it and tell me what visual content we need to create.`;
    
    // Create the AI analysis prompt
    const analysisPrompt = `Please analyze this creative brief and identify what visual content we need to create:

Brief: ${briefContent}

Focus on identifying specific visual deliverables (number of images, type of content, platforms) and ask if I'd like you to create image generation prompts for them. Be conversational and helpful.`;
    
    if (onBriefingProcessed) {
      onBriefingProcessed(userMessage, analysisPrompt);
    }
    
    toast({
      title: "Brief loaded",
      description: "Switched to Conversation tab. SAGE will analyze the brief.",
    });
  };

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
    
    // Process the brief directly
    processBrief(content.content, content.title);
  };

  const handleDocumentProcessed = (content: string) => {
    // Process the uploaded document directly
    processBrief(content, "Uploaded Document");
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
                  className="gap-2"
                >
                  <Library className="h-4 w-4" />
                  Browse Briefing Library
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
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Document
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