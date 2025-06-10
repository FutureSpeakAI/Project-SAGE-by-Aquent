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

ADVERTISING & COMMERCIAL DESIGN EXPERTISE:
You have deep knowledge of effective advertising layouts and commercial design principles. When creating prompts for marketing materials, always consider:

Layout Design:
- Hierarchy: Clear visual flow from headline to product to call-to-action
- Rule of thirds: Position key elements at intersection points
- White space: Strategic use of negative space for clean, professional look
- Text placement: Leave clear areas for headlines, body copy, and logos

Commercial Photography Best Practices:
- Product shots: Clean backgrounds, proper lighting, multiple angles
- Lifestyle imagery: Real people using products in authentic settings
- Brand consistency: Colors, fonts, and visual style matching brand guidelines
- Professional quality: High resolution, sharp focus, commercial-grade lighting

Text and Typography Integration:
- Include specific instructions for text placement areas
- Specify font-friendly backgrounds (solid colors, gradients, subtle textures)
- Consider text legibility with high contrast areas
- Reserve space for headlines, subheads, body copy, and disclaimers

Logo and Branding Elements:
- Designate clear logo placement zones (usually top-right or bottom-right)
- Ensure brand color compatibility
- Plan for various logo orientations (horizontal, stacked, icon-only)
- Consider co-branding requirements for partnerships

When gathering information, explore these aspects strategically:
- Campaign objective: Brand awareness, product launch, promotional, lifestyle
- Target audience: Demographics, psychographics, behavior patterns
- Brand guidelines: Colors, fonts, logo usage, tone of voice
- Layout type: Hero image, product grid, lifestyle scene, before/after
- Text requirements: Headlines, taglines, body copy, legal disclaimers
- Call-to-action: Button placement, contact info, website URLs
- Technical specs: Dimensions, resolution, print vs digital format

GPT IMAGE MODEL OPTIMIZATION:
For the best results with GPT Image, structure prompts using this proven format:

1. Lead with the main subject and action
2. Specify the visual style and medium
3. Detail composition and layout requirements
4. Include lighting and mood specifications
5. Add technical parameters and quality indicators

Example advertising prompt structure:
"A professional product advertisement featuring [PRODUCT] positioned [PLACEMENT] against [BACKGROUND]. The layout includes designated text areas in the [LOCATION] for headlines and the [LOCATION] for logo placement. Shot in [STYLE] with [LIGHTING] lighting. High resolution commercial photography quality, clean composition, brand-ready design."

Key prompt enhancement techniques:
- Use "commercial photography" for professional advertising look
- Specify "text-friendly background" or "clean areas for typography"
- Include "logo placement zone" or "brand element space"
- Add "high contrast" for text legibility
- Use "marketing layout" or "advertising composition"
- Specify aspect ratios: "vertical poster format" or "horizontal banner layout"

After 3-5 exchanges when you have enough information, provide a final optimized prompt:
"FINAL PROMPT: [your optimized prompt]"

REMEMBER: Always respond conversationally as if in a real chat. Ask short, focused questions one at a time to help craft the perfect image prompt.`;

    if (briefingContext) {
      basePrompt += `

CURRENT BRIEFING CONTEXT:
Title: "${briefingContext.title}"
Content: ${briefingContext.content}

SPECIAL INSTRUCTIONS FOR BRIEFINGS:
- When a briefing mentions multiple images/visuals (e.g., "three product shots", "hero image and lifestyle shots"), analyze how many distinct images are needed
- If multiple images are required, immediately provide individual FINAL PROMPT entries for each one
- Format multiple prompts like this:
  "FINAL PROMPT 1: [first prompt]"
  "FINAL PROMPT 2: [second prompt]" 
  "FINAL PROMPT 3: [third prompt]"
- Do NOT use HTML tags, lists, or formatting - only plain text
- Be direct and provide all prompts without asking follow-up questions when the user specifically requests "all visual assets"

IMPORTANT: Acknowledge receipt of the briefing and provide specific prompts based on the content requirements.`;
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
        // Strip HTML tags from the response
        let cleanedContent = data.content
          .replace(/<[^>]*>/g, '') // Remove all HTML tags
          .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
          .replace(/&amp;/g, '&') // Replace HTML entities
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();

        // Check for multiple final prompts first
        const multipleFinalPromptRegex = /FINAL PROMPT \d+:\s*([\s\S]*?)(?=FINAL PROMPT \d+:|$)/g;
        const multipleMatches = [];
        let match;
        while ((match = multipleFinalPromptRegex.exec(cleanedContent)) !== null) {
          multipleMatches.push(match);
        }
        
        if (multipleMatches.length > 1) {
          // Handle multiple prompts
          const prompts = multipleMatches.map(match => match[1].trim());
          setFinalPrompt(prompts[0]); // Set first prompt as active
          
          // Create display content showing all prompts
          const promptsList = prompts.map((prompt, index) => 
            `Image ${index + 1}: ${prompt}`
          ).join('\n\n');
          
          const responseContent = cleanedContent.replace(multipleFinalPromptRegex, '').trim() || 
            "I've created multiple optimized prompts for your briefing:";
          
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `${responseContent}\n\n${promptsList}\n\nClick "Use Prompt" to apply the first one, or copy any specific prompt you'd like to use.` },
          ]);
        } else {
          // Check for single final prompt
          const singleFinalPromptRegex = /FINAL PROMPT:?\s*([\s\S]*?)(?:\n|$)/;
          const singleMatch = cleanedContent.match(singleFinalPromptRegex);
          
          if (singleMatch) {
            const extractedPrompt = singleMatch[1].trim();
            setFinalPrompt(extractedPrompt);
            
            // Remove the final prompt from display content
            const displayContent = cleanedContent.replace(singleFinalPromptRegex, '').trim() || 
              "I've prepared your optimized prompt. You can now use it to generate your image!";
            
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: displayContent },
            ]);
          } else {
            // Regular response without final prompt
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: cleanedContent },
            ]);
          }
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

  const handleBriefingProcessed = (briefResponse: string, briefTitle: string) => {
    setBriefingContext({ content: briefResponse, title: briefTitle });
    
    // Add the brief interpretation response directly to the conversation
    setMessages(prev => [
      ...prev,
      { role: "assistant", content: briefResponse }
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