import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, ImagePlus, Download } from "lucide-react";
import { pageTransition } from "@/App";
import { useToast } from "@/hooks/use-toast";

interface StableVisualTabProps {
  model: string;
  setModel: (model: string) => void;
}

/**
 * A completely simplified Visual Tab focusing on pure stability
 * This component only has basic image generation capabilities with no complex state management
 */
export function StableVisualTab({ model, setModel }: StableVisualTabProps) {
  const [imagePrompt, setImagePrompt] = useState("");
  const [size, setSize] = useState<string>("1024x1024");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a prompt to generate an image.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120-second timeout for complex image generation
      
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          model: "gpt-image-1", // Always use gpt-image-1
          size: size,
          quality: "high",
          background: "auto"
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.images && data.images.length > 0 && data.images[0].url) {
        setGeneratedImageUrl(data.images[0].url);
        toast({
          title: "Image generated",
          description: "Your image has been successfully generated.",
        });
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (err: any) {
      const errorMessage = err?.message || "Unknown error";
      setError(errorMessage);
      toast({
        title: "Image generation failed",
        description: errorMessage.substring(0, 100),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownload = () => {
    if (generatedImageUrl) {
      const a = document.createElement("a");
      a.href = generatedImageUrl;
      a.download = `image_${new Date().getTime()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageTransition}
    >
      <div className="mx-auto max-w-4xl">
        <h2 className="text-2xl font-bold mb-6">AI Image Generator (Stability Mode)</h2>
        
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
                
                <div>
                  <Label htmlFor="size-select">Size</Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger id="size-select">
                      <SelectValue  />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1024x1024">Square (1024×1024)</SelectItem>
                      <SelectItem value="1024x1536">Portrait (1024×1536)</SelectItem>
                      <SelectItem value="1536x1024">Landscape (1536×1024)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  className="w-full bg-[#F15A22] hover:bg-[#e04d15]"
                  onClick={handleGenerateImage}
                  disabled={isLoading || !imagePrompt.trim()}
                >
                  {isLoading ? (
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
                  {isLoading ? (
                    <div className="text-center p-6">
                      <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#F15A22]" />
                      <p className="mt-4 text-gray-500">Generating your image...</p>
                      <p className="text-sm text-gray-400">This may take a moment</p>
                    </div>
                  ) : error ? (
                    <div className="text-center p-6 text-red-500">
                      <p>Error: {error}</p>
                    </div>
                  ) : generatedImageUrl ? (
                    <div className="w-full flex flex-col space-y-4">
                      <div className="flex items-center justify-center">
                        <img 
                          src={generatedImageUrl} 
                          alt="Generated" 
                          className="mx-auto max-h-[500px] max-w-full object-contain rounded-md border" 
                          onError={() => {
                            setError("Failed to load image");
                          }}
                        />
                      </div>
                      
                      <Button
                        variant="outline"
                        className="mx-auto"
                        onClick={handleDownload}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Image
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center p-6 text-gray-500">
                      <ImagePlus className="mx-auto h-12 w-12 opacity-20" />
                      <p className="mt-2">Your generated image will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>This is a simplified version of the image generator with improved stability.</p>
          <p>Only basic image generation is supported in this mode.</p>
        </div>
      </div>
    </motion.div>
  );
}