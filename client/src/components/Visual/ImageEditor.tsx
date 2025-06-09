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
  const [isDrawing, setIsDrawing] = useState(false);
  const [maskData, setMaskData] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [activeTab, setActiveTab] = useState("inpaint");
  const [brushSize, setBrushSize] = useState(20);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [zoom, setZoom] = useState(1);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [model, setModel] = useState("dall-e-2");
  const [size, setSize] = useState("1024x1024");
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  const [imageLoadStatus, setImageLoadStatus] = useState<"loading" | "loaded" | "error">("loading");

  // Debug image URL
  useEffect(() => {
    if (open && imageUrl) {
      console.log("ImageEditor received imageUrl:", imageUrl);
      console.log("ImageEditor received imageId:", imageId);
      setImageLoadStatus("loading");
    }
  }, [open, imageUrl, imageId]);

  // Load and draw the original image on canvas
  useEffect(() => {
    if (!open || !imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    console.log("Loading image:", imageUrl);

    const img = new Image();
    
    // Try without crossOrigin first for local images
    img.onload = () => {
      console.log("Image loaded successfully:", img.width, "x", img.height);
      setImageLoadStatus("loaded");
      
      // Set fixed canvas size
      canvas.width = 600;
      canvas.height = 600;
      
      // Calculate scaling to fit image in canvas while maintaining aspect ratio
      const scaleX = canvas.width / img.width;
      const scaleY = canvas.height / img.height;
      const scale = Math.min(scaleX, scaleY);
      
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const offsetX = (canvas.width - scaledWidth) / 2;
      const offsetY = (canvas.height - scaledHeight) / 2;
      
      // Clear canvas with white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw image centered on canvas
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      
      console.log("Image drawn on canvas at:", offsetX, offsetY, scaledWidth, scaledHeight);
    };
    
    img.onerror = (error) => {
      console.error("Failed to load image:", imageUrl, error);
      
      // Try with crossOrigin for external images
      const img2 = new Image();
      img2.crossOrigin = "anonymous";
      
      img2.onload = () => {
        console.log("Image loaded with CORS:", img2.width, "x", img2.height);
        
        canvas.width = 600;
        canvas.height = 600;
        
        const scaleX = canvas.width / img2.width;
        const scaleY = canvas.height / img2.height;
        const scale = Math.min(scaleX, scaleY);
        
        const scaledWidth = img2.width * scale;
        const scaledHeight = img2.height * scale;
        const offsetX = (canvas.width - scaledWidth) / 2;
        const offsetY = (canvas.height - scaledHeight) / 2;
        
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img2, offsetX, offsetY, scaledWidth, scaledHeight);
      };
      
      img2.onerror = () => {
        console.error("Failed to load image even with CORS:", imageUrl);
        setImageLoadStatus("error");
        
        // Show placeholder with error message
        canvas.width = 600;
        canvas.height = 600;
        ctx.fillStyle = "#f3f4f6";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "#6b7280";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Failed to load image", canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText("Please try a different image", canvas.width / 2, canvas.height / 2 + 10);
        
        toast({
          title: "Error loading image",
          description: "Could not load the image for editing. Please try a different image.",
          variant: "destructive"
        });
      };
      
      img2.src = imageUrl;
    };
    
    // Start loading the image
    img.src = imageUrl;
  }, [open, imageUrl, toast]);

  // Drawing functions for inpainting mask
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTab !== "inpaint" || tool !== "brush") return;
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTab !== "inpaint") return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    setMousePos({ x, y });
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Capture mask data
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setMaskData(canvas.toDataURL());
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Redraw original image
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scaleX = canvas.width / img.width;
      const scaleY = canvas.height / img.height;
      const scale = Math.min(scaleX, scaleY);
      
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const offsetX = (canvas.width - scaledWidth) / 2;
      const offsetY = (canvas.height - scaledHeight) / 2;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
    };
    img.src = imageUrl;
    
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
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center">
            <Edit className="mr-2 h-5 w-5" />
            AI Image Editor
          </DialogTitle>
          <DialogDescription>
            Edit your AI-generated image using advanced AI-powered tools
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[calc(95vh-120px)]">
          {/* Left Panel - Image Canvas (60%) */}
          <div className="w-[60%] bg-gray-50 dark:bg-gray-900 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg font-medium">Original Image</Label>
              <div className="flex gap-2">
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
                {/* Debug: Show image URL and status */}
                {imageLoadStatus === "loading" && (
                  <div className="absolute top-2 left-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs z-10">
                    Loading...
                  </div>
                )}
                {imageLoadStatus === "error" && (
                  <div className="absolute top-2 left-2 bg-red-100 text-red-800 px-2 py-1 rounded text-xs z-10">
                    Load Error
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
                  width={600}
                  height={600}
                  className="border border-gray-200 dark:border-gray-700 rounded cursor-crosshair shadow-lg"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    display: imageLoadStatus === "error" ? 'none' : 'block'
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
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="model-select" className="text-xs">Model</Label>
                          <Select value={model} onValueChange={setModel}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dall-e-2">DALL-E 2</SelectItem>
                              <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
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
                              <SelectItem value="256x256">256×256</SelectItem>
                              <SelectItem value="512x512">512×512</SelectItem>
                              <SelectItem value="1024x1024">1024×1024</SelectItem>
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