import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Edit, 
  Paintbrush, 
  Eraser, 
  ZoomIn, 
  ZoomOut, 
  Wand2, 
  Loader2,
  Download
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ImageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  imageId?: number;
  onImageEdited?: (newImageUrl: string) => void;
}

interface EditRequest {
  image: string;
  mask?: string;
  prompt: string;
  model?: string;
  size?: string;
  quality?: string;
  n?: number;
}

export function ImageEditor({ open, onOpenChange, imageUrl, imageId, onImageEdited }: ImageEditorProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [maskData, setMaskData] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [activeTab, setActiveTab] = useState("inpaint");
  const [brushSize, setBrushSize] = useState(20);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [zoom, setZoom] = useState(1);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [model, setModel] = useState("gpt-image-1");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("standard");
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  const [imageLoadStatus, setImageLoadStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [imageTitle, setImageTitle] = useState("");

  // Fetch available models
  const { data: modelsData } = useQuery({
    queryKey: ["/api/models"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get image models for the dropdown
  const getImageModels = () => {
    const imageModels = ["gpt-image-1"]; // Primary editing model
    
    if (modelsData && typeof modelsData === 'object' && 'openai' in modelsData) {
      const openaiModels = (modelsData as any).openai;
      if (Array.isArray(openaiModels)) {
        if (openaiModels.includes("dall-e-3")) imageModels.push("dall-e-3");
        if (openaiModels.includes("dall-e-2")) imageModels.push("dall-e-2");
      }
    }
    
    return imageModels;
  };

  // Debug image URL and reset states when dialog opens
  useEffect(() => {
    if (open && imageUrl) {
      console.log("ImageEditor received imageUrl length:", imageUrl.length);
      console.log("ImageEditor received imageUrl preview:", imageUrl.substring(0, 100) + "...");
      console.log("ImageEditor received imageId:", imageId);
      console.log("ImageEditor imageUrl starts with data:", imageUrl.startsWith('data:'));
      setImageLoadStatus("loading");
      setEditedImageUrl(null);
      setMaskData(null);
      setPrompt("");
    }
  }, [open, imageUrl, imageId]);

  // Load and draw the original image on canvas
  useEffect(() => {
    if (!open || !imageUrl) {
      console.log("Skipping image load - not open or no URL");
      return;
    }

    const loadImageToCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.log("Canvas not ready, retrying...");
        setTimeout(loadImageToCanvas, 50);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("Could not get canvas context");
        setImageLoadStatus("error");
        return;
      }

      console.log("Starting image load process...");
      console.log("Loading image:", imageUrl.substring(0, 50) + "...");

      const img = new Image();
      
      img.onload = () => {
        console.log("Image loaded successfully:", img.width, "x", img.height);
        setImageLoadStatus("loaded");
        
        // Use larger canvas size for better quality and space utilization
        const maxSize = 1200; // Increased max size
        let canvasWidth = Math.min(img.width, maxSize);
        let canvasHeight = Math.min(img.height, maxSize);
        
        // Maintain aspect ratio
        if (img.width > img.height) {
          canvasHeight = (canvasWidth * img.height) / img.width;
        } else {
          canvasWidth = (canvasHeight * img.width) / img.height;
        }
        
        // Ensure minimum size for better visibility
        const minSize = 400;
        if (canvasWidth < minSize || canvasHeight < minSize) {
          const scale = minSize / Math.min(canvasWidth, canvasHeight);
          canvasWidth *= scale;
          canvasHeight *= scale;
        }
        
        // Set canvas size to maintain quality
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // Initialize mask canvas with same dimensions
        const maskCanvas = maskCanvasRef.current;
        if (maskCanvas) {
          maskCanvas.width = canvasWidth;
          maskCanvas.height = canvasHeight;
        }
        
        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Clear canvas with white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw image at full canvas size for crisp quality
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        console.log("Image drawn successfully at full quality:", canvas.width, "x", canvas.height);
      };
      
      img.onerror = (error) => {
        console.error("Failed to load image:", error);
        console.error("Image URL that failed:", imageUrl.substring(0, 100));
        setImageLoadStatus("error");
        
        // Show error state on canvas
        ctx.fillStyle = "#f3f4f6";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "#6b7280";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Failed to load image", canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText("Please try a different image", canvas.width / 2, canvas.height / 2 + 10);
        
        toast({
          title: "Error loading image",
          description: "Could not load the image for editing.",
          variant: "destructive"
        });
      };
      
      // Start loading immediately
      console.log("Setting image src...");
      img.src = imageUrl;
    };

    // Start the loading process
    loadImageToCanvas();
  }, [open, imageUrl, toast]);

  // Drawing functions for inpainting mask
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTab !== "inpaint" || tool !== "brush") return;
    
    setIsDrawing(true);
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    
    const rect = maskCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;
    
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(0, 150, 255, 0.9)"; // Blue mask for better contrast
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTab !== "inpaint") return;
    
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    
    const rect = maskCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    setMousePos({ x, y });
    
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Capture mask data from mask canvas
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    
    setMaskData(maskCanvas.toDataURL());
  };

  const clearMask = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;
    
    // Clear the mask canvas completely
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    setMaskData(null);
  };

  const mutation = useMutation({
    mutationFn: async (data: EditRequest) => {
      const response = await apiRequest("POST", "/api/edit-image", data);
      if (!response.ok) {
        throw new Error("Failed to edit image");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.images && data.images.length > 0) {
        const newImageUrl = data.images[0].url;
        setEditedImageUrl(newImageUrl);
        
        // Auto-populate title for quick saving
        if (!imageTitle) {
          setImageTitle(`Edited: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`);
        }
        
        if (onImageEdited) {
          onImageEdited(newImageUrl);
        }
        toast({
          title: "Image edited successfully",
          description: "Your edited image is ready for download or saving.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Image editing failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save edited image mutation with improved campaign integration
  const saveImageMutation = useMutation({
    mutationFn: async () => {
      if (!editedImageUrl || !imageTitle.trim() || !prompt.trim()) {
        throw new Error("Title, prompt, and image are required");
      }
      
      const response = await apiRequest("POST", "/api/generated-images", {
        title: imageTitle.trim(),
        prompt: prompt.trim(),
        imageUrl: editedImageUrl,
        model: model,
        size: size,
        quality: quality,
        metadata: { 
          editedAt: new Date().toISOString(),
          isEditedImage: true,
          originalImageId: imageId,
          editType: activeTab,
          editingSession: Date.now()
        }
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to save image");
      }
      
      return response.json();
    },
    onSuccess: (savedImage) => {
      // Invalidate queries to refresh the library
      queryClient.invalidateQueries({ queryKey: ["/api/generated-images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/image-projects"] });
      
      toast({
        title: "Image saved successfully",
        description: "Your edited image has been saved to the library and is available for use in campaigns.",
      });
      
      // Keep the dialog open but show success state
      setImageTitle("");
      // Don't clear the edited image so user can continue working
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save image",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Missing prompt",
        description: "Please describe the changes you want to make",
        variant: "destructive"
      });
      return;
    }

    if (activeTab === "inpaint" && !maskData) {
      toast({
        title: "Missing mask",
        description: "Please paint over the areas you want to modify",
        variant: "destructive"
      });
      return;
    }

    let requestData: EditRequest = {
      image: imageUrl,
      prompt: prompt.trim(),
      model,
      size,
      n: 1
    };

    if (activeTab === "inpaint" && maskData) {
      requestData.mask = maskData;
    }

    mutation.mutate(requestData);
  };

  const downloadEditedImage = () => {
    if (!editedImageUrl) return;
    
    const a = document.createElement('a');
    a.href = editedImageUrl;
    a.download = `edited_image_${new Date().getTime()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0 sm:max-w-[95vw]">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center">
            <Edit className="mr-2 h-5 w-5" />
            AI Image Editor
          </DialogTitle>
          <DialogDescription>
            Edit your AI-generated image using advanced AI-powered tools
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row h-[calc(95vh-120px)]">
          {/* Left Panel - Image Canvas */}
          <div className="w-full lg:w-[60%] bg-gray-50 dark:bg-gray-900 p-4 lg:p-6 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <Label className="text-lg font-medium">Original Image</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(zoom * 1.2, 3))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(zoom / 1.2, 0.5))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(1)}
                >
                  Reset
                </Button>
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
              <div className="relative">
                {/* Loading state overlay */}
                {imageLoadStatus === "loading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
                      <span className="text-sm text-gray-600">Loading image...</span>
                      {/* Debug info */}
                      <div className="text-xs text-gray-500 max-w-md text-center">
                        URL Length: {imageUrl?.length || 0}<br/>
                        Starts with data: {imageUrl?.startsWith('data:') ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>
                )}
                {imageLoadStatus === "loaded" && (
                  <div className="absolute top-2 left-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs z-10">
                    Ready
                  </div>
                )}
                {imageLoadStatus === "error" && (
                  <div className="absolute top-2 left-2 bg-red-100 text-red-800 px-2 py-1 rounded text-xs z-10">
                    Error Loading
                  </div>
                )}
                
                {/* Fallback image display if canvas fails */}
                {imageLoadStatus === "error" && imageUrl && (
                  <img 
                    src={imageUrl}
                    alt="Original image"
                    className="max-w-[600px] max-h-[600px] object-contain border border-gray-200 rounded"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: 'center'
                    }}
                  />
                )}
                
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={800}
                  className="border border-gray-200 dark:border-gray-700 rounded shadow-lg max-w-full max-h-full"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center',
                    display: imageLoadStatus === "error" ? 'none' : 'block'
                  }}
                />
                
                {/* Transparent mask overlay canvas */}
                <canvas
                  ref={maskCanvasRef}
                  width={800}
                  height={800}
                  className="absolute top-0 left-0 cursor-crosshair pointer-events-auto max-w-full max-h-full"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center',
                    maxHeight: '100%',
                    display: imageLoadStatus === "error" || activeTab !== "inpaint" ? 'none' : 'block',
                    opacity: 0.7
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
                
                {/* Brush preview */}
                {activeTab === "inpaint" && tool === "brush" && imageLoadStatus === "loaded" && (
                  <div
                    className="absolute pointer-events-none border-2 border-blue-500 rounded-full opacity-50"
                    style={{
                      width: `${brushSize * zoom}px`,
                      height: `${brushSize * zoom}px`,
                      left: `${mousePos.x * zoom - (brushSize * zoom) / 2}px`,
                      top: `${mousePos.y * zoom - (brushSize * zoom) / 2}px`,
                    }}
                  />
                )}
              </div>
            </div>
            
            {/* Canvas Tools */}
            {activeTab === "inpaint" && (
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <Button
                  variant={tool === "brush" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTool("brush")}
                >
                  <Paintbrush className="mr-2 h-4 w-4" />
                  Brush
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearMask}
                >
                  <Eraser className="mr-2 h-4 w-4" />
                  Clear Mask
                </Button>
                <div className="flex items-center gap-2 ml-4">
                  <Label htmlFor="brush-size" className="text-sm">Size:</Label>
                  <Slider
                    id="brush-size"
                    min={5}
                    max={100}
                    step={1}
                    value={[brushSize]}
                    onValueChange={(value) => setBrushSize(value[0])}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600 min-w-[40px]">{brushSize}px</span>
                </div>
              </div>
            )}

            {/* Edited Image Preview */}
            {editedImageUrl && (
              <div className="mt-4 p-4 border rounded-lg bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-medium">Edited Result</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadEditedImage}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
                <img 
                  src={editedImageUrl} 
                  alt="Edited result"
                  className="max-w-full max-h-48 object-contain rounded border"
                />
                
                {/* Save to Library Section */}
                <div className="mt-4 space-y-3 border-t pt-4">
                  <Label className="text-sm font-medium">Save to Library</Label>
                  <div>
                    <Label htmlFor="image-title" className="text-xs">Image Title</Label>
                    <Textarea
                      id="image-title"
                      placeholder="Enter a title for your edited image..."
                      value={imageTitle}
                      onChange={(e) => setImageTitle(e.target.value)}
                      className="resize-none mt-1"
                      rows={1}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveImageMutation.mutate()}
                      disabled={saveImageMutation.isPending || !imageTitle.trim() || !prompt.trim()}
                      className="flex-1"
                    >
                      {saveImageMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save to Library"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Controls (40%) */}
          <div className="w-[40%] border-l bg-white dark:bg-gray-950 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-3 m-4 mb-2">
                <TabsTrigger value="inpaint">Inpaint</TabsTrigger>
                <TabsTrigger value="outpaint">Outpaint</TabsTrigger>
                <TabsTrigger value="variation">Variation</TabsTrigger>
              </TabsList>

              <div className="flex-1 p-4 space-y-6">
                <TabsContent value="inpaint" className="space-y-6 mt-0">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Inpainting</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Paint over areas you want to modify, then describe the changes you want.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-prompt" className="text-base font-medium">Edit Instructions</Label>
                      <Textarea
                        id="edit-prompt"
                        placeholder="Describe the changes you want to make in the painted areas..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[120px] mt-2"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Advanced Options</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor="model-select" className="text-xs">Model</Label>
                          <Select value={model} onValueChange={setModel}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getImageModels().map((modelName) => (
                                <SelectItem key={modelName} value={modelName}>
                                  {modelName === "gpt-image-1" ? "DALL-E 3 (Latest)" : 
                                   modelName === "dall-e-3" ? "DALL-E 3" : 
                                   modelName === "dall-e-2" ? "DALL-E 2 (Legacy)" : modelName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="size-select" className="text-xs">Size</Label>
                          <Select value={size} onValueChange={setSize}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="256x256">256×256 (Square)</SelectItem>
                              <SelectItem value="512x512">512×512 (Square)</SelectItem>
                              <SelectItem value="1024x1024">1024×1024 (High Res)</SelectItem>
                              <SelectItem value="1024x1792">1024×1792 (Portrait)</SelectItem>
                              <SelectItem value="1792x1024">1792×1024 (Landscape)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="quality-select" className="text-xs">Quality</Label>
                          <Select value={quality} onValueChange={setQuality}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="hd">HD (Premium)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="outpaint" className="space-y-6 mt-0">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Outpainting</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Extend your image beyond its current boundaries by describing what should be added.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="outpaint-prompt" className="text-base font-medium">Extension Instructions</Label>
                      <Textarea
                        id="outpaint-prompt"
                        placeholder="Describe what should be added around the image..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[120px] mt-2"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="variation" className="space-y-6 mt-0">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Image Variation</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Create a variation of your image based on a text description.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="variation-prompt" className="text-base font-medium">Variation Instructions</Label>
                      <Textarea
                        id="variation-prompt"
                        placeholder="Describe how you want to change the overall image..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[120px] mt-2"
                      />
                    </div>
                  </div>
                </TabsContent>
              </div>

              {/* Action Buttons */}
              <div className="border-t p-4 space-y-2">
                <Button
                  onClick={handleEdit}
                  disabled={mutation.isPending || !prompt.trim() || (activeTab === "inpaint" && !maskData)}
                  className="w-full h-12 text-base"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-5 w-5" />
                      {activeTab === "inpaint" ? "Apply Changes" : 
                       activeTab === "outpaint" ? "Extend Image" : "Create Variation"}
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}