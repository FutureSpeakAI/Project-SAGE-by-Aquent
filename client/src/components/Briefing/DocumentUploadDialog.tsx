import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, FileText, Loader2, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentProcessed: (content: string) => void;
  apiKey: string;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  onDocumentProcessed,
  apiKey
}: DocumentUploadDialogProps) {
  const { toast } = useToast();
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

  const handleUpload = async () => {
    if (!selectedFile || !apiKey) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create a form data object to send the file
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('apiKey', apiKey);
      
      // Extract the file extension
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      
      // Read file content - in a production app, this would be handled by the server
      // Here we're doing client-side processing as a simplification
      const fileContent = await readFileContent(selectedFile, fileExt as string);
      
      // For now, we'll just pass the text content directly
      // In a real implementation, this would be an API call to process the document
      setTimeout(() => {
        onDocumentProcessed(fileContent);
        setIsLoading(false);
        onOpenChange(false);
        
        toast({
          title: "Document uploaded",
          description: "Your document has been successfully processed.",
        });
      }, 1500); // Simulate processing time
      
    } catch (err: any) {
      setError(err.message || "Failed to process document");
      setIsLoading(false);
    }
  };
  
  // Function to read file content based on type
  const readFileContent = (file: File, fileExt: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          // For simplicity, we're just returning the text content
          // In a real app, you would have server-side processing for PDFs and DOCXs
          if (fileExt === 'txt' || fileExt === 'pdf' || fileExt === 'docx') {
            const content = e.target?.result as string;
            resolve(content);
          } else {
            reject(new Error("Unsupported file format"));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      
      reader.readAsText(file);
    });
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
            disabled={!selectedFile || isLoading || !apiKey}
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