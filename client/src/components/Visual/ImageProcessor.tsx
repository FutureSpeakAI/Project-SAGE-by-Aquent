import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface ImageProcessorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
}

export function ImageProcessor({
  open,
  onOpenChange,
  imageUrl
}: ImageProcessorProps) {
  const [format, setFormat] = useState('png');
  const [size, setSize] = useState('4x');
  const [customWidth, setCustomWidth] = useState(4096);
  const [customHeight, setCustomHeight] = useState(4096);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();
  
  // Calculate dimensions based on size selection
  const getDimensions = () => {
    switch(size) {
      case '2x': return { width: 2048, height: 2048 };
      case '4x': return { width: 4096, height: 4096 };
      case 'custom': return { width: customWidth, height: customHeight };
      default: return { width: 4096, height: 4096 };
    }
  };
  
  // Handle image processing
  const handleProcess = async () => {
    try {
      setIsProcessing(true);
      
      const dimensions = getDimensions();
      
      // Create a direct download link
      const response = await fetch('/api/image-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          format,
          width: dimensions.width,
          height: dimensions.height,
          quality: 100 // Use maximum quality by default
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Processing failed');
      }
      
      // Create download from blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed-image.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Processing complete',
        description: 'Your image has been processed and downloaded.',
      });
      
      onOpenChange(false);
      
    } catch (error) {
      console.error('Image processing error:', error);
      toast({
        title: 'Processing failed',
        description: error instanceof Error ? error.message : 'Failed to process image',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Image</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Format selection */}
          <div className="space-y-2">
            <Label>Output Format</Label>
            <RadioGroup value={format} onValueChange={setFormat} className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tiff" id="tiff" />
                <Label htmlFor="tiff">TIFF</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="svg" id="svg" />
                <Label htmlFor="svg">SVG</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="png" id="png" />
                <Label htmlFor="png">PNG-24</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="jpeg" id="jpeg" />
                <Label htmlFor="jpeg">JPEG</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Size selection */}
          <div className="space-y-2">
            <Label>Image Size</Label>
            <RadioGroup value={size} onValueChange={setSize} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2x" id="2x" />
                <Label htmlFor="2x">2x (2048×2048)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="4x" id="4x" />
                <Label htmlFor="4x">4x (4096×4096)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Custom:</Label>
                <Input 
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Number(e.target.value))}
                  disabled={size !== 'custom'}
                  className="w-20 ml-2"
                  type="number"
                />
                <span>×</span>
                <Input 
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  disabled={size !== 'custom'}
                  className="w-20"
                  type="number"
                />
              </div>
            </RadioGroup>
          </div>
          
          {/* Format-specific note */}
          {format === 'svg' && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <p>SVG conversion works best with simple images and solid colors. Complex images may not convert well.</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleProcess}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Process'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}