import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { pageTransition } from "@/App";
import {
  Send,
  ThumbsUp,
  ThumbsDown,
  Save,
  Download,
  Settings,
  MessageSquare,
  Bot,
  User,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContextControlPanel } from "./ContextControlPanel";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  feedback?: "positive" | "negative";
}

interface ContextSettings {
  selectedPersona?: number;
  selectedPrompts?: number[];
  selectedMemories?: number[];
  temperature: number;
  model: string;
  customInstructions?: string;
}

interface FreePromptSession {
  id?: number;
  sessionName: string;
  messages: Message[];
  contextSettings: ContextSettings;
}

export function FreePromptChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [sessionName, setSessionName] = useState("New Chat Session");
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [contextSettings, setContextSettings] = useState<ContextSettings>({
    temperature: 0.7,
    model: "gpt-4o",
    selectedPrompts: [],
    selectedMemories: []
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load saved sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/free-prompt-sessions"],
    staleTime: 5 * 60 * 1000,
  });

  // Generate AI response mutation
  const generateResponseMutation = useMutation({
    mutationFn: async (data: { 
      message: string; 
      context: ContextSettings; 
      conversationHistory: Message[] 
    }) => {
      const response = await apiRequest("POST", "/api/generate-enhanced-response", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.content) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.content,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    },
    onError: (error) => {
      console.error("Error generating response:", error);
      toast({
        title: "Error",
        description: "Failed to generate response. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save session mutation
  const saveSessionMutation = useMutation({
    mutationFn: async (sessionData: FreePromptSession) => {
      const response = await apiRequest("POST", "/api/free-prompt-sessions", sessionData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Session Saved",
        description: "Your chat session has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/free-prompt-sessions"] });
    },
    onError: (error) => {
      console.error("Error saving session:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setCurrentMessage("");

    // Generate AI response with context
    generateResponseMutation.mutate({
      message: currentMessage,
      context: contextSettings,
      conversationHistory: updatedMessages.slice(-10) // Last 10 messages for context
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFeedback = (messageIndex: number, feedback: "positive" | "negative") => {
    setMessages(prev => prev.map((msg, idx) => 
      idx === messageIndex ? { ...msg, feedback } : msg
    ));
    
    // Log feedback for learning
    toast({
      title: feedback === "positive" ? "Thanks for the feedback!" : "Feedback noted",
      description: "This helps improve future responses.",
    });
  };

  const handleSaveSession = () => {
    if (messages.length === 0) {
      toast({
        title: "Nothing to Save",
        description: "Start a conversation before saving the session.",
        variant: "destructive",
      });
      return;
    }

    saveSessionMutation.mutate({
      sessionName,
      messages,
      contextSettings
    });
  };

  const handleNewSession = () => {
    setMessages([]);
    setSessionName("New Chat Session");
    setCurrentMessage("");
  };

  const exportChatHistory = () => {
    const chatContent = messages.map(msg => 
      `${msg.role.toUpperCase()}: ${msg.content}`
    ).join('\n\n');
    
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionName.replace(/\s+/g, '_')}_chat.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      className="h-full flex"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageTransition}
    >
      {/* Context Control Panel */}
      {showContextPanel && (
        <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
          <ContextControlPanel 
            contextSettings={contextSettings}
            onContextChange={setContextSettings}
          />
        </div>
      )}

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-6 w-6 text-[#F15A22]" />
              <h1 className="text-xl font-semibold">Free Prompt Chat</h1>
              <Badge variant="secondary">Learning Mode</Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowContextPanel(!showContextPanel)}
              >
                <Settings className="h-4 w-4" />
                Context
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewSession}
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveSession}
                disabled={saveSessionMutation.isPending}
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={exportChatHistory}
                disabled={messages.length === 0}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bot className="mx-auto h-12 w-12 opacity-20 mb-4" />
              <h3 className="text-lg font-medium mb-2">Start a Conversation</h3>
              <p className="text-sm">Ask me anything! I'll use your selected context to provide personalized responses.</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] ${message.role === "user" ? "order-2" : "order-1"}`}>
                  <div className="flex items-start space-x-2">
                    <div className={`p-2 rounded-full ${
                      message.role === "user" 
                        ? "bg-[#F15A22] text-white" 
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {message.role === "user" ? 
                        <User className="h-4 w-4" /> : 
                        <Bot className="h-4 w-4" />
                      }
                    </div>
                    <div className="flex-1">
                      <Card className="p-4">
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        {message.role === "assistant" && (
                          <div className="flex items-center space-x-2 mt-3 pt-3 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFeedback(index, "positive")}
                              className={`${message.feedback === "positive" ? "text-green-600" : ""}`}
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFeedback(index, "negative")}
                              className={`${message.feedback === "negative" ? "text-red-600" : ""}`}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                            <span className="text-xs text-gray-400">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {generateResponseMutation.isPending && (
            <div className="flex justify-start">
              <div className="max-w-[80%]">
                <div className="flex items-start space-x-2">
                  <div className="p-2 rounded-full bg-gray-100 text-gray-600">
                    <Bot className="h-4 w-4" />
                  </div>
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-gray-500">Thinking...</span>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4 bg-white">
          <div className="flex space-x-2">
            <Input
              placeholder="Type your message..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={generateResponseMutation.isPending}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!currentMessage.trim() || generateResponseMutation.isPending}
              className="bg-[#F15A22] hover:bg-[#e04d15]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}