import { useState, useRef, useCallback } from "react";
import { X, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface ImageUploaderProps {
  onImagesChange: (images: { file: File; base64: string }[]) => void;
  maxImages?: number;
}

export function ImageUploader({ onImagesChange, maxImages = 4 }: ImageUploaderProps) {
  const [images, setImages] = useState<{ file: File; base64: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image validation requirements
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  const SUPPORTED_FORMATS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  const validateImage = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 20MB limit.`,
          variant: "destructive",
        });
        resolve(false);
        return;
      }

      // Check file type
      if (!SUPPORTED_FORMATS.includes(file.type)) {
        toast({
          title: "Unsupported file format",
          description: `${file.name} is not a supported format (JPG, PNG, WEBP, GIF).`,
          variant: "destructive",
        });
        resolve(false);
        return;
      }

      // Check if it's an animated GIF (not supported)
      if (file.type === "image/gif") {
        // We can't reliably detect animated GIFs on the client side without loading the entire file
        // So we'll just show a warning about non-animated GIFs
        toast({
          title: "GIF Warning",
          description: "Only non-animated GIFs are supported. Animated GIFs will be rejected by the API."
        });
      }

      // Check image dimensions
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        
        // OpenAI's image API supports up to 2000px on the long side, with 768px on the short side
        if (img.width > 2000 || img.height > 2000) {
          toast({
            title: "Image too large",
            description: `Image dimensions exceed 2000px. The image will be resized.`
          });
        }
        
        // The dimensions are fine, so we can proceed
        resolve(true);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        toast({
          title: "Invalid image",
          description: `${file.name} could not be loaded as an image.`,
          variant: "destructive",
        });
        resolve(false);
      };
      
      img.src = objectUrl;
    });
  };

  const processFile = async (file: File) => {
    const isValid = await validateImage(file);
    if (!isValid) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      
      setImages((prev) => {
        // Create a new array with the new image added
        const newImagesArray = [...prev, { file, base64: base64String }];
        
        // Call the callback to notify parent component
        onImagesChange(newImagesArray);
        
        return newImagesArray;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (images.length >= maxImages) {
        toast({
          title: "Maximum images reached",
          description: `You can only upload up to ${maxImages} reference images.`,
          variant: "destructive",
        });
        return;
      }

      // Get the files from the drop event
      const files = Array.from(e.dataTransfer.files);
      
      // Only process images up to the max limit
      const availableSlots = maxImages - images.length;
      const imagesToProcess = files.slice(0, availableSlots);
      
      if (files.length > availableSlots) {
        toast({
          title: "Too many images",
          description: `Only ${availableSlots} image(s) will be processed. Maximum is ${maxImages}.`
        });
      }
      
      // Process each file
      for (const file of imagesToProcess) {
        await processFile(file);
      }
    },
    [images, maxImages, onImagesChange]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    if (images.length >= maxImages) {
      toast({
        title: "Maximum images reached",
        description: `You can only upload up to ${maxImages} reference images.`,
        variant: "destructive",
      });
      return;
    }

    // Get the files from the input
    const files = Array.from(e.target.files);
    
    // Only process images up to the max limit
    const availableSlots = maxImages - images.length;
    const imagesToProcess = files.slice(0, availableSlots);
    
    if (files.length > availableSlots) {
      toast({
        title: "Too many images",
        description: `Only ${availableSlots} image(s) will be processed. Maximum is ${maxImages}.`
      });
    }
    
    // Process each file
    for (const file of imagesToProcess) {
      await processFile(file);
    }
    
    // Reset the input value so the same file can be selected again
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      newImages.splice(index, 1);
      onImagesChange(newImages);
      return newImages;
    });
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors",
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center py-4">
          <Upload className="h-10 w-10 text-gray-400 mb-2" />
          <p className="text-sm font-medium mb-1">
            Drag and drop image or click to browse
          </p>
          <p className="text-xs text-gray-500">
            PNG, JPG, WEBP, GIF (non-animated) up to 20MB
          </p>
          {images.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              {images.length} of {maxImages} images uploaded
            </p>
          )}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          onChange={handleFileSelect}
        />
      </div>

      {/* Image Preview Gallery */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          {images.map((image, index) => (
            <Card key={index} className="relative overflow-hidden group">
              <img
                src={image.base64}
                alt={`Reference ${index + 1}`}
                className="w-full h-32 object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 absolute top-2 right-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black bg-opacity-40 text-white text-xs truncate">
                {image.file.name}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Image requirements info */}
      <div className="flex items-start space-x-2 text-xs text-gray-500 mt-2">
        <AlertCircle className="h-4 w-4 text-gray-400 mt-0.5" />
        <div>
          <p>Image requirements:</p>
          <ul className="list-disc list-inside ml-2">
            <li>Up to {maxImages} reference images</li>
            <li>Maximum 20MB per image</li>
            <li>Supported formats: PNG, JPG, WEBP, non-animated GIF</li>
            <li>Images with text may result in better image generations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}