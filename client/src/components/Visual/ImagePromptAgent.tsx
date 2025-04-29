import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { pageTransition } from "@/App";
import {
  Loader2,
  SendHorizontal,
  Bot,
  Upload,
  Image as ImageIcon,
  Rewind,
  Download,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface GenerateContentRequest {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
}

interface ImagePromptAgentProps {
  onPromptReady: (prompt: string) => void;
}

export function ImagePromptAgent({ onPromptReady }: ImagePromptAgentProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your Image Generation Assistant. I'll help you craft the perfect prompt for generating images with the GPT Image model. What kind of image would you like to create today?",
    },
  ]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [finalPrompt, setFinalPrompt] = useState("");
  
  const { toast } = useToast();

  // System prompt based on the best practices guide
  const systemPrompt = `You are an AI Image Generation Prompt Expert specializing in helping users create effective prompts for the GPT Image model. Your goal is to help users craft detailed, specific prompts that will produce high-quality images.

IMPORTANT GUIDELINES:
1. Focus on getting specific details from the user about what they want in their image.
2. Ask questions one at a time to keep the conversation natural and focused.
3. Consider the following aspects when crafting prompts:
   - Subject: Main focus of the image
   - Setting/Background: Where the subject is located
   - Lighting: Type of lighting (natural, studio, dramatic, etc.)
   - Style: Photorealistic, illustration, 3D render, etc.
   - Composition: How elements are arranged
   - Color palette: Dominant colors or mood
   - Perspective: Camera angle or viewpoint
4. Suggest improvements to make prompts more effective.
5. When the user is satisfied, provide a final optimized prompt that follows these rules:
   - Start with the image type (photo, illustration, 3D render, etc.)
   - Include specific details about the subject and setting
   - Specify lighting conditions and atmosphere
   - Mention composition and perspective
   - Add styling cues (cinematic, professional, etc.)
   - Format the final prompt as: "FINAL PROMPT: [your optimized prompt]"

Your goal is to create prompts that are specific enough to get the desired results while leveraging the GPT Image model's capabilities for high-quality, detailed image generation. Always aim to be helpful and informative about best practices.`;

  // Mutation for generating content
  const generateContentMutation = useMutation({
    mutationFn: async (data: GenerateContentRequest) => {
      const response = await apiRequest("POST", "/api/generate-content", data);
      return response.json();
    },
    onSuccess: (data) => {
      // Extract the response
      if (data.content) {
        // Check if the response contains a final prompt using indexOf and substring
        const finalPromptPrefix = "FINAL PROMPT:";
        const finalPromptIndex = data.content.indexOf(finalPromptPrefix);
        
        if (finalPromptIndex !== -1) {
          // Find the end of the final prompt (newline or end of string)
          let endIndex = data.content.indexOf("\n", finalPromptIndex);
          if (endIndex === -1) {
            endIndex = data.content.length;
          }
          
          // Extract the prompt text
          const startIndex = finalPromptIndex + finalPromptPrefix.length;
          const extractedPrompt = data.content.substring(startIndex, endIndex).trim();
          setFinalPrompt(extractedPrompt);
          
          // Create cleaned content by replacing the final prompt text
          const beforePrompt = data.content.substring(0, finalPromptIndex);
          const afterPrompt = data.content.substring(endIndex);
          const cleanedContent = beforePrompt + 
            "I've prepared your optimized prompt. You can now use it to generate your image!" + 
            afterPrompt;
          
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: cleanedContent },
          ]);
        } else {
          // Regular response without final prompt
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.content },
          ]);
        }
        
        setIsTyping(false);
      }
    },
    onError: (error) => {
      console.error("Error generating content:", error);
      toast({
        title: "Error",
        description: "Failed to generate response. Please try again.",
        variant: "destructive",
      });
      setIsTyping(false);
    },
  });

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    // Add user message to the chat
    const userMessage = { role: "user" as const, content: currentMessage };
    setMessages((prev) => [...prev, userMessage]);
    setCurrentMessage("");
    setIsTyping(true);

    // Build context from all previous messages
    const conversationContext = messages
      .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n\n");

    // Generate response based on the conversation context
    const userPromptWithContext = `${conversationContext}\n\nUser: ${currentMessage}\n\nAssistant:`;

    generateContentMutation.mutate({
      model: "gpt-4o",
      systemPrompt,
      userPrompt: userPromptWithContext,
      temperature: 0.7,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleUsePrompt = () => {
    if (finalPrompt) {
      onPromptReady(finalPrompt);
      toast({
        title: "Prompt applied",
        description: "The optimized prompt has been applied to the image generator.",
      });
    }
  };

  const handleStartOver = () => {
    setMessages([
      {
        role: "assistant",
        content: "Let's start over. What kind of image would you like to create today?",
      },
    ]);
    setFinalPrompt("");
  };

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageTransition}
    >
      <div className="grid grid-cols-1 gap-6">
        <Card className="p-4 shadow-md flex flex-col overflow-hidden">
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center">
              <Bot className="h-5 w-5 mr-2 text-[#F15A22]" />
              <span className="font-medium">Image Prompt Assistant</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartOver}
              className="text-gray-500"
            >
              <Rewind className="h-4 w-4 mr-1" />
              Start Over
            </Button>
          </div>



          {/* Chat messages */}
          <div className="flex-grow overflow-y-auto mb-4 max-h-[400px] min-h-[300px] border rounded-md">
            <div className="p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-lg ${
                      message.role === "user"
                        ? "bg-[#F15A22] text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] px-4 py-2 rounded-lg bg-gray-100 text-gray-800">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input area */}
          <div className="relative">
            <Input
              placeholder="Type your message..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-16"
              disabled={isTyping || generateContentMutation.isPending}
            />
            <Button
              size="icon"
              className="absolute right-1 top-1 bg-[#F15A22] hover:bg-[#e04d15] text-white h-8 w-8"
              onClick={handleSendMessage}
              disabled={!currentMessage.trim() || isTyping || generateContentMutation.isPending}
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Final prompt section */}
          {finalPrompt && (
            <div className="mt-4 border-t pt-4">
              <div className="font-medium mb-2 flex items-center">
                <ImageIcon className="h-4 w-4 mr-2 text-[#F15A22]" />
                Optimized Prompt:
              </div>
              <div className="relative">
                <Textarea
                  value={finalPrompt}
                  readOnly
                  className="min-h-[80px] resize-none bg-gray-50"
                />
                <div className="absolute right-2 top-2 flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full"
                    onClick={() => {
                      navigator.clipboard.writeText(finalPrompt);
                      toast({ title: "Copied to clipboard" });
                    }}
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                className="w-full mt-2 bg-[#F15A22] hover:bg-[#e04d15]"
                onClick={handleUsePrompt}
              >
                Use This Prompt
              </Button>
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
}