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
  const [savedSelectedText, setSavedSelectedText] = useState("");
  const [openedWithSelection, setOpenedWithSelection] = useState(false);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async (data: GenerateRequest) => {
      console.log("Sending AI processing request with:", {
        model: data.model,
        promptLength: data.userPrompt.length,
        systemPromptStart: data.systemPrompt.substring(0, 50) + "..."
      });
      const response = await apiRequest("POST", "/api/generate", data);
      return response.json() as Promise<GenerateResponse>;
    },
    onSuccess: (data) => {
      console.log("AI processing successful, response length:", data.content.length);
      // Always replace selection (true)
      onProcessText(data.content, true);
      // Reset the processing operation indicator
      setProcessingOperation(null);
    },
    onError: (error: Error) => {
      console.error("AI processing failed:", error);
      toast({
        title: "AI processing failed",
        description: error.message,
        variant: "destructive",
      });
      // Reset the processing operation indicator even on error
      setProcessingOperation(null);
    },
  });

  const processWithAI = (instruction: string) => {
    if (!selectedText) {
      toast({
        title: "No text selected",
        description: "Please select text to process.",
        variant: "destructive",
      });
      return;
    }

    // Create a more detailed system prompt that maintains the original format and scope
    const systemPrompt = `You are an expert editor and writer. Your task is to ${instruction} the following text.

    IMPORTANT RULES:
    1. Preserve the original format and length of the text
    2. If it's a title, keep it as a title (same approximate length)
    3. If it's a paragraph, keep it as a paragraph
    4. If it's a bullet point, keep it as a bullet point
    5. DO NOT expand a title or short text into a full article or list
    6. Do not add new sections or content beyond improving what exists
    7. Return ONLY the improved version of exactly what was provided
    
    Only return the processed text without any additional comments or explanations.`;

    // Log the selection characteristics to help with debugging
    console.log("Processing text:", {
      length: selectedText.length,
      isTitle: selectedText.length < 100,
      firstFewWords: selectedText.substring(0, 30) + "..."
    });

    // Always pass true to ensure selection replacement
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
    
    if (!savedSelectedText) {
      toast({
        title: "No text selected",
        description: "Please select text first before applying instructions.",
        variant: "destructive",
      });
      return;
    }

    console.log("Applying custom instructions to saved selected text:", savedSelectedText.substring(0, 50) + "...");
    
    const systemPrompt = `You are an expert editor and writer. Your task is to ${customInstructions.trim()} for the following text.

    IMPORTANT RULES:
    1. Preserve the original format of the text unless specifically instructed otherwise
    2. If it's a title, keep it as a title (same approximate length) unless instructed to expand
    3. If it's a paragraph, keep it as a paragraph unless instructed to change format
    4. If it's a bullet point, keep it as a bullet point unless instructed otherwise
    5. Do not add new sections or content beyond what was requested
    6. Return ONLY the processed text without any additional comments or explanations
    
    Only return the processed text without any additional comments or explanations.`;
    
    // Set the processing operation for display
    setProcessingOperation("Custom Instructions");
    
    generateMutation.mutate({
      apiKey,
      model,
      systemPrompt,
      userPrompt: savedSelectedText,
      temperature,
    });

    setCustomInstructionsOpen(false);
    setCustomInstructions("");
    setOpenedWithSelection(false);
  };

  // Track which operation is currently processing
  const [processingOperation, setProcessingOperation] = useState<string | null>(null);

  // Start processing with indicator
  const startProcessWithAI = (instruction: string, displayName: string) => {
    setProcessingOperation(displayName);
    processWithAI(instruction);
  };

  // Show a loading animation for the selected item
  const getContextMenuItemContent = (
    icon: React.ReactNode, 
    name: string, 
    isProcessing: boolean
  ) => {
    return (
      <>
        {isProcessing ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : (
          icon
        )}
        <span className={isProcessing ? "text-primary font-medium" : ""}>
          {isProcessing ? `Processing ${name}...` : name}
        </span>
      </>
    );
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-72">
          <ContextMenuSub>
            <ContextMenuSubTrigger
              disabled={!selectedText || generateMutation.isPending}
              className="flex items-center"
            >
              <Zap className="mr-2 h-4 w-4" />
              <span>Enhance (Same Length)</span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-60">
              <ContextMenuItem
                onClick={() => startProcessWithAI("revise and improve while maintaining similar length", "AI Revise")}
                disabled={generateMutation.isPending}
              >
                {getContextMenuItemContent(
                  <Wand2 className="mr-2 h-4 w-4" />, 
                  "Revise & Rewrite", 
                  processingOperation === "AI Revise" && generateMutation.isPending
                )}
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => startProcessWithAI("improve the clarity, flow, and grammar while maintaining similar length", "AI Improve")}
                disabled={generateMutation.isPending}
              >
                {getContextMenuItemContent(
                  <Zap className="mr-2 h-4 w-4" />, 
                  "Improve Style & Clarity", 
                  processingOperation === "AI Improve" && generateMutation.isPending
                )}
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSub>
            <ContextMenuSubTrigger
              disabled={!selectedText || generateMutation.isPending}
              className="flex items-center"
            >
              <FileEdit className="mr-2 h-4 w-4" />
              <span>Transform (Change Length)</span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-60">
              <ContextMenuItem
                onClick={() => startProcessWithAI("expand with more details and examples", "AI Expand")}
                disabled={generateMutation.isPending}
              >
                {getContextMenuItemContent(
                  <Expand className="mr-2 h-4 w-4" />, 
                  "Expand with Details", 
                  processingOperation === "AI Expand" && generateMutation.isPending
                )}
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => startProcessWithAI("summarize concisely while keeping the key points", "AI Summarize")}
                disabled={generateMutation.isPending}
              >
                {getContextMenuItemContent(
                  <Minimize className="mr-2 h-4 w-4" />, 
                  "Summarize Briefly", 
                  processingOperation === "AI Summarize" && generateMutation.isPending
                )}
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => {
              console.log("Opening custom instructions with selected text:", selectedText.length > 0 ? selectedText.substring(0, 50) + "..." : "none");
              setSavedSelectedText(selectedText);
              setOpenedWithSelection(true);
              setCustomInstructionsOpen(true);
            }}
            disabled={!selectedText || generateMutation.isPending}
          >
            <FileEdit className="mr-2 h-4 w-4" />
            Custom AI Instructions
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog 
        open={customInstructionsOpen} 
        onOpenChange={(open) => {
          setCustomInstructionsOpen(open);
          if (!open) {
            // Clear the form when closing the dialog without applying
            setCustomInstructions("");
          }
        }}>
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