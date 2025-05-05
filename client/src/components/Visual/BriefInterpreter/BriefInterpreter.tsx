import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BriefUploadDialog } from "./BriefUploadDialog";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Sparkles } from "lucide-react";

interface BriefInterpreterProps {
  onPromptGenerated: (prompt: string) => void;
}

interface GeneratePromptFromBriefRequest {
  brief: string;
  model: string;
}

export function BriefInterpreter({ onPromptGenerated }: BriefInterpreterProps) {
  // Simplified fallback component to improve stability
  return (
    <div className="p-6 text-center">
      <div className="mb-4 text-yellow-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3 className="text-lg font-medium">Brief Interpreter Temporarily Disabled</h3>
      <p className="mt-2 text-sm text-gray-500">
        This feature has been temporarily disabled to improve application stability.
        Please use the standard image generation features instead.
      </p>
      <button 
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => {
          onPromptGenerated("A detailed product photo showcasing premium design elements with professional lighting");
        }}
      >
        Apply Sample Prompt
      </button>
    </div>
  );
  
  /* Original component code removed for stability */
  const [showUploadDialog, setShowUploadDialog] = useState(false);
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
        onPromptGenerated(data.prompt);
        toast({
          title: "Brief interpreted successfully",
          description: "Your creative brief has been converted to an image prompt.",
          variant: "default",
        });
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

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Creative Brief Interpreter</CardTitle>
          <CardDescription>
            Convert client's creative brief documents into optimized image prompts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-6 border border-dashed rounded-lg">
            <FileText className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium mb-2">Upload your creative brief</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We'll analyze your brief and extract the key visual elements to create an optimal image prompt.
            </p>
            <Button onClick={handleOpenUploadDialog} disabled={isPending} className="gap-2">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Upload Brief
                </>
              )}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <p className="text-xs text-muted-foreground">
            Supported file formats: PDF, DOCX, and TXT. Max file size: 5MB.
          </p>
        </CardFooter>
      </Card>

      <BriefUploadDialog
        open={showUploadDialog}
        onClose={handleCloseUploadDialog}
        onUpload={handleBriefProcessed}
      />
    </>
  );
}