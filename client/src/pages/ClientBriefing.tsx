import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, FormInput, Mic, Send, Upload, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import VoiceControls from '@/components/VoiceControls';

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
  
  // Form State
  const [formData, setFormData] = useState({
    projectName: '',
    company: '',
    industry: '',
    targetAudience: '',
    objectives: '',
    deliverables: '',
    timeline: '',
    budget: '',
    brandGuidelines: '',
    additionalInfo: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
          userPrompt: `Create a detailed creative brief using this information:
          
Project: ${formData.projectName}
Company: ${formData.company}
Industry: ${formData.industry}
Target Audience: ${formData.targetAudience}
Objectives: ${formData.objectives}
Deliverables: ${formData.deliverables}
Timeline: ${formData.timeline}
Budget: ${formData.budget}
Brand Guidelines: ${formData.brandGuidelines}
Additional Information: ${formData.additionalInfo}`,
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
      className="min-h-screen bg-gradient-to-br from-orange-50 to-white p-6"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Your Marketing Brief</h1>
          <p className="text-lg text-gray-600">Tell us about your project and let our AI create a comprehensive creative brief</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <Tabs defaultValue="chat" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chat with SAGE
                </TabsTrigger>
                <TabsTrigger value="form" className="flex items-center gap-2">
                  <FormInput className="h-4 w-4" />
                  Fill Form
                </TabsTrigger>
              </TabsList>

              {/* SAGE Chat Tab */}
              <TabsContent value="chat" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Describe Your Project</span>
                      <Button
                        variant="outline"
                        onClick={handleDocumentUpload}
                        className="text-[#F15A22] border-[#F15A22] hover:bg-[#F15A22] hover:text-white"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Chat Messages */}
                    <div className="h-64 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50">
                      {messages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-8">
                          <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>Start a conversation about your marketing project</p>
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
                              className={`inline-block p-3 rounded-lg max-w-[80%] ${
                                msg.role === 'user'
                                  ? 'bg-[#F15A22] text-white rounded-br-none'
                                  : 'bg-white text-gray-800 border rounded-bl-none'
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
                          <div className="inline-block p-3 rounded-lg bg-white border rounded-bl-none">
                            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                            SAGE is thinking...
                          </div>
                        </motion.div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="flex gap-2">
                      <Input
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Tell us about your marketing project..."
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        disabled={isLoading}
                        className="flex-grow"
                      />
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
                        className="bg-[#F15A22] hover:bg-[#D14A1A] text-white"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>

                    {messages.length > 0 && (
                      <Button
                        onClick={generateBriefingFromChat}
                        disabled={isLoading}
                        className="w-full mt-4 bg-[#F15A22] hover:bg-[#D14A1A] text-white"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Brief from Conversation
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Form Tab */}
              <TabsContent value="form" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Details Form</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="projectName">Project Name</Label>
                        <Input
                          id="projectName"
                          value={formData.projectName}
                          onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                          placeholder="Enter project name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                          placeholder="Company name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="industry">Industry</Label>
                        <Input
                          id="industry"
                          value={formData.industry}
                          onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                          placeholder="e.g., Healthcare, Technology"
                        />
                      </div>
                      <div>
                        <Label htmlFor="timeline">Timeline</Label>
                        <Input
                          id="timeline"
                          value={formData.timeline}
                          onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
                          placeholder="e.g., 4 weeks"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="targetAudience">Target Audience</Label>
                      <Textarea
                        id="targetAudience"
                        value={formData.targetAudience}
                        onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                        placeholder="Describe your target audience..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="objectives">Project Objectives</Label>
                      <Textarea
                        id="objectives"
                        value={formData.objectives}
                        onChange={(e) => setFormData(prev => ({ ...prev, objectives: e.target.value }))}
                        placeholder="What are you trying to achieve?"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="deliverables">Deliverables Needed</Label>
                      <Textarea
                        id="deliverables"
                        value={formData.deliverables}
                        onChange={(e) => setFormData(prev => ({ ...prev, deliverables: e.target.value }))}
                        placeholder="e.g., 3 social media posts, 1 blog article, email campaign"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="additionalInfo">Additional Information</Label>
                      <Textarea
                        id="additionalInfo"
                        value={formData.additionalInfo}
                        onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                        placeholder="Any other details we should know..."
                        rows={3}
                      />
                    </div>

                    <Button
                      onClick={submitFormBriefing}
                      disabled={formLoading || !formData.projectName}
                      className="w-full bg-[#F15A22] hover:bg-[#D14A1A] text-white"
                    >
                      {formLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating Brief...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Create Brief from Form
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Output Section */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Your Creative Brief</span>
                  {briefingContent && (
                    <Button
                      onClick={saveBriefing}
                      variant="outline"
                      className="text-[#F15A22] border-[#F15A22] hover:bg-[#F15A22] hover:text-white"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Save Brief
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {briefingContent ? (
                  <div className="prose max-w-none h-96 overflow-y-auto border rounded-lg p-4 bg-white">
                    <div dangerouslySetInnerHTML={{ __html: briefingContent }} />
                  </div>
                ) : (
                  <div className="h-96 flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Your creative brief will appear here</p>
                      <p className="text-sm mt-2">Start a conversation or fill out the form to begin</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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