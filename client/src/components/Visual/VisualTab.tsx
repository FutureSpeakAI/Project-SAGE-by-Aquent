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
import { Loader2, ImagePlus, Save, Library } from "lucide-react";
import { pageTransition } from "@/App";
import { ContentType } from "@shared/schema";

interface GenerateImageResponse {
  imageUrl: string;
}

interface GenerateImageRequest {
  prompt: string;
  model?: string;
  size?: string;
  quality?: string;
  style?: string;
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
  const [quality, setQuality] = useState<string>("standard");
  const [style, setStyle] = useState<string>("natural");
  const [imageTitle, setImageTitle] = useState<string>("");
  
  const { toast } = useToast();
  
  // Create a mutation to handle image generation
  const generateImageMutation = useMutation({
    mutationFn: async (data: GenerateImageRequest) => {
      const response = await apiRequest("POST", "/api/generate-image", data);
      return response.json() as Promise<GenerateImageResponse>;
    },
    onSuccess: (data) => {
      setGeneratedImageUrl(data.imageUrl);
      
      // Default title from prompt (first 30 chars)
      if (!imageTitle) {
        setImageTitle(imagePrompt.substring(0, 30) + (imagePrompt.length > 30 ? "..." : ""));
      }
      
      toast({
        title: "Image generated",
        description: "Your image has been successfully generated.",
      });
    },
    onError: (error: Error) => {
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
        model,
        size,
        quality,
        style,
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
      model: model === "gpt-4o" ? "dall-e-3" : model, // Use DALL-E 3 when GPT-4o is selected
      size,
      quality,
      style,
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
                      <SelectItem value="gpt-4o">GPT-4o (DALL-E 3)</SelectItem>
                      <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
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
                      <SelectItem value="1024x1024">Square (1024×1024)</SelectItem>
                      <SelectItem value="1792x1024">Landscape (1792×1024)</SelectItem>
                      <SelectItem value="1024x1792">Portrait (1024×1792)</SelectItem>
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
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="hd">HD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="style-select">Style</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger id="style-select">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="natural">Natural</SelectItem>
                      <SelectItem value="vivid">Vivid</SelectItem>
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
                  <div className="w-full">
                    <img 
                      src={generatedImageUrl} 
                      alt="Generated" 
                      className="mx-auto max-h-[500px] object-contain" 
                    />
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