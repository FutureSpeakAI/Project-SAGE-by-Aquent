import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Download, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

interface ImageProcessorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
}

export function ImageProcessor({ open, onOpenChange, imageUrl }: ImageProcessorProps) {
  // Format selection state
  const [format, setFormat] = useState<string>("png");
  const [size, setSize] = useState<string>("2x");
  const [customWidth, setCustomWidth] = useState<number>(2048);
  const [customHeight, setCustomHeight] = useState<number>(2048);

  const { toast } = useToast();

  // Process image mutation
  const processImageMutation = useMutation({
    mutationFn: async () => {
      if (!imageUrl) {
        throw new Error("No image URL provided");
      }

      // Calculate target size based on selection
      let targetWidth = 0;
      let targetHeight = 0;

      if (size === "custom") {
        targetWidth = customWidth;
        targetHeight = customHeight;
      } else {
        // Parse original dimensions from the URL or use default values
        // For simplicity, we'll just use scaling factors as the size selection is "2x" or "4x"
        const baseSize = 1024; // Most DALL-E images start at 1024x1024
        const scaleFactor = size === "2x" ? 2 : 4;
        targetWidth = baseSize * scaleFactor;
        targetHeight = baseSize * scaleFactor;
      }

      // Ensure dimensions are within reasonable limits
      if (targetWidth > 4096 || targetHeight > 4096) {
        toast({
          title: "Size limit exceeded",
          description: "Max dimensions are 4096x4096",
          variant: "destructive",
        });
        targetWidth = Math.min(targetWidth, 4096);
        targetHeight = Math.min(targetHeight, 4096);
      }

      // Prepare the request
      const formData = new FormData();

      // If imageUrl is a base64 data URL, we need to convert it to a Blob
      if (imageUrl.startsWith('data:')) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        formData.append('image', blob, 'image.png');
      } else {
        // For remote URLs, we'll send the URL for the server to fetch
        formData.append('imageUrl', imageUrl);
      }

      formData.append('format', format);
      formData.append('width', targetWidth.toString());
      formData.append('height', targetHeight.toString());

      // Process special options for SVG format
      if (format === 'svg') {
        formData.append('svgOptions', JSON.stringify({
          threshold: 180,
          color: '#000000',
          background: 'transparent'
        }));
      }

      // Send to the server
      const response = await axios.post('/api/process-image', formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Create a download URL for the processed image
      const outputBlob = response.data;
      const downloadUrl = URL.createObjectURL(outputBlob);

      // Determine file extension
      const fileExt = format === 'svg' ? 'svg' : 
                     format === 'tiff' ? 'tiff' : 
                     format === 'jpeg' ? 'jpg' : 
                     format === 'ai' ? 'ai' : 'png';

      // Create a temporary anchor and trigger download
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `processed_image_${new Date().getTime()}.${fileExt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Cleanup
      URL.revokeObjectURL(downloadUrl);
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Image processed",
        description: `Your image has been processed and downloaded.`,
      });
      // Close the dialog after successful processing
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Image processing error:", error);
      toast({
        title: "Processing failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process Image</DialogTitle>
          <DialogDescription>
            Convert your AI-generated image to professional formats and sizes.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <Tabs defaultValue="format" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="format">Format</TabsTrigger>
              <TabsTrigger value="size">Size</TabsTrigger>
            </TabsList>

            <TabsContent value="format" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Output Format</Label>
                <RadioGroup 
                  defaultValue="png" 
                  className="grid grid-cols-2 gap-4"
                  value={format}
                  onValueChange={setFormat}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="png" id="png" />
                    <Label htmlFor="png" className="font-normal">PNG-24</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="jpeg" id="jpeg" />
                    <Label htmlFor="jpeg" className="font-normal">JPEG</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tiff" id="tiff" />
                    <Label htmlFor="tiff" className="font-normal">TIFF</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="svg" id="svg" />
                    <Label htmlFor="svg" className="font-normal">SVG</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  {format === 'png' && "High-quality PNG with transparency support, ideal for web and print."}
                  {format === 'jpeg' && "Compressed format for photographs and gradients, no transparency."}
                  {format === 'tiff' && "Professional print format with full quality preservation."}
                  {format === 'svg' && "Vector format for scaling to any size without quality loss."}
                </Label>
              </div>
            </TabsContent>

            <TabsContent value="size" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Output Size</Label>
                <RadioGroup 
                  defaultValue="2x" 
                  className="grid grid-cols-3 gap-4"
                  value={size}
                  onValueChange={setSize}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2x" id="size2x" />
                    <Label htmlFor="size2x" className="font-normal">2× (2048px)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="4x" id="size4x" />
                    <Label htmlFor="size4x" className="font-normal">4× (4096px)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="sizeCustom" />
                    <Label htmlFor="sizeCustom" className="font-normal">Custom</Label>
                  </div>
                </RadioGroup>
              </div>

              {size === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customWidth">Width (px)</Label>
                    <Input 
                      id="customWidth" 
                      type="number" 
                      value={customWidth}
                      onChange={(e) => setCustomWidth(parseInt(e.target.value))}
                      max={4096}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customHeight">Height (px)</Label>
                    <Input 
                      id="customHeight" 
                      type="number" 
                      value={customHeight}
                      onChange={(e) => setCustomHeight(parseInt(e.target.value))}
                      max={4096}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">
                  {size === 'custom' 
                    ? "Custom dimensions (maximum 4096×4096)" 
                    : size === '2x'
                      ? "Double the original size for high-resolution displays."
                      : "Quadruple the original size for print and large formats."}
                </Label>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => processImageMutation.mutate()}
            disabled={processImageMutation.isPending || !imageUrl}
            className="bg-green-600 hover:bg-green-700"
          >
            {processImageMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Process & Download
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}