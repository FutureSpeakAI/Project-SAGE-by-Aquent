import { motion } from "framer-motion";
import { pageTransition } from "@/App";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichOutputPanel } from "@/components/OpenAI/RichOutputPanel";
import { SavedPersona } from "@/lib/types";
import { FileText, Loader2, Save, Send, Upload, FormInput, MessageSquare } from "lucide-react";
import { BriefingForm } from "./BriefingForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceControls } from "@/components/ui/VoiceControls";

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
  model: string;
  temperature: number;
  personas: SavedPersona[] | undefined;
  handleOpenPersonaLibrary: () => void;
  handleSaveBriefing: (title: string, content: string) => void;
  handleUploadDocument: () => void;
}

// Helper function for properly formatting HTML lists
// This is moved outside the component to avoid TypeScript errors
const wrapListItems = (content: string): string => {
  let modified = content;
  // Find potential list items
  const listItemRegex = /<li>.*?<\/li>/g;
  const listItems = content.match(listItemRegex);
  
  if (listItems) {
    // Identify consecutive list items
    let consecutiveItems = '';
    let count = 0;
    
    for (let i = 0; i < listItems.length; i++) {
      if (i > 0 && content.indexOf(listItems[i]) - 
          (content.indexOf(listItems[i-1]) + listItems[i-1].length) < 10) {
        // These list items are consecutive or close
        if (count === 0) {
          consecutiveItems = listItems[i-1];
          count = 1;
        }
        consecutiveItems += listItems[i];
        count++;
      } else if (count > 0) {
        // We found the end of a sequence - wrap it
        if (count > 1) {
          // Determine if these were numbered items originally
          const originalContext = content.substring(
            Math.max(0, content.indexOf(consecutiveItems) - 20),
            content.indexOf(consecutiveItems)
          );
          
          const isNumbered = /\d+\.\s/.test(originalContext);
          const tagName = isNumbered ? 'ol' : 'ul';
          
          modified = modified.replace(consecutiveItems, 
            `<${tagName}>\n${consecutiveItems}\n</${tagName}>`);
        }
        consecutiveItems = '';
        count = 0;
      }
    }
    
    // Handle the last sequence if there is one
    if (count > 1) {
      const originalContext = content.substring(
        Math.max(0, content.indexOf(consecutiveItems) - 20),
        content.indexOf(consecutiveItems)
      );
      
      const isNumbered = /\d+\.\s/.test(originalContext);
      const tagName = isNumbered ? 'ol' : 'ul';
      
      modified = modified.replace(consecutiveItems, 
        `<${tagName}>\n${consecutiveItems}\n</${tagName}>`);
    }
  }
  
  return modified;
};

export function BriefingTab({
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
      content: 'You are SAGE (Strategic Adaptive Generative Engine), a marketing specialist with 20 years of experience from Boston. You help users develop comprehensive, actionable creative briefs for content creation. You maintain memory across all application modules and can reference previous conversations. Your goal is to gather detailed information about their project by asking ONE specific question at a time. Be conversational, friendly, and professional. Ask in-depth questions that will uncover critical details needed for content creation. Cover these areas thoroughly through your questioning: project type and scope, business objectives, target audience specifics, key messages, deliverable specifications (format, length, tone, style), brand guidelines, technical requirements, and timeline. DO NOT ask about metrics tracking or analytics of any kind. Focus each question on extracting actionable, specific information that will directly help content creators understand exactly what to create.'
    },
    {
      role: 'assistant',
      content: 'Hi! I\'m SAGE, your strategic marketing collaborator. I can help you develop a comprehensive creative brief that builds on any context from our previous work together. If you already have a brief you\'d like to upload, feel free to use the Upload button. Otherwise, I\'d recommend starting in the SAGE tab where we can conduct research and gather insights first. But if you\'re ready to dive into briefing development, what specific type of content or marketing project are you planning?'
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
    if (!userInput.trim()) return;
    
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
      
      // Clean the response content if needed
      let cleanedContent = data.content;
      // Remove starting ```html or ``` if present
      cleanedContent = cleanedContent.replace(/^```(?:html)?\s*\n?/i, '');
      // Remove ending ``` and any text after it if present
      cleanedContent = cleanedContent.replace(/```[\s\S]*$/i, '');
      
      // Fix improperly formatted lists - Convert plain bullet lists into HTML lists
      
      // Convert bullet points to list items
      cleanedContent = cleanedContent.replace(/\n\s*•\s*(.*?)(?=\n|$)/g, '\n<li>$1</li>');
      
      // Convert numbered points to list items (1. 2. 3. etc)
      cleanedContent = cleanedContent.replace(/\n\s*(\d+)\.\s*(.*?)(?=\n|$)/g, '\n<li>$2</li>');
     
      // Use the same helper function to wrap list items in proper list tags
      cleanedContent = wrapListItems(cleanedContent);
      
      // Add assistant response to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: cleanedContent
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
          model,
          systemPrompt: "Based on the conversation, create a comprehensive creative briefing document that will serve as a detailed guide for content creators. Important: The briefing you create will be used as a direct prompt for content generation, so write it in a way that clearly instructs a content creator what to make, not as a briefing report.\n\nInclude these sections:\n\n1. Project Overview (detailed project description, context, and background)\n2. Objectives (specific, measurable goals of the project)\n3. Target Audience (detailed persona descriptions including demographics, pain points, and motivations)\n4. Key Messages (primary communication points and value propositions)\n5. Deliverables (detailed specifications for each deliverable including format, length, tone, style, and technical requirements)\n6. Content Creation Guidelines (specific instructions on voice, tone, specific terminology to use or avoid)\n7. Timeline (comprehensive schedule with milestones and deadlines)\n\nCRITICAL - Your final section must be titled \"Content Creation Instructions\" and must contain SPECIFIC, DETAILED INSTRUCTIONS for the content creator. These instructions should be in an imperative voice (e.g., \"Create a blog post about...\", \"Write a social media caption that...\") rather than descriptive. This section must be actionable and clear so the content creator knows EXACTLY what to produce.\n\nUSE HTML FORMATTING for rich text output with these guidelines:\n1. Use <h1> for the main title and <h2> for section headings\n2. ALWAYS wrap bullet points in proper HTML: <ul><li>First point</li><li>Second point</li></ul>\n3. ALWAYS wrap numbered lists in proper HTML: <ol><li>First item</li><li>Second item</li></ol>\n4. Use <p> tags for ALL paragraphs with proper closing tags\n5. Use <strong> for emphasis\n6. Use <hr> for section dividers\n7. Use <blockquote> for highlighted information\n8. Maintain proper spacing between elements for readability\n9. Ensure proper nesting of HTML tags\n\nEXAMPLE OF CORRECT LIST FORMATTING:\n<ul>\n  <li>This is the first bullet point</li>\n  <li>This is the second bullet point</li>\n</ul>\n\nVERY IMPORTANT FORMATTING RULES:\n- DO NOT include any markdown code block markers like ```html, ```, or any variation\n- DO NOT add any concluding remarks, summary, or sign-off at the end of the document\n- DO NOT include any meta-commentary about the brief itself\n- ONLY include the HTML content with no markdown wrapper or commentary\n- END the document with the final HTML tag - don't add anything after it\n- DO NOT use plain text for lists - ALWAYS use proper <ul>/<li> or <ol>/<li> tags\n\nMake the document visually organized, professional, and comprehensive, with clear instruction-based language throughout. The HTML will be rendered directly in a rich text editor.",
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
      
      // Clean the content of any markdown code block markers and concluding commentary
      let cleanedContent = data.content;
      // Remove starting ```html or ``` if present
      cleanedContent = cleanedContent.replace(/^```(?:html)?\s*\n?/i, '');
      // Remove ending ``` and any text after it if present
      cleanedContent = cleanedContent.replace(/```[\s\S]*$/i, '');
      // Remove any final generic commentary about the brief (often added by AI models)
      cleanedContent = cleanedContent.replace(/\n+This comprehensive brief provides[\s\S]*$/i, '');
      
      // Fix improperly formatted lists - Convert plain bullet lists into HTML lists
      
      // Convert bullet points to list items
      cleanedContent = cleanedContent.replace(/\n\s*•\s*(.*?)(?=\n|$)/g, '\n<li>$1</li>');
      
      // Convert numbered points to list items (1. 2. 3. etc)
      cleanedContent = cleanedContent.replace(/\n\s*(\d+)\.\s*(.*?)(?=\n|$)/g, '\n<li>$2</li>');
     
      // Use our helper function to wrap list items properly
      cleanedContent = wrapListItems(cleanedContent);
      
      setBriefingContent(cleanedContent);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form-generated briefing
  const handleFormGeneratedBriefing = (content: string) => {
    setBriefingContent(content);
    setIsLoading(false); // Ensure loading state is turned off when form generation completes
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
        {/* Left side with input methods */}
        <div className="w-full lg:w-1/2 flex flex-col">
          <div className="flex justify-between mb-4 items-center">
            <Tabs defaultValue="chat" className="w-full">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="chat" className="flex items-center gap-1 flex-1">
                    <MessageSquare className="h-4 w-4" />
                    SAGE
                  </TabsTrigger>
                  <TabsTrigger value="form" className="flex items-center gap-1 flex-1">
                    <FormInput className="h-4 w-4" />
                    Form
                  </TabsTrigger>
                </TabsList>
                
                <Button 
                  variant="outline"
                  onClick={handleUploadDocument}
                  className="w-full sm:w-auto bg-white text-[#F15A22] hover:bg-[#F15A22] hover:text-white border-[#F15A22]"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Briefing
                </Button>
              </div>

              {/* Chat Interface */}
              <TabsContent value="chat" className="mt-0">
                <Card className="flex-grow min-h-[500px] border border-gray-200 shadow-sm">
                  <CardContent className="p-4">
                    <div 
                      ref={chatContainerRef}
                      className="h-[400px] overflow-y-auto flex flex-col space-y-4 mb-4"
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
                      <VoiceControls
                        onTranscript={(text) => setUserInput(prev => prev + text)}
                        lastMessage={messages.length > 0 && messages[messages.length - 1].role === 'assistant' 
                          ? messages[messages.length - 1].content 
                          : undefined}
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
              </TabsContent>
              
              {/* Form Interface */}
              <TabsContent value="form" className="mt-0">
                <BriefingForm
                  model={model}
                  temperature={temperature}
                  onGenerateBriefing={handleFormGeneratedBriefing}
                  isLoading={isLoading}
                />
              </TabsContent>
            </Tabs>
          </div>
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
            isLoading={isLoading && !briefingContent}
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