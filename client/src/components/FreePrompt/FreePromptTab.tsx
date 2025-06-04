import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Brain, 
  Database, 
  Zap, 
  Settings, 
  Upload,
  FileText,
  Search,
  Lightbulb,
  Target,
  Globe,
  Compass,
  TrendingUp,
  Users,
  Palette,
  MessageSquare
} from "lucide-react";
import { SavedPersona } from "@/lib/types";

interface FreePromptTabProps {
  model: string;
  setModel: (model: string) => void;
  personas: SavedPersona[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    ragSources?: string[];
    n8nWorkflow?: string;
    contextUsed?: string[];
    researchType?: string;
  };
}

interface ResearchOption {
  id: string;
  title: string;
  description: string;
  icon: any;
  prompt: string;
}

interface AgentCapability {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
}

export function FreePromptTab({ model, setModel, personas }: FreePromptTabProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string>("default");
  const [temperature, setTemperature] = useState([0.7]);
  const [sessionName, setSessionName] = useState("New Conversation");
  const [showResearchOptions, setShowResearchOptions] = useState(false);
  const [activeResearchContext, setActiveResearchContext] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Research options for deep context building
  const researchOptions: ResearchOption[] = [
    {
      id: "competitor_analysis",
      title: "Competitor Analysis",
      description: "Research competitors, their strategies, and positioning",
      icon: Users,
      prompt: "Conduct a comprehensive competitor analysis for this industry/market. Research their messaging, positioning, pricing strategies, target audiences, content approaches, and recent campaigns. Identify gaps and opportunities."
    },
    {
      id: "market_research",
      title: "Market Research",
      description: "Analyze market trends, opportunities, and audience insights",
      icon: TrendingUp,
      prompt: "Perform deep market research including current trends, market size, growth opportunities, customer segments, pain points, and emerging patterns. Focus on actionable insights for strategy development."
    },
    {
      id: "brand_analysis",
      title: "Brand & Tone Research",
      description: "Study brand language, tone of voice, and messaging patterns",
      icon: MessageSquare,
      prompt: "Analyze brand voice and tone patterns across successful companies in this space. Research effective messaging frameworks, communication styles, brand personality traits, and language that resonates with target audiences."
    },
    {
      id: "design_trends",
      title: "Design & Visual Trends",
      description: "Research current design trends and visual strategies",
      icon: Palette,
      prompt: "Research current design trends, visual strategies, color psychology, typography trends, and aesthetic approaches that are performing well in this industry. Include emerging visual patterns and effective design frameworks."
    },
    {
      id: "campaign_research",
      title: "Campaign Analysis",
      description: "Study successful campaigns and creative strategies",
      icon: Target,
      prompt: "Research successful marketing campaigns in this space. Analyze their creative strategies, messaging approaches, channel mix, engagement tactics, and measurable outcomes. Identify patterns in high-performing campaigns."
    },
    {
      id: "product_research",
      title: "Product Research",
      description: "Deep dive into product positioning and features",
      icon: Compass,
      prompt: "Conduct comprehensive product research including feature analysis, positioning strategies, value propositions, user experience patterns, and product-market fit approaches. Focus on successful product launches and positioning."
    }
  ];

  // Agent capabilities that can be toggled on/off
  const [agentCapabilities, setAgentCapabilities] = useState<AgentCapability[]>([
    {
      id: "rag_search",
      name: "RAG Search",
      description: "Search knowledge base for relevant context",
      icon: Search,
      enabled: false // Will enable when Pinecone is configured
    },
    {
      id: "n8n_workflows",
      name: "N8N Workflows",
      description: "Trigger advanced reasoning workflows",
      icon: Zap,
      enabled: false // Will enable when N8N webhook is configured
    },
    {
      id: "context_memory",
      name: "Context Memory",
      description: "Remember and reference conversation history",
      icon: Brain,
      enabled: true
    },
    {
      id: "cross_module",
      name: "Cross-Module Learning",
      description: "Learn from other tab interactions",
      icon: Globe,
      enabled: true
    }
  ]);

  // Chat mutation for sending messages
  const chatMutation = useMutation({
    mutationFn: async (data: { message: string; context?: any }) => {
      // Use a simpler chat endpoint that's more reliable
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: data.message,
          model,
          temperature: temperature[0],
          systemPrompt: getSystemPrompt(),
          conversationHistory: messages.slice(-5) // Include recent context
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorData}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString() + '_assistant',
        role: 'assistant',
        content: data.content || data.text || 'No response received',
        timestamp: new Date(),
        context: {
          ragSources: [], // Will populate when RAG is active
          n8nWorkflow: undefined, // Will populate when N8N is active
          contextUsed: getActiveCapabilities()
        }
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    },
    onError: (error) => {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to get response from agent",
        variant: "destructive"
      });
      setIsTyping(false);
    }
  });

  const getSystemPrompt = () => {
    const selectedPersonaData = personas.find(p => p.id === selectedPersona);
    const basePrompt = selectedPersonaData?.description || "You are a helpful AI assistant.";
    
    const capabilities = getActiveCapabilities();
    let systemAddons = "";
    
    if (capabilities.includes("context_memory")) {
      systemAddons += "\n\nYou have access to conversation history and should reference previous context when relevant.";
    }
    
    if (capabilities.includes("cross_module")) {
      systemAddons += "\n\nYou can learn from user interactions across different application modules to provide more personalized assistance.";
    }

    return basePrompt + systemAddons;
  };

  const getActiveCapabilities = () => {
    return agentCapabilities.filter(cap => cap.enabled).map(cap => cap.name);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString() + '_user',
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    chatMutation.mutate({ 
      message: inputMessage,
      context: {
        capabilities: getActiveCapabilities(),
        persona: selectedPersona,
        sessionHistory: messages.slice(-5), // Last 5 messages for context
        researchContext: activeResearchContext
      }
    });
    
    setInputMessage("");
  };

  const handleResearchRequest = (researchOption: ResearchOption) => {
    // Store the research context for enhanced responses
    setActiveResearchContext(researchOption.prompt);
    
    // Show user they've activated research mode
    const contextMessage: ChatMessage = {
      id: Date.now().toString() + '_system',
      role: 'assistant',
      content: `${researchOption.title} mode activated. Tell me about your project, industry, or specific situation and I'll provide targeted ${researchOption.description.toLowerCase()}.`,
      timestamp: new Date(),
      context: {
        researchType: researchOption.title
      }
    };

    setMessages(prev => [...prev, contextMessage]);
    setShowResearchOptions(false);
    
    // Clear input and focus for user's project details
    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleCapability = (capabilityId: string) => {
    setAgentCapabilities(prev => 
      prev.map(cap => 
        cap.id === capabilityId 
          ? { ...cap, enabled: !cap.enabled }
          : cap
      )
    );
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col lg:flex-row h-full space-y-4 lg:space-y-0 lg:space-x-6">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-[#F15A22]" />
                Free Prompt Agent
              </CardTitle>
            </div>
            <Input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="text-sm bg-gray-50"
              placeholder="Name this conversation..."
            />
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages Area */}
            <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
              <div className="space-y-4 py-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">Welcome to Free Prompt Agent</p>
                    <p className="text-sm">
                      Start a conversation with your AI assistant. I can help with research, content creation, and cross-module learning.
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.role === 'user' 
                            ? 'bg-[#F15A22] text-white' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>
                        <div className={`p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-[#F15A22] text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {isTyping && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Research Options */}
            {showResearchOptions && (
              <div className="p-6 border-t bg-gray-50">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Deep Research Options</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowResearchOptions(false)}
                  >
                    ✕
                  </Button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {researchOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <Button
                        key={option.id}
                        variant="outline"
                        className="h-auto p-3 justify-start text-left"
                        onClick={() => handleResearchRequest(option)}
                        disabled={isTyping}
                      >
                        <div className="flex items-start gap-3 w-full">
                          <IconComponent className="h-5 w-5 text-[#F15A22] flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{option.title}</div>
                            <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {option.description}
                            </div>
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-6 border-t">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything... Use Shift+Enter for new lines"
                    className="min-h-[60px] resize-none"
                    disabled={isTyping}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowResearchOptions(!showResearchOptions)}
                      disabled={isTyping}
                      className="text-xs"
                    >
                      <Search className="h-3 w-3 mr-1" />
                      Deep Research
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  className="bg-[#F15A22] hover:bg-[#E14A1A] self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Context Control Panel */}
      <div className="w-full lg:w-80 space-y-4">
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Saved Conversations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-gray-500 text-center py-4">
                  No saved conversations yet. Start chatting to create your first conversation.
                </div>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Persona Selection */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Persona</Label>
                  <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Assistant</SelectItem>
                      {personas.map((persona) => (
                        <SelectItem key={persona.id} value={persona.id}>
                          {persona.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Model Selection */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Temperature */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Creativity: {temperature[0]}
                  </Label>
                  <Slider
                    value={temperature}
                    onValueChange={setTemperature}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="capabilities" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {agentCapabilities.map((capability) => {
                  const IconComponent = capability.icon;
                  return (
                    <div key={capability.id} className="flex items-center gap-3 p-2 rounded border">
                      <IconComponent className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium truncate">{capability.name}</h4>
                          <Switch
                            checked={capability.enabled}
                            onCheckedChange={() => toggleCapability(capability.id)}
                            disabled={capability.id === 'rag_search' || capability.id === 'n8n_workflows'}
                            className="flex-shrink-0"
                          />
                        </div>
                        <p className="text-xs text-gray-500 truncate">{capability.description}</p>
                        {(capability.id === 'rag_search' || capability.id === 'n8n_workflows') && (
                          <Badge variant="outline" className="text-xs mt-1">
                            Requires Setup
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Context Upload */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Context Upload
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start text-sm h-8" disabled>
                  <FileText className="h-4 w-4 mr-2" />
                  Upload Documents
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm h-8" disabled>
                  <Database className="h-4 w-4 mr-2" />
                  Connect Data Source
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}