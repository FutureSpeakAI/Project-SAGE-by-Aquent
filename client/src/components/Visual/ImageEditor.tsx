import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit, Eraser, Plus, Download, Save, Undo, Redo } from 'lucide-react';

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
  const [editPrompt, setEditPrompt] = useState('');
  const [brushSize, setBrushSize] = useState([20]);
  const [editMode, setEditMode] = useState<'inpaint' | 'outpaint' | 'variation'>('inpaint');
  const [isDrawing, setIsDrawing] = useState(false);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  
  const { toast } = useToast();

  // Initialize canvases when image loads
  useEffect(() => {
    if (open && imageUrl) {
      loadImageToCanvas();
    }
  }, [open, imageUrl]);

  const loadImageToCanvas = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!canvas || !maskCanvas) return;

      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;

      // Draw original image
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
      }

      // Initialize mask canvas with white background
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.fillStyle = 'white';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      }

      setOriginalImage(img);
    };
    img.src = imageUrl;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editMode !== 'inpaint') return;
    setIsDrawing(true);
    draw(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || editMode !== 'inpaint') return;
    
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Draw on both canvases
    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    
    if (ctx && maskCtx) {
      // Draw semi-transparent overlay on main canvas
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(x, y, brushSize[0], 0, 2 * Math.PI);
      ctx.fill();

      // Draw black on mask canvas (area to edit)
      maskCtx.globalCompositeOperation = 'source-over';
      maskCtx.fillStyle = 'black';
      maskCtx.beginPath();
      maskCtx.arc(x, y, brushSize[0], 0, 2 * Math.PI);
      maskCtx.fill();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas || !originalImage) return;

    // Reset main canvas to original image
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImage, 0, 0);
    }

    // Reset mask canvas to white
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
      maskCtx.fillStyle = 'white';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    }

    setMaskDataUrl(null);
  };

  // Image editing mutation
  const editImageMutation = useMutation({
    mutationFn: async () => {
      if (!editPrompt.trim()) {
        throw new Error('Please enter a prompt describing your desired changes');
      }

      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!canvas || !maskCanvas) {
        throw new Error('Canvas not initialized');
      }

      let requestData: EditRequest = {
        image: imageUrl,
        prompt: editPrompt,
        model: 'gpt-image-1',
        size: 'auto',
        quality: 'high',
        n: 1
      };

      // For inpainting, include the mask
      if (editMode === 'inpaint') {
        const maskDataURL = maskCanvas.toDataURL('image/png');
        requestData.mask = maskDataURL;
        setMaskDataUrl(maskDataURL);
      }

      const response = await fetch('/api/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...requestData,
          editMode
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to edit image');
      }

      return response.json();
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Image Editor</DialogTitle>
          <DialogDescription>
            Edit your AI-generated image using advanced AI-powered tools
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs value={editMode} onValueChange={(value) => setEditMode(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inpaint">Inpaint</TabsTrigger>
              <TabsTrigger value="outpaint">Outpaint</TabsTrigger>
              <TabsTrigger value="variation">Variation</TabsTrigger>
            </TabsList>

            <TabsContent value="inpaint" className="space-y-4">
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Paint over areas you want to modify, then describe the changes you want.
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Brush Size: {brushSize[0]}px</Label>
                    <Slider
                      value={brushSize}
                      onValueChange={setBrushSize}
                      min={5}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={clearMask}>
                      <Eraser className="mr-2 h-4 w-4" />
                      Clear Mask
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="outpaint" className="space-y-4">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">
                  Extend your image beyond its current boundaries. Describe what should appear in the extended areas.
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="variation" className="space-y-4">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">
                  Create a variation of your image with specific changes. Describe the modifications you want.
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Canvas Area */}
            <Card className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Original Image</Label>
                  <Badge variant="outline">{editMode}</Badge>
                </div>
                
                <div className="relative border rounded-lg overflow-hidden bg-gray-50">
                  <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ display: 'block' }}
                  />
                  <canvas
                    ref={maskCanvasRef}
                    className="absolute inset-0 max-w-full h-auto pointer-events-none"
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
            </Card>

            {/* Controls and Result */}
            <div className="space-y-4">
              <Card className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-prompt">Edit Prompt</Label>
                    <Textarea
                      id="edit-prompt"
                      placeholder="Describe the changes you want to make..."
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      className="min-h-[100px] resize-y"
                    />
                  </div>

                  <Button
                    onClick={() => editImageMutation.mutate()}
                    disabled={editImageMutation.isPending || !editPrompt.trim()}
                    className="w-full bg-[#F15A22] hover:bg-[#e04d15]"
                  >
                    {editImageMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Editing Image...
                      </>
                    ) : (
                      <>
                        <Edit className="mr-2 h-4 w-4" />
                        Apply Changes
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {editedImageUrl && (
                <Card className="p-4">
                  <div className="space-y-4">
                    <Label>Edited Result</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <img
                        src={editedImageUrl}
                        alt="Edited result"
                        className="w-full h-auto"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={downloadEditedImage}
                        className="flex-1"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          // TODO: Save to library functionality
                          toast({
                            title: "Feature coming soon",
                            description: "Saving edited images to library will be available soon.",
                          });
                        }}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save to Library
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}