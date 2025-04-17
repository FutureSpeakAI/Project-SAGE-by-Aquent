import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BriefingFormProps {
  model: string;
  temperature: number;
  onGenerateBriefing: (content: string) => void;
  isLoading: boolean;
}

export function BriefingForm({
  model,
  temperature,
  onGenerateBriefing,
  isLoading
}: BriefingFormProps) {
  const [formData, setFormData] = useState({
    // Project Details
    projectName: "",
    projectDescription: "",
    projectBackground: "",
    
    // Audience & Objectives
    targetAudience: "",
    objectives: "",
    keyMessages: "",
    
    // Content Parameters
    contentType: "Blog Post", // Default content type
    contentTone: "Professional",
    contentLength: "Medium (500-1000 words)",
    
    // Deliverables & Timeline
    deliverables: "",
    timeline: "",
    
    // Additional Information
    additionalInfo: ""
  });
  
  const { toast } = useToast();
  
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const contentTypes = [
    "Blog Post",
    "Social Media Post",
    "Email",
    "Newsletter",
    "Website Content",
    "White Paper",
    "Case Study",
    "Product Description",
    "Press Release",
    "Technical Documentation",
    "Video Script",
    "Other"
  ];
  
  const contentTones = [
    "Professional",
    "Conversational",
    "Formal",
    "Casual",
    "Humorous",
    "Technical",
    "Persuasive",
    "Inspirational",
    "Educational",
    "Authoritative"
  ];
  
  const contentLengths = [
    "Very Short (< 250 words)",
    "Short (250-500 words)",
    "Medium (500-1000 words)",
    "Long (1000-2000 words)",
    "Very Long (2000+ words)"
  ];
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if essential fields are filled out
    if (!formData.projectName || !formData.projectDescription || !formData.targetAudience) {
      toast({
        title: "Missing information",
        description: "Please fill out the project name, description, and target audience at minimum.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Format the data as a comprehensive prompt
      const systemPrompt = "You are an expert content strategist and creative director. Create a detailed, actionable creative brief based on the information provided. Format your response as rich HTML with proper headings, sections, and bullet points.";
      
      const userPrompt = `Create a comprehensive creative brief for the following project:
      
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
Tone/Voice: ${formData.contentTone}
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
- Ensure all lists use proper HTML list tags, not plain text bullets or numbers`;

      // Send request to OpenAI API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          systemPrompt,
          userPrompt,
          temperature,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate briefing');
      }
      
      const data = await response.json();
      
      // Clean the content
      let cleanedContent = data.content;
      
      // Remove markdown code block syntax
      cleanedContent = cleanedContent.replace(/^```(?:html)?\s*\n?/i, '');
      cleanedContent = cleanedContent.replace(/```[\s\S]*$/i, '');
      
      // Clean up AI commentary
      const commentPatterns = [
        /\n+[\s\n]*In summary[\s\S]*$/i,
        /\n+[\s\n]*To summarize[\s\S]*$/i,
        /\n+[\s\n]*I hope (this|these|that)[\s\S]*$/i, 
        /\n+[\s\n]*Hope (this|these|that)[\s\S]*$/i,
        /\n+[\s\n]*Let me know[\s\S]*$/i,
        /\n+[\s\n]*Please let me know[\s\S]*$/i,
        /\n+[\s\n]*Is there anything else[\s\S]*$/i,
        /\n+[\s\n]*This comprehensive brief[\s\S]*$/i
      ];
      
      for (const pattern of commentPatterns) {
        const match = cleanedContent.match(pattern);
        if (match && match.index !== undefined) {
          cleanedContent = cleanedContent.slice(0, match.index);
        }
      }
      
      // Pass the generated content up to the parent component
      onGenerateBriefing(cleanedContent);
      
    } catch (err: any) {
      toast({
        title: "Error generating briefing",
        description: err.message,
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-black to-gray-800 text-white">
        <CardTitle>Creative Brief Builder</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Accordion type="single" collapsible className="w-full" defaultValue="project-details">
            <AccordionItem value="project-details">
              <AccordionTrigger className="text-lg font-medium text-[#F15A22]">
                Project Details
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name<span className="text-red-500">*</span></Label>
                  <Input
                    id="projectName"
                    name="projectName"
                    value={formData.projectName}
                    onChange={handleInputChange}
                    placeholder="e.g., Spring Campaign 2025"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="projectDescription">Project Description<span className="text-red-500">*</span></Label>
                  <Textarea
                    id="projectDescription"
                    name="projectDescription"
                    value={formData.projectDescription}
                    onChange={handleInputChange}
                    placeholder="Describe what this project aims to accomplish"
                    className="min-h-[100px]"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="projectBackground">Background/Context</Label>
                  <Textarea
                    id="projectBackground"
                    name="projectBackground"
                    value={formData.projectBackground}
                    onChange={handleInputChange}
                    placeholder="Provide background information or context for this project"
                    className="min-h-[100px]"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="audience">
              <AccordionTrigger className="text-lg font-medium text-[#F15A22]">
                Audience & Objectives
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience<span className="text-red-500">*</span></Label>
                  <Textarea
                    id="targetAudience"
                    name="targetAudience"
                    value={formData.targetAudience}
                    onChange={handleInputChange}
                    placeholder="Describe the audience demographics, interests, pain points, etc."
                    className="min-h-[100px]"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="objectives">Objectives</Label>
                  <Textarea
                    id="objectives"
                    name="objectives"
                    value={formData.objectives}
                    onChange={handleInputChange}
                    placeholder="What are the specific goals of this content? (e.g., increase brand awareness, generate leads)"
                    className="min-h-[100px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="keyMessages">Key Messages</Label>
                  <Textarea
                    id="keyMessages"
                    name="keyMessages"
                    value={formData.keyMessages}
                    onChange={handleInputChange}
                    placeholder="What are the main points or messages to communicate?"
                    className="min-h-[100px]"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="content-params">
              <AccordionTrigger className="text-lg font-medium text-[#F15A22]">
                Content Parameters
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="contentType">Content Type</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {contentTypes.map(type => (
                      <Button
                        key={type}
                        type="button"
                        variant={formData.contentType === type ? "default" : "outline"}
                        className={formData.contentType === type ? "bg-[#F15A22] hover:bg-[#F15A22]/90" : ""}
                        onClick={() => setFormData(prev => ({...prev, contentType: type}))}
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contentTone">Tone/Voice</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {contentTones.map(tone => (
                      <Button
                        key={tone}
                        type="button"
                        variant={formData.contentTone === tone ? "default" : "outline"}
                        className={formData.contentTone === tone ? "bg-[#F15A22] hover:bg-[#F15A22]/90" : ""}
                        onClick={() => setFormData(prev => ({...prev, contentTone: tone}))}
                      >
                        {tone}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contentLength">Content Length</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {contentLengths.map(length => (
                      <Button
                        key={length}
                        type="button"
                        variant={formData.contentLength === length ? "default" : "outline"}
                        className={formData.contentLength === length ? "bg-[#F15A22] hover:bg-[#F15A22]/90" : ""}
                        onClick={() => setFormData(prev => ({...prev, contentLength: length}))}
                      >
                        {length}
                      </Button>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="deliverables">
              <AccordionTrigger className="text-lg font-medium text-[#F15A22]">
                Deliverables & Timeline
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="deliverables">Deliverables</Label>
                  <Textarea
                    id="deliverables"
                    name="deliverables"
                    value={formData.deliverables}
                    onChange={handleInputChange}
                    placeholder="What specific deliverables are required? Include formats, specifications, etc."
                    className="min-h-[100px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timeline">Timeline</Label>
                  <Textarea
                    id="timeline"
                    name="timeline"
                    value={formData.timeline}
                    onChange={handleInputChange}
                    placeholder="When do these deliverables need to be completed? Include key milestones."
                    className="min-h-[100px]"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="additional">
              <AccordionTrigger className="text-lg font-medium text-[#F15A22]">
                Additional Information
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="additionalInfo">Any Other Details</Label>
                  <Textarea
                    id="additionalInfo"
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleInputChange}
                    placeholder="Include any other relevant information, restrictions, competitors to avoid mentioning, etc."
                    className="min-h-[100px]"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-[#F15A22] hover:bg-[#F15A22]/90 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Creative Brief'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}