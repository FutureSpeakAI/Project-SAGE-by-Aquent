import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ImagePlus, Save, Library, Trash2, Download, BrainCircuit, MessageSquareText } from "lucide-react";
import { pageTransition } from "@/App";
import { ContentType } from "@shared/schema";
import { ImagePromptAgent } from "./ImagePromptAgent";

interface GenerateImageResponse {
  images: Array<{
    url: string;
    revised_prompt?: string;
  }>;
  model: string;
  prompt: string;
}

interface GenerateImageRequest {
  prompt: string;
  model?: string;
  size?: string;
  quality?: string;
  background?: string;
  moderation?: string;
  output_format?: string;
  output_compression?: number;
}

interface VisualTabProps {
  model: string;
  setModel: (model: string) => void;
  onOpenImageLibrary?: () => void;
}

export function VisualTab({ model, setModel, onOpenImageLibrary }: VisualTabProps) {
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [size, setSize] = useState<string>("1024x1024");
  const [quality, setQuality] = useState<string>("high");
  const [background, setBackground] = useState<string>("auto");
  const [imageTitle, setImageTitle] = useState<string>("");
  
  const { toast } = useToast();
  
  // Create a mutation to handle image generation
  const generateImageMutation = useMutation({
    mutationFn: async (data: GenerateImageRequest) => {
      const response = await apiRequest("POST", "/api/generate-image", data);
      const jsonData = await response.json();
      console.log("Image API Response:", jsonData);
      return jsonData as GenerateImageResponse;
    },
    onSuccess: (data) => {
      // Extract image URL from the response
      console.log("Image generation successful:", data);
      if (data.images && data.images.length > 0 && data.images[0].url) {
        setGeneratedImageUrl(data.images[0].url);
        
        // Default title from prompt (first 30 chars)
        if (!imageTitle) {
          setImageTitle(imagePrompt.substring(0, 30) + (imagePrompt.length > 30 ? "..." : ""));
        }
        
        toast({
          title: "Image generated",
          description: "Your image has been successfully generated.",
        });
      } else {
        console.error("Unexpected API response format:", data);
        toast({
          title: "Image generation issue",
          description: "Received successful response but couldn't find image URL",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error("Image generation error:", error);
      toast({
        title: "Image generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const saveImageMutation = useMutation({
    mutationFn: async () => {
      if (!generatedImageUrl || !imageTitle) {
        throw new Error("Image URL and title are required");
      }
      
      // Process image URL to reduce size if it's a data URL
      let processedImageUrl = generatedImageUrl;
      
      // If it's a base64 data URL, extract the thumbnail version to reduce size
      if (generatedImageUrl.startsWith('data:image')) {
        try {
          // Create a smaller thumbnail version
          const img = new Image();
          img.src = generatedImageUrl;
          
          // Wait for image to load
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Failed to load image"));
            // Set timeout in case image loading hangs
            setTimeout(() => reject(new Error("Image loading timed out")), 5000);
          });
          
          // Create a canvas to resize the image
          const canvas = document.createElement('canvas');
          // Resize to 300px width while maintaining aspect ratio
          const MAX_WIDTH = 300;
          const scaleFactor = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleFactor;
          
          // Draw image on canvas at reduced size
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Get as JPEG with reduced quality (0.6 = 60% quality)
            processedImageUrl = canvas.toDataURL('image/jpeg', 0.6);
          }
        } catch (error) {
          console.error("Error processing image:", error);
          // Fall back to original URL if something goes wrong
        }
      }
      
      const response = await apiRequest("POST", "/api/generated-images", {
        title: imageTitle,
        prompt: imagePrompt,
        imageUrl: processedImageUrl, // Use the reduced size image
        model: "gpt-image-1",
        size,
        quality,
        background,
        metadata: JSON.stringify({ savedAt: new Date().toISOString() })
      });
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Image saved",
        description: "Your image has been saved to the library.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save image",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleGenerateImage = () => {
    if (!imagePrompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a prompt to generate an image.",
        variant: "destructive",
      });
      return;
    }
    
    generateImageMutation.mutate({
      prompt: imagePrompt,
      model: "gpt-image-1", // Use GPT Image model for all image generation
      size,
      quality,
      background,
    });
  };
  
  const handleSaveImage = () => {
    if (!generatedImageUrl) {
      toast({
        title: "No image to save",
        description: "Please generate an image first.",
        variant: "destructive",
      });
      return;
    }
    
    if (!imageTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your image.",
        variant: "destructive",
      });
      return;
    }
    
    saveImageMutation.mutate();
  };
  
  // Handle prompt from the agent
  const handlePromptFromAgent = (prompt: string) => {
    setImagePrompt(prompt);
    toast({
      title: "Prompt Applied",
      description: "The AI-generated prompt has been applied. You can now generate your image.",
    });
  };

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageTransition}
    >
      {/* Library Access Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={onOpenImageLibrary}
          className="mb-2"
          disabled={!onOpenImageLibrary}
        >
          <Library className="mr-2 h-4 w-4" />
          View Image Library
        </Button>
      </div>
      
      {/* Main content tabs */}
      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="standard" className="flex items-center">
            <ImagePlus className="mr-2 h-4 w-4" />
            Standard Mode
          </TabsTrigger>
          <TabsTrigger value="assistant" className="flex items-center">
            <BrainCircuit className="mr-2 h-4 w-4" />
            Prompt Assistant
          </TabsTrigger>
        </TabsList>
        
        {/* Standard Mode Content */}
        <TabsContent value="standard">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column - Input controls */}
            <div className="space-y-6">
              <Card className="p-4 shadow-md">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="image-prompt">Image Prompt</Label>
                    <Textarea
                      id="image-prompt"
                      placeholder="Describe the image you want to generate..."
                      className="min-h-[200px] resize-y"
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="model-select">Model</Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger id="model-select">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4o">GPT Image Generator (2025)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="size-select">Size</Label>
                      <Select value={size} onValueChange={setSize}>
                        <SelectTrigger id="size-select">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* GPT Image Model only supports these specific sizes */}
                          <SelectItem value="1024x1024">Square (1024×1024)</SelectItem>
                          <SelectItem value="1024x1536">Portrait (1024×1536)</SelectItem>
                          <SelectItem value="1536x1024">Landscape (1536×1024)</SelectItem>
                          <SelectItem value="auto">Auto (AI Chooses)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="quality-select">Quality</Label>
                      <Select value={quality} onValueChange={setQuality}>
                        <SelectTrigger id="quality-select">
                          <SelectValue placeholder="Select quality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low (Faster)</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High (Best Quality)</SelectItem>
                          <SelectItem value="auto">Auto (AI Chooses)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="background-select">Background</Label>
                      <Select value={background} onValueChange={setBackground}>
                        <SelectTrigger id="background-select">
                          <SelectValue placeholder="Select background" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto (AI Chooses)</SelectItem>
                          <SelectItem value="transparent">Transparent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-[#F15A22] hover:bg-[#e04d15]"
                    onClick={handleGenerateImage}
                    disabled={generateImageMutation.isPending || !imagePrompt.trim()}
                  >
                    {generateImageMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ImagePlus className="mr-2 h-4 w-4" />
                        Generate Image
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
            
            {/* Right column - Output display */}
            <div className="space-y-6">
              <Card className="p-4 shadow-md">
                <div className="space-y-4">
                  <Label htmlFor="image-output">Generated Image</Label>
                  <div className="min-h-[300px] border rounded-md flex items-center justify-center">
                    {generateImageMutation.isPending ? (
                      <div className="text-center p-6">
                        <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#F15A22]" />
                        <p className="mt-4 text-gray-500">Generating your image...</p>
                        <p className="text-sm text-gray-400">This may take a moment</p>
                      </div>
                    ) : generatedImageUrl ? (
                      <div className="w-full flex flex-col space-y-4">
                        <img 
                          src={generatedImageUrl} 
                          alt="Generated" 
                          className="mx-auto max-h-[500px] object-contain rounded-md border" 
                        />
                        
                        <div className="flex space-x-2 justify-center mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => setGeneratedImageUrl("")}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-500 border-blue-200 hover:bg-blue-50"
                            onClick={() => {
                              // Create an invisible anchor element
                              const a = document.createElement("a");
                              a.href = generatedImageUrl;
                              a.download = `image_${new Date().getTime()}.png`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-6 text-gray-500">
                        <ImagePlus className="mx-auto h-12 w-12 opacity-20" />
                        <p className="mt-2">Your generated image will appear here</p>
                      </div>
                    )}
                  </div>
                  
                  {generatedImageUrl && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="image-title">Image Title</Label>
                        <Textarea
                          id="image-title"
                          placeholder="Enter a title for your image..."
                          value={imageTitle}
                          onChange={(e) => setImageTitle(e.target.value)}
                          className="resize-none"
                        />
                      </div>
                      
                      <Button 
                        className="w-full bg-[#F15A22] hover:bg-[#e04d15]"
                        onClick={handleSaveImage}
                        disabled={saveImageMutation.isPending || !imageTitle.trim()}
                      >
                        {saveImageMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save to Library
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Prompt Assistant Content */}
        <TabsContent value="assistant">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left column - Prompt Assistant */}
            <div className="md:col-span-2">
              <ImagePromptAgent onPromptReady={handlePromptFromAgent} />
            </div>
            
            {/* Right column - Preview and Controls */}
            <div className="space-y-6">
              <Card className="p-4 shadow-md">
                <div className="space-y-4">
                  <Label>Current Prompt</Label>
                  <Textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    className="h-32 resize-none"
                    placeholder="Your prompt will appear here after using the assistant..."
                    readOnly
                  />
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="size-preview">Size</Label>
                      <Select value={size} onValueChange={setSize}>
                        <SelectTrigger id="size-preview">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1024x1024">Square (1024×1024)</SelectItem>
                          <SelectItem value="1024x1536">Portrait (1024×1536)</SelectItem>
                          <SelectItem value="1536x1024">Landscape (1536×1024)</SelectItem>
                          <SelectItem value="auto">Auto (AI Chooses)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="quality-preview">Quality</Label>
                      <Select value={quality} onValueChange={setQuality}>
                        <SelectTrigger id="quality-preview">
                          <SelectValue placeholder="Select quality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low (Faster)</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High (Best Quality)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-[#F15A22] hover:bg-[#e04d15]"
                    onClick={handleGenerateImage}
                    disabled={generateImageMutation.isPending || !imagePrompt.trim()}
                  >
                    {generateImageMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ImagePlus className="mr-2 h-4 w-4" />
                        Generate Image
                      </>
                    )}
                  </Button>
                  
                  {/* Display generated image if available */}
                  {generatedImageUrl && (
                    <div className="mt-4 space-y-4">
                      <Label>Generated Image</Label>
                      <div className="border rounded-md p-2">
                        <img 
                          src={generatedImageUrl} 
                          alt="Generated" 
                          className="mx-auto max-h-[300px] object-contain rounded-md" 
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            // Create an invisible anchor element
                            const a = document.createElement("a");
                            a.href = generatedImageUrl;
                            a.download = `image_${new Date().getTime()}.png`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setGeneratedImageUrl("")}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Discard
                        </Button>
                      </div>
                      
                      <div>
                        <Label htmlFor="image-title-assistant">Image Title</Label>
                        <Textarea
                          id="image-title-assistant"
                          placeholder="Enter a title for your image..."
                          value={imageTitle}
                          onChange={(e) => setImageTitle(e.target.value)}
                          className="resize-none"
                        />
                      </div>
                      
                      <Button 
                        className="w-full bg-[#F15A22] hover:bg-[#e04d15]"
                        onClick={handleSaveImage}
                        disabled={saveImageMutation.isPending || !imageTitle.trim()}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save to Library
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}