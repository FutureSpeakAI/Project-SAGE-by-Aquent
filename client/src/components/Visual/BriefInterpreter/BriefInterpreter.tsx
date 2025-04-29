import { useState } from "react";
import { motion } from "framer-motion";
import { pageTransition } from "@/App";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, FileUp, Clipboard, Copy, CheckCircle2 } from "lucide-react";
import { BriefUploadDialog } from "./BriefUploadDialog";

interface BriefInterpreterProps {
  onPromptGenerated: (prompt: string) => void;
}

interface GeneratePromptFromBriefRequest {
  brief: string;
  model: string;
}

export function BriefInterpreter({ onPromptGenerated }: BriefInterpreterProps) {
  const [briefContent, setBriefContent] = useState<string>("");
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Mutation for generating prompt from brief
  const generatePromptMutation = useMutation({
    mutationFn: async (data: GeneratePromptFromBriefRequest) => {
      const response = await apiRequest("POST", "/api/interpret-brief", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.prompt) {
        setGeneratedPrompt(data.prompt);
        toast({
          title: "Prompt generated",
          description: "Your creative brief has been interpreted into an image prompt.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to generate prompt from brief.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error("Error generating prompt:", error);
      toast({
        title: "Error",
        description: "Failed to generate prompt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBriefProcessed = (content: string) => {
    setBriefContent(content);
  };

  const handleGeneratePrompt = () => {
    if (!briefContent.trim()) {
      toast({
        title: "Empty brief",
        description: "Please upload a creative brief document first.",
        variant: "destructive",
      });
      return;
    }

    generatePromptMutation.mutate({
      brief: briefContent,
      model: "gpt-4o",
    });
  };

  const handleUsePrompt = () => {
    if (generatedPrompt) {
      onPromptGenerated(generatedPrompt);
      toast({
        title: "Prompt applied",
        description: "The interpreted prompt has been applied to the image generator.",
      });
    }
  };

  const copyToClipboard = () => {
    if (generatedPrompt) {
      navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied to clipboard",
        description: "The prompt has been copied to your clipboard.",
      });
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageTransition}
    >
      <Card className="p-4 shadow-md">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Creative Brief Interpreter</h3>
            <Button 
              variant="outline"
              onClick={() => setIsUploadDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <FileUp className="h-4 w-4" />
              Upload Brief
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="brief-content">Creative Brief Content</Label>
              <Textarea
                id="brief-content"
                value={briefContent}
                onChange={(e) => setBriefContent(e.target.value)}
                placeholder="Your uploaded brief content will appear here..."
                className="min-h-[150px] mt-2 resize-y font-mono text-sm"
                readOnly
              />
            </div>

            <Button
              onClick={handleGeneratePrompt}
              disabled={!briefContent.trim() || generatePromptMutation.isPending}
              className="w-full bg-[#F15A22] hover:bg-[#e04d15]"
            >
              {generatePromptMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Interpreting Brief...
                </>
              ) : (
                <>
                  <Clipboard className="mr-2 h-4 w-4" />
                  Generate Image Prompt
                </>
              )}
            </Button>
          </div>

          {generatedPrompt && (
            <div className="space-y-4 pt-4 border-t mt-4">
              <div>
                <Label htmlFor="generated-prompt">Generated Image Prompt</Label>
                <div className="relative mt-2">
                  <Textarea
                    id="generated-prompt"
                    value={generatedPrompt}
                    className="min-h-[120px] pr-10 resize-y bg-gray-50"
                    readOnly
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={copyToClipboard}
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleUsePrompt}
                className="w-full bg-[#F15A22] hover:bg-[#e04d15]"
              >
                Use This Prompt
              </Button>
            </div>
          )}
        </div>
      </Card>

      <BriefUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onBriefProcessed={handleBriefProcessed}
      />
    </motion.div>
  );
}