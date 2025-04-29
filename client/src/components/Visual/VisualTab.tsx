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
import { Loader2, ImagePlus, Save, Library, Trash2, Download } from "lucide-react";
import { pageTransition } from "@/App";
import { ContentType } from "@shared/schema";

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
      
      const response = await apiRequest("POST", "/api/generated-images", {
        title: imageTitle,
        prompt: imagePrompt,
        imageUrl: generatedImageUrl,
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
                      <SelectItem value="gpt-4o">GPT-4o Image Generator (2025)</SelectItem>
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
                      {/* General Formats */}
                      <SelectItem value="1024x1024">Square (1024×1024)</SelectItem>
                      <SelectItem value="1792x1024">Landscape (1792×1024)</SelectItem>
                      <SelectItem value="1024x1792">Portrait (1024×1792)</SelectItem>
                      
                      {/* Social Media */}
                      <SelectItem value="1200x630">Facebook Post (1200×630)</SelectItem>
                      <SelectItem value="1080x1080">Instagram Post (1080×1080)</SelectItem>
                      <SelectItem value="1080x1350">Instagram Portrait (1080×1350)</SelectItem>
                      <SelectItem value="1080x1920">Instagram Story (1080×1920)</SelectItem>
                      <SelectItem value="1200x628">Twitter Post (1200×628)</SelectItem>
                      <SelectItem value="1080x1920">TikTok Video (1080×1920)</SelectItem>
                      <SelectItem value="1500x500">LinkedIn Banner (1500×500)</SelectItem>
                      
                      {/* Display Ads */}
                      <SelectItem value="728x90">Leaderboard Ad (728×90)</SelectItem>
                      <SelectItem value="300x250">Medium Rectangle Ad (300×250)</SelectItem>
                      <SelectItem value="300x600">Half Page Ad (300×600)</SelectItem>
                      <SelectItem value="970x250">Billboard Ad (970×250)</SelectItem>
                      <SelectItem value="320x50">Mobile Banner (320×50)</SelectItem>
                      
                      {/* Print Media */}
                      <SelectItem value="1275x1650">Magazine Full Page (1275×1650)</SelectItem>
                      <SelectItem value="1275x825">Magazine Half Page (1275×825)</SelectItem>
                      <SelectItem value="1200x1500">Newspaper Ad (1200×1500)</SelectItem>
                      
                      {/* Marketing Materials */}
                      <SelectItem value="1500x844">Website Hero Banner (1500×844)</SelectItem>
                      <SelectItem value="600x900">Poster (600×900)</SelectItem>
                      <SelectItem value="1050x600">Postcard (1050×600)</SelectItem>
                      <SelectItem value="1200x900">Product Photo (1200×900)</SelectItem>
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
    </motion.div>
  );
}