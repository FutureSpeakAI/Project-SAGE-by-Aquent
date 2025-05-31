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