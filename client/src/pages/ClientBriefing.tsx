import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, FormInput, Mic, Send, Upload, FileText, Loader2, Sparkles, CheckCircle, Award, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { VoiceControls } from '@/components/ui/VoiceControls';
import { EditableBriefingOutput } from '@/components/Briefing/EditableBriefingOutput';

const pageTransition = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ClientBriefing() {
  // SAGE Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [briefingContent, setBriefingContent] = useState('');
  
  // Form State - Match the comprehensive briefing form
  const [formData, setFormData] = useState({
    // Project Details
    projectName: '',
    projectDescription: '',
    projectBackground: '',
    
    // Audience & Objectives
    targetAudience: '',
    objectives: '',
    keyMessages: '',
    
    // Content Parameters
    contentType: 'Blog Post',
    contentTones: ['Professional'],
    contentLength: 'Medium (500-1000 words)',
    
    // Deliverables & Timeline
    deliverables: '',
    timeline: '',
    
    // Additional Information
    additionalInfo: '',
    
    // Reference Images
    referenceImages: []
  });
  const [formLoading, setFormLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat only when messages are added
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send SAGE chat message
  const sendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: userInput };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          context: {
            capabilities: ["Context Memory", "Cross-Module Learning"],
            persona: "default",
            sessionHistory: messages.slice(-5),
            researchContext: null
          }
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content || data.text || 'No response received'
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Communication Error",
        description: "Unable to connect with SAGE. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate briefing from SAGE conversation
  const generateBriefingFromChat = async () => {
    if (messages.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          systemPrompt: "Based on the conversation, create a comprehensive creative briefing document that will serve as a detailed guide for content creators. Include these sections: 1. Project Overview, 2. Objectives, 3. Target Audience, 4. Key Messages, 5. Deliverables, 6. Content Creation Guidelines, 7. Timeline. Use HTML formatting with proper tags for headings, paragraphs, and lists. Make it professional and actionable.",
          userPrompt: messages
            .map(msg => `${msg.role === 'user' ? 'Client' : 'SAGE'}: ${msg.content}`)
            .join('\n\n'),
          temperature: 0.7
        })
      });

      if (!response.ok) throw new Error('Failed to generate briefing');

      const data = await response.json();
      setBriefingContent(data.content);
      
      toast({
        title: "Briefing Generated",
        description: "Your creative brief has been successfully created from the conversation."
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Error",
        description: "Unable to generate briefing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit form briefing
  const submitFormBriefing = async () => {
    setFormLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          systemPrompt: "Create a comprehensive creative briefing document from the provided form data. Structure it professionally with HTML formatting including proper headings, paragraphs, and lists. Make it actionable for content creators.",
          userPrompt: `Create a comprehensive creative brief using this information:

PROJECT DETAILS:
Project Name: ${formData.projectName}
Project Description: ${formData.projectDescription}
Background/Context: ${formData.projectBackground}

AUDIENCE & OBJECTIVES:
Target Audience: ${formData.targetAudience}
Objectives: ${formData.objectives}
Key Messages: ${formData.keyMessages}

CONTENT PARAMETERS:
Content Type: ${formData.contentType}
Tone/Voice: ${formData.contentTones.join(', ')}
Length: ${formData.contentLength}

DELIVERABLES & TIMELINE:
Deliverables: ${formData.deliverables}
Timeline: ${formData.timeline}

ADDITIONAL INFORMATION:
${formData.additionalInfo}

The brief should follow this structure:
1. Project Overview (detailed description, context, and background)
2. Objectives (specific, measurable goals)
3. Target Audience (detailed persona descriptions)
4. Key Messages (primary communication points)
5. Deliverables (detailed specifications)
6. Content Creation Guidelines (voice, tone, and specific terminology)
7. Timeline (schedule with milestones)
8. Content Creation Instructions (specific, actionable instructions)

IMPORTANT FORMATTING REQUIREMENTS:
- Use proper HTML formatting with h1, h2, p, ul/li, ol/li tags
- Make the final section titled "Content Creation Instructions" extremely specific and actionable
- Use imperative voice in the instructions section (e.g., "Create a blog post that...")
- Format content to be visually organized and professional
- Do NOT include any markdown, code blocks, or commentary
- Ensure all lists use proper HTML list tags, not plain text bullets or numbers`,
          temperature: 0.7
        })
      });

      if (!response.ok) throw new Error('Failed to generate briefing');

      const data = await response.json();
      setBriefingContent(data.content);
      
      toast({
        title: "Briefing Created",
        description: "Your creative brief has been generated from the form data."
      });
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Submission Error",
        description: "Unable to process form. Please try again.",
        variant: "destructive"
      });
    } finally {
      setFormLoading(false);
    }
  };

  // Save briefing to library
  const saveBriefing = async () => {
    if (!briefingContent) return;

    try {
      // Extract title from content
      let title = 'Client Brief';
      const titleMatch = briefingContent.match(/<h1[^>]*>(.*?)<\/h1>|<h2[^>]*>(.*?)<\/h2>/i);
      if (titleMatch) {
        title = (titleMatch[1] || titleMatch[2]).replace(/<[^>]*>/g, '').trim();
      } else if (formData.projectName) {
        title = formData.projectName;
      }

      // Create briefing messages array
      const briefingMessages = messages.length > 0 ? [
        ...messages,
        { role: 'assistant', content: briefingContent }
      ] : [
        { role: 'user', content: 'Form-based briefing submission' },
        { role: 'assistant', content: briefingContent }
      ];

      const response = await fetch('/api/brief-conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          messages: briefingMessages
        })
      });

      if (response.ok) {
        toast({
          title: "Brief Saved",
          description: `"${title}" has been saved to your briefing library.`
        });
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Error",
        description: "Unable to save briefing. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle document upload
  const handleDocumentUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('document', file);

    setIsLoading(true);
    try {
      const response = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setBriefingContent(data.extractedText || 'Document processed successfully');
      
      toast({
        title: "Document Uploaded",
        description: "Your document has been processed and is ready for review."
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Error",
        description: "Unable to process document. Please try again.",
        variant: "destructive"
      });
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
      className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 relative overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-orange-200 to-orange-300 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-blue-200 to-blue-300 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-32 w-40 h-40 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full opacity-20 animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section - Simplified */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <div className="inline-flex items-center bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4 mr-2" />
                Get Your Marketing Brief in Minutes
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                Tell Us About Your Project
              </h1>
              
              <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Share your ideas with SAGE, our AI marketing assistant, and get a professional brief 
                that our expert team will use to create your campaign.
              </p>
            </motion.div>
          </div>

          {/* Process Steps - Simplified */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 text-orange-600 rounded-xl mb-3 text-lg font-bold">1</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Share Your Ideas</h3>
                <p className="text-sm text-gray-600">Tell us about your project</p>
              </div>
              
              <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-xl mb-3 text-lg font-bold">2</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Get Your Brief</h3>
                <p className="text-sm text-gray-600">AI creates a marketing plan</p>
              </div>
              
              <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-xl mb-3 text-lg font-bold">3</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">We Build It</h3>
                <p className="text-sm text-gray-600">Our team creates your campaign</p>
              </div>
            </div>
          </motion.div>

          {/* Main Content Section */}
          {isExpanded ? (
            <EditableBriefingOutput
              briefingContent={briefingContent}
              isExpanded={true}
              onToggleExpanded={() => setIsExpanded(false)}
              onSave={saveBriefing}
              title={formData.projectName || "Strategic Marketing Brief"}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Input Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className={`space-y-6 ${isExpanded ? "w-full" : ""}`}
            >
              {/* Choice Header - Simplified */}
              <div className="text-center lg:text-left mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">How would you like to start?</h2>
                <p className="text-gray-600">Choose the option that feels most comfortable</p>
              </div>

              <Tabs defaultValue="chat" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12 bg-gray-50 rounded-lg p-1">
                  <TabsTrigger value="chat" className="flex items-center gap-2 h-10 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm">
                    <MessageSquare className="h-4 w-4" />
                    <span>Chat with AI</span>
                  </TabsTrigger>
                  <TabsTrigger value="form" className="flex items-center gap-2 h-10 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm">
                    <FormInput className="h-4 w-4" />
                    <span>Fill Out Form</span>
                  </TabsTrigger>
                </TabsList>

                {/* SAGE Chat Tab - Simplified */}
                <TabsContent value="chat" className="mt-6">
                  <Card className="border border-gray-200 shadow-lg bg-white">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-white" />
                          </div>
                          <span>Chat with SAGE</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-gray-600 border-gray-300 hover:bg-gray-100"
                          >
                            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleDocumentUpload}
                            className="text-orange-600 border-orange-200 hover:bg-orange-50"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Files
                          </Button>
                        </div>
                      </CardTitle>
                      <p className="text-gray-600 text-sm">Describe your project in your own words</p>
                    </CardHeader>
                    <CardContent>
                      {/* Chat Messages - Simplified */}
                      <div className={`${isExpanded ? "h-96" : "h-64"} overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50 relative`}>
                        {messages.length === 0 ? (
                          <div className="text-center text-gray-500 mt-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-xl mb-3">
                              <MessageSquare className="h-8 w-8 text-orange-500" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-700 mb-2">Let's get started!</h3>
                            <p className="text-gray-500 max-w-xs mx-auto text-sm">Tell me about your project. What are you trying to promote or achieve?</p>
                            <div className="mt-3 flex flex-wrap justify-center gap-2">
                              <span className="inline-block bg-white text-gray-600 px-2 py-1 rounded text-xs border">New product</span>
                              <span className="inline-block bg-white text-gray-600 px-2 py-1 rounded text-xs border">Event promotion</span>
                              <span className="inline-block bg-white text-gray-600 px-2 py-1 rounded text-xs border">Brand awareness</span>
                            </div>
                          </div>
                      ) : (
                        messages.map((msg, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                          >
                            <div
                              className={`inline-block p-3 rounded-xl max-w-[80%] ${
                                msg.role === 'user'
                                  ? 'bg-orange-500 text-white rounded-br-md'
                                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                              }`}
                            >
                              {msg.content}
                            </div>
                          </motion.div>
                        ))
                      )}
                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-left"
                        >
                          <div className="inline-block p-3 rounded-xl bg-white border border-gray-200 rounded-bl-md">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                                <Sparkles className="h-3 w-3 text-white" />
                              </div>
                              <span className="text-gray-600 text-sm">SAGE is thinking...</span>
                              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                      {/* Input Area - Simplified */}
                      <div className="flex gap-2 items-end">
                        <div className="flex-grow">
                          <Input
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Tell me about your project..."
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            disabled={isLoading}
                            className="h-10 text-sm border border-gray-300 focus:border-orange-500 rounded-lg px-3"
                          />
                        </div>
                      <VoiceControls
                        onTranscript={(text) => {
                          const newMessage = userInput + text;
                          setUserInput(newMessage);
                          
                          if (newMessage.trim()) {
                            const userMessage = { role: 'user' as const, content: newMessage };
                            setMessages(prev => [...prev, userMessage]);
                            setIsLoading(true);
                            setUserInput("");
                            
                            fetch('/api/chat', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                message: newMessage,
                                context: {
                                  capabilities: ["Context Memory", "Cross-Module Learning"],
                                  persona: "default",
                                  sessionHistory: messages.slice(-5),
                                  researchContext: null
                                }
                              })
                            })
                            .then(res => res.json())
                            .then(data => {
                              const assistantMessage = {
                                role: 'assistant' as const,
                                content: data.content || data.text || 'No response received'
                              };
                              setMessages(prev => [...prev, assistantMessage]);
                              setIsLoading(false);
                            })
                            .catch(err => {
                              console.error('Chat error:', err);
                              setIsLoading(false);
                            });
                          }
                        }}
                        lastMessage={messages.length > 0 && messages[messages.length - 1].role === 'assistant' 
                          ? messages[messages.length - 1].content : null}
                      />
                        <Button
                          onClick={sendMessage}
                          disabled={!userInput.trim() || isLoading}
                          className="h-10 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>

                      {messages.length > 0 && (
                        <Button
                          onClick={generateBriefingFromChat}
                          disabled={isLoading}
                          className="w-full mt-4 h-10 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Create My Brief
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Form Tab */}
                <TabsContent value="form" className="mt-8">
                  <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <FormInput className="h-5 w-5 text-white" />
                        </div>
                        <span>Comprehensive Project Form</span>
                      </CardTitle>
                      <p className="text-gray-600 mt-1">Provide detailed information for the most precise brief</p>
                    </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Project Details Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Project Details</h3>
                      
                      <div>
                        <Label htmlFor="projectName">Project Name *</Label>
                        <Input
                          id="projectName"
                          value={formData.projectName}
                          onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                          placeholder="Enter your project name"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="projectDescription">Project Description *</Label>
                        <Textarea
                          id="projectDescription"
                          value={formData.projectDescription}
                          onChange={(e) => setFormData(prev => ({ ...prev, projectDescription: e.target.value }))}
                          placeholder="Provide a detailed description of your project..."
                          rows={3}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="projectBackground">Project Background</Label>
                        <Textarea
                          id="projectBackground"
                          value={formData.projectBackground}
                          onChange={(e) => setFormData(prev => ({ ...prev, projectBackground: e.target.value }))}
                          placeholder="Any relevant background information or context..."
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Audience & Objectives Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Audience & Objectives</h3>
                      
                      <div>
                        <Label htmlFor="targetAudience">Target Audience *</Label>
                        <Textarea
                          id="targetAudience"
                          value={formData.targetAudience}
                          onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                          placeholder="Describe your target audience (demographics, interests, pain points)..."
                          rows={3}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="objectives">Project Objectives</Label>
                        <Textarea
                          id="objectives"
                          value={formData.objectives}
                          onChange={(e) => setFormData(prev => ({ ...prev, objectives: e.target.value }))}
                          placeholder="What specific goals are you trying to achieve?"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="keyMessages">Key Messages</Label>
                        <Textarea
                          id="keyMessages"
                          value={formData.keyMessages}
                          onChange={(e) => setFormData(prev => ({ ...prev, keyMessages: e.target.value }))}
                          placeholder="What are the main points you want to communicate?"
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Content Parameters Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Content Parameters</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="contentType">Content Type</Label>
                          <select
                            id="contentType"
                            value={formData.contentType}
                            onChange={(e) => setFormData(prev => ({ ...prev, contentType: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F15A22]"
                          >
                            <option value="Blog Post">Blog Post</option>
                            <option value="Social Media Post">Social Media Post</option>
                            <option value="Email">Email</option>
                            <option value="Newsletter">Newsletter</option>
                            <option value="Website Content">Website Content</option>
                            <option value="White Paper">White Paper</option>
                            <option value="Case Study">Case Study</option>
                            <option value="Product Description">Product Description</option>
                            <option value="Press Release">Press Release</option>
                            <option value="Video Script">Video Script</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <Label htmlFor="contentLength">Content Length</Label>
                          <select
                            id="contentLength"
                            value={formData.contentLength}
                            onChange={(e) => setFormData(prev => ({ ...prev, contentLength: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F15A22]"
                          >
                            <option value="Very Short (< 250 words)">Very Short (&lt; 250 words)</option>
                            <option value="Short (250-500 words)">Short (250-500 words)</option>
                            <option value="Medium (500-1000 words)">Medium (500-1000 words)</option>
                            <option value="Long (1000-2000 words)">Long (1000-2000 words)</option>
                            <option value="Very Long (2000+ words)">Very Long (2000+ words)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <Label>Content Tone</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                          {['Professional', 'Conversational', 'Formal', 'Casual', 'Humorous', 'Technical', 'Persuasive', 'Inspirational', 'Educational', 'Authoritative'].map(tone => (
                            <label key={tone} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={formData.contentTones.includes(tone)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData(prev => ({
                                      ...prev,
                                      contentTones: [...prev.contentTones, tone]
                                    }));
                                  } else {
                                    setFormData(prev => ({
                                      ...prev,
                                      contentTones: prev.contentTones.filter(t => t !== tone)
                                    }));
                                  }
                                }}
                                className="rounded border-gray-300 text-[#F15A22] focus:ring-[#F15A22]"
                              />
                              <span className="text-sm">{tone}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Deliverables & Timeline Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Deliverables & Timeline</h3>
                      
                      <div>
                        <Label htmlFor="deliverables">Specific Deliverables</Label>
                        <Textarea
                          id="deliverables"
                          value={formData.deliverables}
                          onChange={(e) => setFormData(prev => ({ ...prev, deliverables: e.target.value }))}
                          placeholder="List specific deliverables (e.g., 3 social media posts, 1 blog article, email campaign)..."
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="timeline">Timeline & Deadlines</Label>
                        <Input
                          id="timeline"
                          value={formData.timeline}
                          onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
                          placeholder="e.g., 4 weeks, by March 15th, etc."
                        />
                      </div>
                    </div>

                    {/* Additional Information Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>
                      
                      <div>
                        <Label htmlFor="additionalInfo">Additional Details</Label>
                        <Textarea
                          id="additionalInfo"
                          value={formData.additionalInfo}
                          onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                          placeholder="Any other important details, brand guidelines, constraints, or special requirements..."
                          rows={3}
                        />
                      </div>
                    </div>

                      <Button
                        onClick={submitFormBriefing}
                        disabled={formLoading || !formData.projectName || !formData.projectDescription || !formData.targetAudience}
                        className="w-full h-14 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl shadow-lg font-semibold text-lg"
                      >
                        {formLoading ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                            Creating Your Strategic Brief...
                          </>
                        ) : (
                          <>
                            <FileText className="h-5 w-5 mr-3" />
                            Generate Strategic Marketing Brief
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>

            {/* Output Section */}
            {!isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <EditableBriefingOutput
                  briefingContent={briefingContent}
                  isExpanded={false}
                  onToggleExpanded={() => {}}
                  onSave={saveBriefing}
                  title={formData.projectName || "Strategic Marketing Brief"}
                />
              </motion.div>
            )}
          </div>
          )}


        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>
    </motion.div>
  );
}