import { motion } from "framer-motion";
import { pageTransition } from "@/App";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichOutputPanel } from "@/components/OpenAI/RichOutputPanel";
import { SavedPersona } from "@/lib/types";
import { FileText, Loader2, Save, Send, Upload } from "lucide-react";

// Animation for chat messages
const messageAnimation = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface BriefingTabProps {
  apiKey: string;
  model: string;
  temperature: number;
  personas: SavedPersona[] | undefined;
  handleOpenPersonaLibrary: () => void;
  handleSaveBriefing: (title: string, content: string) => void;
  handleUploadDocument: () => void;
}

export function BriefingTab({
  apiKey,
  model,
  temperature,
  personas,
  handleOpenPersonaLibrary,
  handleSaveBriefing,
  handleUploadDocument
}: BriefingTabProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'You are a creative briefing expert who helps users develop comprehensive, actionable creative briefs for content creation. Your goal is to gather detailed information about their project by asking ONE specific question at a time. Be conversational, friendly, and professional. Ask in-depth questions that will uncover critical details needed for content creation. Cover these areas thoroughly through your questioning: project type and scope, business objectives, target audience specifics, key messages, deliverable specifications (format, length, tone, style), brand guidelines, technical requirements, timeline, and success metrics. Focus each question on extracting actionable, specific information that will directly help content creators understand exactly what to create.'
    },
    {
      role: 'assistant',
      content: 'Hello! I\'m here to help you create a detailed creative brief that will guide content creation. To start, what specific type of content or marketing project are you planning to develop?'
    }
  ]);
  
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [briefingContent, setBriefingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  const sendMessage = async () => {
    if (!userInput.trim() || !apiKey) return;
    
    const newMessage: Message = {
      role: 'user',
      content: userInput
    };
    
    // Add user message to chat
    setMessages(prev => [...prev, newMessage]);
    setUserInput("");
    setIsLoading(true);
    setError(null);
    
    try {
      // Send request to OpenAI
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          model,
          systemPrompt: messages[0].content,
          userPrompt: [...messages.slice(1), newMessage]
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n\n'),
          temperature
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate response');
      }
      
      const data = await response.json();
      
      // Add assistant response to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content
      }]);
      
      // No longer auto-generating briefing, now only happens when button is clicked
      // Removed auto-generation code that was here previously
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const generateBriefing = async () => {
    if (!apiKey) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Send request to create a structured briefing from the conversation
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          model,
          systemPrompt: "Based on the conversation, create a comprehensive creative briefing document that will serve as a detailed guide for content creators. Include these sections:\n\n1. Project Overview (detailed project description, context, and background)\n2. Objectives (specific, measurable goals of the project)\n3. Target Audience (detailed persona descriptions including demographics, pain points, and motivations)\n4. Key Messages (primary communication points and value propositions)\n5. Deliverables (detailed specifications for each deliverable including format, length, tone, style, and technical requirements)\n6. Content Creation Guidelines (specific instructions on voice, tone, specific terminology to use or avoid)\n7. Timeline (comprehensive schedule with milestones and deadlines)\n8. Success Metrics (how the content's performance will be measured)\n\nPay special attention to the Deliverables and Content Creation Guidelines sections - these should contain extremely specific instructions that would allow someone to immediately start creating the required content.\n\nUSE HTML FORMATTING for rich text output with these guidelines:\n1. Use <h1>, <h2>, <h3> tags for headings\n2. Use <ul> and <li> for bullet points\n3. Use <ol> and <li> for numbered steps\n4. Use <p> for paragraphs\n5. Use <strong> for emphasis\n6. Use <hr> for section dividers\n7. Use <blockquote> for highlighted information\n\nMake the document visually organized, professional, and comprehensive. The HTML will be rendered directly in a rich text editor.",
          userPrompt: messages
            .map(msg => `${msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System'}: ${msg.content}`)
            .join('\n\n'),
          temperature: 0.7, // Slightly more creative for the final document
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate briefing');
      }
      
      const data = await response.json();
      setBriefingContent(data.content);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageTransition}
      className="w-full relative overflow-hidden"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left side (chat interface) */}
        <div className="w-full lg:w-1/2 flex flex-col">
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-medium">Chat with AI Assistant</h3>
            <Button 
              variant="outline"
              onClick={handleUploadDocument}
              className="bg-white text-[#F15A22] hover:bg-[#F15A22] hover:text-white border-[#F15A22]"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
          
          <Card className="flex-grow">
            <CardContent className="p-4">
              <div 
                ref={chatContainerRef}
                className="h-[500px] overflow-y-auto flex flex-col space-y-4 mb-4"
              >
                {messages.slice(1).map((message, index) => (
                  <motion.div
                    key={index}
                    variants={messageAnimation}
                    initial="initial"
                    animate="animate"
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-[#F15A22] text-white rounded-tr-none' 
                          : 'bg-gray-200 text-gray-800 rounded-tl-none'
                      }`}
                    >
                      {message.content}
                    </div>
                  </motion.div>
                ))}
                
                {isLoading && !briefingContent && (
                  <motion.div
                    variants={messageAnimation}
                    initial="initial"
                    animate="animate"
                    className="flex justify-start"
                  >
                    <div className="max-w-[80%] p-3 rounded-lg bg-gray-200 text-gray-800 rounded-tl-none flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Thinking...
                    </div>
                  </motion.div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={isLoading}
                  className="flex-grow"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={isLoading || !userInput.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
                
                <Button 
                  onClick={generateBriefing}
                  variant="outline"
                  disabled={isLoading}
                  className="bg-white text-[#F15A22] hover:bg-[#F15A22] hover:text-white border-[#F15A22]"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Brief
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right side (briefing output) */}
        <div className="w-full lg:w-1/2">
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-medium">Generated Content</h3>
            <Button 
              variant="outline"
              onClick={() => {
                // Extract a title from the briefing content if possible
                let title = 'Creative Brief';
                if (briefingContent) {
                  // Try to extract the first h1 or h2 tag content as the title
                  const titleMatch = briefingContent.match(/<h1[^>]*>(.*?)<\/h1>|<h2[^>]*>(.*?)<\/h2>/i);
                  if (titleMatch) {
                    title = titleMatch[1] || titleMatch[2] || title;
                  }
                }
                handleSaveBriefing(title, briefingContent);
              }}
              disabled={!briefingContent}
              className="bg-white text-[#F15A22] hover:bg-[#F15A22] hover:text-white border-[#F15A22]"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Briefing
            </Button>
          </div>
          
          <RichOutputPanel
            content={briefingContent}
            isLoading={isLoading && !messages.some(m => m.role === 'assistant')}
            error={error}
            onClear={() => setBriefingContent("")}
            onRetry={generateBriefing}
            model={model}
            temperature={temperature}
            onOpenPersonaLibrary={handleOpenPersonaLibrary}
            personas={personas}
          />
        </div>
      </div>
    </motion.div>
  );
}