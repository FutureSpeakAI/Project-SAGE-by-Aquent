import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, FileText, Loader2, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ContentType } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentProcessed: (content: string) => void;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  onDocumentProcessed
}: DocumentUploadDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    
    if (file) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExt === 'pdf' || fileExt === 'docx' || fileExt === 'txt') {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("Please upload a PDF, DOCX, or TXT file.");
      }
    }
  };

  // Function to save briefing to the library
  const saveBriefingToLibrary = async (filename: string, content: string) => {
    const title = filename.replace(/\.[^/.]+$/, ""); // Remove file extension
    const metadata = JSON.stringify({ category: "Uploaded Document" });
    
    const newBriefing = {
      title,
      content,
      contentType: ContentType.BRIEFING,
      systemPrompt: null,
      userPrompt: null,
      model: null,
      temperature: null,
      metadata
    };
    
    const response = await fetch('/api/generated-contents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newBriefing),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save briefing to library');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create a form data object to send the file
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Send to the server for processing
      const response = await fetch('/api/process-brief', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process document');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Pass the extracted content to the parent component
        onDocumentProcessed(data.content);
        
        // The briefing is already saved by the server, just refresh the cache
        queryClient.invalidateQueries({ queryKey: ['/api/generated-contents', ContentType.BRIEFING] });
        
        onOpenChange(false);
        setSelectedFile(null);
        
        toast({
          title: "Document processed",
          description: `"${selectedFile.name}" has been processed and saved to your briefing library.`,
        });
      } else {
        throw new Error(data.message || 'Failed to process document');
      }
      
    } catch (err: any) {
      setError(err.message || "Failed to process document");
      console.error('Document upload error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a PDF, DOCX, or TXT file to use as a briefing.
          </DialogDescription>
        </DialogHeader>
        
        <div 
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.docx,.txt"
          />
          
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="rounded-full bg-primary/10 p-3">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="text-sm font-medium">
              {selectedFile ? (
                <p>{selectedFile.name}</p>
              ) : (
                <p>Drag and drop your file here or click to browse</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Supported formats: PDF, DOCX, TXT
            </p>
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}