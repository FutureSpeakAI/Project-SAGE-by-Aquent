import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIContextMenu } from "./AIContextMenu";
import { 
  Trash2, AlertCircle, Download, FileText, 
  File, Copy, RotateCcw 
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ReactQuill from "react-quill";
import 'react-quill/dist/quill.snow.css';
import { exportAsPDF, exportAsDOCX } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";

interface RichOutputPanelProps {
  content: string;
  isLoading: boolean;
  error: string | null;
  onClear: () => void;
  onRetry: () => void;
  apiKey: string;
  model: string;
  temperature: number;
}

export function RichOutputPanel({
  content,
  isLoading,
  error,
  onClear,
  onRetry,
  apiKey,
  model,
  temperature
}: RichOutputPanelProps) {
  const [editableContent, setEditableContent] = useState(content);
  const [selectedText, setSelectedText] = useState("");
  const editorRef = useRef<ReactQuill>(null);
  const { toast } = useToast();

  // Update editable content when content prop changes
  useEffect(() => {
    setEditableContent(content);
  }, [content]);

  // Handle text selection in the editor
  const handleTextSelection = useCallback(() => {
    if (editorRef.current) {
      const selection = editorRef.current.getEditor().getSelection();
      if (selection && selection.length > 0) {
        const text = editorRef.current.getEditor().getText(selection.index, selection.length);
        setSelectedText(text);
      } else {
        setSelectedText("");
      }
    }
  }, []);

  // Process text from AI operations
  const handleProcessedText = useCallback((newText: string, replaceSelection: boolean) => {
    if (editorRef.current && replaceSelection) {
      const selection = editorRef.current.getEditor().getSelection();
      if (selection && selection.length > 0) {
        editorRef.current.getEditor().deleteText(selection.index, selection.length);
        editorRef.current.getEditor().insertText(selection.index, newText);
        setEditableContent(editorRef.current.getEditor().getText());
      } else {
        // If no selection, append to the end
        const length = editorRef.current.getEditor().getLength();
        editorRef.current.getEditor().insertText(length, '\n\n' + newText);
        setEditableContent(editorRef.current.getEditor().getText());
      }
    } else {
      // If not replacing, just set the content
      setEditableContent(newText);
    }
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(editorRef.current?.getEditor().getText() || editableContent)
      .then(() => {
        toast({
          title: "Copied to clipboard",
          description: "Content has been copied to your clipboard."
        });
      })
      .catch(err => {
        console.error("Failed to copy text: ", err);
        toast({
          title: "Copy failed",
          description: "Could not copy to clipboard.",
          variant: "destructive"
        });
      });
  }, [editableContent, toast]);

  const handleExport = useCallback((format: 'pdf' | 'docx') => {
    const text = editorRef.current?.getEditor().getText() || editableContent;
    if (format === 'pdf') {
      exportAsPDF(text);
    } else {
      exportAsDOCX(text);
    }
  }, [editableContent]);

  const hasContent = editableContent && editableContent.trim().length > 0;
  const showEmptyState = !isLoading && !error && !hasContent;
  const showErrorState = !isLoading && error !== null;
  const showContent = !isLoading && !error && hasContent;

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  return (
    <Card className="w-full h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      <CardHeader className="p-4 bg-gray-50 border-b border-gray-200 flex flex-row items-center justify-between">
        <CardTitle className="font-semibold text-gray-700">Generated Output</CardTitle>
        
        {showContent && (
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy to clipboard</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export content</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <File className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('docx')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as DOCX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onClear}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear content</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-auto relative">
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
              <p className="mt-2 text-gray-600 text-sm">Generating content...</p>
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {showEmptyState && (
          <div className="text-center py-12 h-full flex flex-col items-center justify-center">
            <div className="rounded-full bg-gray-100 p-3 mb-4">
              <Trash2 className="text-gray-400 h-6 w-6" />
            </div>
            <p className="text-gray-500">Generated content will appear here</p>
          </div>
        )}
        
        {/* Error state */}
        {showErrorState && (
          <div className="text-center py-12 h-full flex flex-col items-center justify-center">
            <div className="rounded-full bg-red-100 p-3 mb-4">
              <AlertCircle className="text-red-500 h-6 w-6" />
            </div>
            <p className="text-gray-700 font-medium">An error occurred</p>
            <p className="text-gray-500 mt-2">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={onRetry}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
        
        {/* Rich Text Content */}
        {showContent && (
          <AIContextMenu 
            selectedText={selectedText}
            onProcessText={handleProcessedText}
            apiKey={apiKey}
            model={model}
            temperature={temperature}
          >
            <div 
              className="p-4" 
              onMouseUp={handleTextSelection} 
              onKeyUp={handleTextSelection}
            >
              <ReactQuill
                ref={editorRef}
                value={editableContent}
                onChange={setEditableContent}
                modules={modules}
                placeholder="Generated content will appear here and can be edited..."
                className="min-h-[400px]"
              />
            </div>
          </AIContextMenu>
        )}
      </CardContent>
    </Card>
  );
}