import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

interface BriefUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (text: string) => void;
}

export function BriefUploadDialog({ open, onClose, onUpload }: BriefUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleUploadFile = async () => {
    if (!file && !text) {
      toast({
        title: "No input provided",
        description: "Please upload a file or enter text to proceed.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      if (file) {
        // If a file was uploaded, send it to the server
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/process-brief", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Error uploading file: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success) {
          // Pass the generated prompt back to the parent component
          onUpload(data.prompt);
          resetForm();
        } else {
          throw new Error(data.message || "Failed to process brief");
        }
      } else if (text) {
        // If text was entered directly, interpret it
        const response = await fetch("/api/interpret-brief", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            brief: text,
            model: "gpt-4o", // default to most capable model
          }),
        });

        if (!response.ok) {
          throw new Error(`Error interpreting brief: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success) {
          // Pass the generated prompt back to the parent component
          onUpload(data.prompt);
          resetForm();
        } else {
          throw new Error(data.message || "Failed to interpret brief");
        }
      }
    } catch (error) {
      console.error("Error processing brief:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process brief",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setText("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Upload Creative Brief</DialogTitle>
          <DialogDescription>
            Upload a document or enter text describing your needs. We'll analyze it and generate an optimal image prompt.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="file" className="font-medium">
              Upload a brief document
            </Label>
            <Input
              id="file"
              type="file"
              accept=".txt,.pdf,.docx"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Accepts .txt, .pdf, or .docx files (max 5MB)
            </p>
          </div>

          <div className="flex items-center">
            <div className="flex-grow h-px bg-border" />
            <p className="mx-2 text-xs text-muted-foreground">OR</p>
            <div className="flex-grow h-px bg-border" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="brief-text" className="font-medium">
              Enter brief text directly
            </Label>
            <textarea
              id="brief-text"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Paste your creative brief content here..."
              value={text}
              onChange={handleTextChange}
              disabled={isUploading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetForm} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUploadFile} disabled={isUploading} className="gap-2">
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Process Brief
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}