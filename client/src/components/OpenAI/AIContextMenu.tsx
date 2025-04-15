import { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Expand, Minimize, Zap, FileEdit } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { GenerateRequest, GenerateResponse } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface AIContextMenuProps {
  children: React.ReactNode;
  selectedText: string;
  onProcessText: (text: string, replaceSelection: boolean) => void;
  apiKey: string;
  model: string;
  temperature: number;
}

export function AIContextMenu({
  children,
  selectedText,
  onProcessText,
  apiKey,
  model,
  temperature,
}: AIContextMenuProps) {
  const [customInstructionsOpen, setCustomInstructionsOpen] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async (data: GenerateRequest) => {
      const response = await apiRequest("POST", "/api/generate", data);
      return response.json() as Promise<GenerateResponse>;
    },
    onSuccess: (data) => {
      onProcessText(data.content, true);
    },
    onError: (error: Error) => {
      toast({
        title: "AI processing failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const processWithAI = (instruction: string, replaceSelection = true) => {
    if (!selectedText) {
      toast({
        title: "No text selected",
        description: "Please select text to process.",
        variant: "destructive",
      });
      return;
    }

    const systemPrompt = `You are an expert editor and writer. Your task is to ${instruction} the following text. 
    Only return the processed text without any additional comments or explanations.`;

    generateMutation.mutate({
      apiKey,
      model,
      systemPrompt,
      userPrompt: selectedText,
      temperature,
    });
  };

  const handleCustomInstructions = () => {
    if (!customInstructions.trim()) {
      toast({
        title: "Instructions required",
        description: "Please enter custom instructions.",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedText) {
      toast({
        title: "No text selected",
        description: "Please select text to process.",
        variant: "destructive",
      });
      return;
    }

    const systemPrompt = `You are an expert editor and writer. Your task is to ${customInstructions.trim()} for the following text.
    Only return the processed text without any additional comments or explanations.`;

    console.log("Sending custom instructions:", customInstructions);
    console.log("System prompt:", systemPrompt);
    
    generateMutation.mutate({
      apiKey,
      model,
      systemPrompt,
      userPrompt: selectedText,
      temperature,
    });

    setCustomInstructionsOpen(false);
    setCustomInstructions("");
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem
            onClick={() => processWithAI("revise and improve", true)}
            disabled={!selectedText || generateMutation.isPending}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            AI Revise
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => processWithAI("improve the clarity, flow, and grammar of", true)}
            disabled={!selectedText || generateMutation.isPending}
          >
            <Zap className="mr-2 h-4 w-4" />
            AI Improve
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => processWithAI("expand with more details and examples", true)}
            disabled={!selectedText || generateMutation.isPending}
          >
            <Expand className="mr-2 h-4 w-4" />
            AI Expand
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => processWithAI("summarize concisely while keeping the key points", true)}
            disabled={!selectedText || generateMutation.isPending}
          >
            <Minimize className="mr-2 h-4 w-4" />
            AI Summarize
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => setCustomInstructionsOpen(true)}
            disabled={!selectedText || generateMutation.isPending}
          >
            <FileEdit className="mr-2 h-4 w-4" />
            Custom AI Instructions
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={customInstructionsOpen} onOpenChange={setCustomInstructionsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Custom AI Instructions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <p className="text-sm text-gray-700 font-medium">
                What would you like the AI to do with your selected text?
              </p>
              <p className="text-sm text-gray-600">
                Enter instructions like "rewrite in the style of Shakespeare" or "convert to a bulleted list of key points"
              </p>
            </div>
            <Textarea
              placeholder="Enter instructions here... (e.g., translate to Spanish, convert to bullet points, make more formal, etc.)"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="bg-blue-50 p-2 rounded-md text-xs text-blue-700">
              <p className="font-medium">Tips:</p>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Be specific about the style, tone, or format you want</li>
                <li>For multiple instructions, separate with commas</li>
                <li>For best results, select text first before opening this dialog</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCustomInstructionsOpen(false)}
              disabled={generateMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleCustomInstructions} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? "Processing..." : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}