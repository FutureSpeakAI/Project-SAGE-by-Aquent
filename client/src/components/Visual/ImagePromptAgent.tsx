import { useState, useEffect } from "react";
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
  FileUp,
  FileText,
} from "lucide-react";
import { SageLogo } from "@/components/ui/SageLogo";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { BriefInterpreter } from "./BriefInterpreter/BriefInterpreter";
import { VoiceControls } from "@/components/ui/VoiceControls";

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
  onApplyPrompt: (prompt: string) => void;
  onSwitchToConversation?: () => void;
}

export function ImagePromptAgent({ onApplyPrompt, onSwitchToConversation }: ImagePromptAgentProps) {
  // Initialize messages from localStorage or default
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const savedMessages = localStorage.getItem('sage-visual-conversation');
      if (savedMessages) {
        return JSON.parse(savedMessages);
      }
    } catch (error) {
      console.warn('Failed to load saved conversation:', error);
    }
    return [
      {
        role: "assistant",
        content: "Hello! I'm SAGE, your strategic marketing collaborator with voice processing capabilities. I can help you craft optimized prompts for image generation that align with your project goals. I have access to our previous conversations and can guide you through the visual creation process. What kind of visual content are you looking to create?",
      },
    ];
  });
  
  const [currentMessage, setCurrentMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [finalPrompt, setFinalPrompt] = useState("");
  const [activeTab, setActiveTab] = useState("conversation");
  const [briefingContext, setBriefingContext] = useState<{content: string, title: string} | null>(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('sage-visual-conversation', JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to save conversation:', error);
    }
  }, [messages]);
  
  const { toast } = useToast();

  // Enhanced system prompt with briefing awareness
  const getSystemPrompt = () => {
    let basePrompt = `You are SAGE (Strategic Adaptive Generative Engine), a British marketing specialist with 20 years of experience from London. You use she/her pronouns and maintain memory across all application modules and can reference previous conversations. You have voice input processing capabilities and can guide users through the app interface. You are having a CONVERSATIONAL DIALOGUE with users to craft effective prompts for the GPT Image model.

IMPORTANT GUIDELINES:
1. BE CONVERSATIONAL - this is a BACK-AND-FORTH dialogue, not an article or essay.
2. KEEP RESPONSES SHORT - just 1-3 sentences per response, never write paragraphs.
3. ASK ONE SPECIFIC QUESTION at a time about what the user wants in their image.
4. BUILD THE PROMPT ITERATIVELY through conversation - don't try to create it all at once.
5. NEVER SEND EDUCATIONAL CONTENT about how to create images - stay focused on the user's specific request.
6. NEVER USE HTML TAGS, MARKDOWN HEADERS, or formatting - just plain text conversation.
7. NEVER SIMULATE OR PREDICT USER RESPONSES - only respond to actual user input.

CONVERSATION FORMAT:
- You'll receive input in XML format: <USER INPUT>user message</USER INPUT>
- Provide your response in plain text (don't include <ASSISTANT RESPONSE> tags in your output)
- DO NOT MAKE UP NEW USER INPUTS - only respond to the actual input provided

When gathering information, explore these aspects one by one:
- Subject: Main focus of the image
- Setting/Background: Where the subject is located
- Lighting: Type of lighting (natural, studio, dramatic, etc.)
- Style: Photorealistic, illustration, 3D render, etc.
- Composition: How elements are arranged
- Color palette: Dominant colors or mood

After 3-5 exchanges when you have enough information, provide a final optimized prompt:
"FINAL PROMPT: [your optimized prompt]"

REMEMBER: Always respond conversationally as if in a real chat. Ask short, focused questions one at a time to help craft the perfect image prompt.`;

    if (briefingContext) {
      basePrompt += `

CURRENT BRIEFING CONTEXT:
Title: "${briefingContext.title}"
Content: ${briefingContext.content}

IMPORTANT: You have just received this briefing. Acknowledge its receipt and offer specific visual prompt suggestions based on its content. Focus on translating the briefing requirements into actionable image generation prompts.`;
    }

    return basePrompt;
  };

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

    // Build context from all previous messages with clear separation 
    // and use a special format that's less likely to be simulated by the model
    const conversationContext = messages
      .map((msg) => {
        const prefix = msg.role === "user" ? "USER INPUT" : "ASSISTANT RESPONSE";
        return `<${prefix}>\n${msg.content}\n</${prefix}>`;
      })
      .join("\n\n");

    // Generate response based on the conversation context with clear formatting 
    // to prevent the model from simulating user responses
    const userPromptWithContext = `${conversationContext}\n\n<USER INPUT>\n${currentMessage}\n</USER INPUT>\n\n<ASSISTANT RESPONSE>`;
    

    generateContentMutation.mutate({
      model: "gpt-4o",
      systemPrompt: getSystemPrompt(),
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
      onApplyPrompt(finalPrompt);
      toast({
        title: "Prompt applied",
        description: "The optimized prompt has been applied to the image generator.",
      });
    }
  };

  const handleBriefingProcessed = (briefContent: string, briefTitle: string) => {
    setBriefingContext({ content: briefContent, title: briefTitle });
    
    // Add a message to the conversation acknowledging the briefing
    const acknowledgmentMessage = `I've received your briefing "${briefTitle}". Let me analyze it and suggest specific visual elements we can create for this project. What type of visual content would you like to start with?`;
    
    setMessages(prev => [
      ...prev,
      { role: "assistant", content: acknowledgmentMessage }
    ]);
    
    // Switch to conversation tab
    setActiveTab("conversation");
  };

  const handleStartOver = () => {
    const defaultMessage = {
      role: "assistant" as const,
      content: "Hello! I'm SAGE, your strategic marketing collaborator with voice processing capabilities. I can help you craft optimized prompts for image generation that align with your project goals. I have access to our previous conversations and can guide you through the visual creation process. What kind of visual content are you looking to create?",
    };
    
    setMessages([defaultMessage]);
    setFinalPrompt("");
    setBriefingContext(null);
    
    // Clear localStorage
    try {
      localStorage.removeItem('sage-visual-conversation');
    } catch (error) {
      console.warn('Failed to clear conversation history:', error);
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
      <div className="grid grid-cols-1 gap-6">
        <Card className="p-4 shadow-md">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 grid grid-cols-2">
              <TabsTrigger value="conversation" className="flex items-center">
                <SageLogo size={16} className="mr-2" />
                Conversation
              </TabsTrigger>
              <TabsTrigger value="brief" className="flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                Brief Interpreter
              </TabsTrigger>
            </TabsList>
          
            {/* Conversation Tab Content */}
            <TabsContent value="conversation" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <SageLogo size={20} className="mr-2" />
                  <span className="font-medium">Conversation Assistant</span>
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
                  className="pr-24"
                  disabled={isTyping || generateContentMutation.isPending}
                />
                <div className="absolute right-1 top-1 flex items-center gap-1">
                  <VoiceControls
                    onTranscript={(text, isVoiceInitiated) => {
                      console.log('Voice transcript received in visual:', text);
                      const newMessage = currentMessage + text;
                      console.log('New visual message:', newMessage);
                      setCurrentMessage(newMessage);
                      
                      // Auto-send immediately using the combined message
                      if (newMessage.trim()) {
                        console.log('Auto-sending visual voice message...');
                        const newUserMessage: Message = {
                          role: "user",
                          content: newMessage,
                        };
                        
                        setMessages(prev => [...prev, newUserMessage]);
                        setCurrentMessage("");
                        setIsTyping(true);
                        
                        generateContentMutation.mutate({
                          model: "gpt-4o",
                          systemPrompt: getSystemPrompt(),
                          userPrompt: newMessage,
                          temperature: 0.7,
                        });
                      }
                    }}
                    lastMessage={messages.length > 0 && messages[messages.length - 1].role === 'assistant' 
                      ? messages[messages.length - 1].content 
                      : undefined}
                    isVoiceInitiated={false}
                  />
                  <Button
                    size="icon"
                    className="bg-[#F15A22] hover:bg-[#e04d15] text-white h-8 w-8"
                    onClick={handleSendMessage}
                    disabled={!currentMessage.trim() || isTyping || generateContentMutation.isPending}
                  >
                    <SendHorizontal className="h-4 w-4" />
                  </Button>
                </div>
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
            </TabsContent>
            
            {/* Brief Interpreter Tab Content */}
            <TabsContent value="brief">
              <BriefInterpreter 
                onPromptGenerated={onApplyPrompt} 
                onSwitchToConversation={() => {
                  setActiveTab("conversation");
                  if (onSwitchToConversation) {
                    onSwitchToConversation();
                  }
                }}
                onBriefingProcessed={handleBriefingProcessed}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </motion.div>
  );
}