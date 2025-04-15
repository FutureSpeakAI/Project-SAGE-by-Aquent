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
    // Process the content to preserve formatting
    if (content) {
      // First, handle common markdown-like formatting
      let enhancedContent = content
        // Handle titles with asterisks (bold)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Handle emphasis with single asterisks (italic)
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Handle titles that start with "Title:" or "# "
        .replace(/^(Title:)(.*?)$/gim, '<h1>$2</h1>')
        .replace(/^(#{1}\s+)(.*?)$/gim, '<h1>$2</h1>')
        .replace(/^(#{2}\s+)(.*?)$/gim, '<h2>$2</h2>')
        .replace(/^(#{3}\s+)(.*?)$/gim, '<h3>$3</h3>');

      // Split by paragraphs - looking for either single or double newlines
      const paragraphs = enhancedContent.split(/\n{2,}/).filter(p => p.trim());
      
      // Process each paragraph, preserving any already-converted HTML tags
      const processedContent = paragraphs.map(para => {
        // Skip if paragraph is already fully wrapped in HTML
        if (
          (para.startsWith('<h1>') && para.endsWith('</h1>')) ||
          (para.startsWith('<h2>') && para.endsWith('</h2>')) ||
          (para.startsWith('<h3>') && para.endsWith('</h3>'))
        ) {
          return para;
        }
        
        // Handle multiple lines within a paragraph (single newlines)
        const lines = para.split('\n');
        if (lines.length > 1) {
          return lines.map(line => {
            // Skip if line is already in HTML
            if (
              (line.startsWith('<h') && line.endsWith('</h')) ||
              (line.startsWith('<p>') && line.endsWith('</p>'))
            ) {
              return line;
            }
            return `<p>${line}</p>`;
          }).join('');
        }
        
        // Simple paragraph
        return `<p>${para}</p>`;
      }).join('');
        
      // Replace consecutive <p></p> tags that might have been created
      const cleanedContent = processedContent.replace(/<\/p>\s*<p>/g, '</p><p>');
      
      setEditableContent(cleanedContent);
    } else {
      setEditableContent('');
    }
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
    // Process the text to convert markdown to HTML
    const processFormattedText = (text: string) => {
      // First, handle common markdown-like formatting
      let enhancedContent = text
        // Handle titles with asterisks (bold)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Handle emphasis with single asterisks (italic)
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Handle titles that start with "Title:" or "# "
        .replace(/^(Title:)(.*?)$/gim, '<h1>$2</h1>')
        .replace(/^(#{1}\s+)(.*?)$/gim, '<h1>$2</h1>')
        .replace(/^(#{2}\s+)(.*?)$/gim, '<h2>$2</h2>')
        .replace(/^(#{3}\s+)(.*?)$/gim, '<h3>$3</h3>');

      // Split by paragraphs - looking for either single or double newlines
      const paragraphs = enhancedContent.split(/\n{2,}/).filter(p => p.trim());
      
      // Process each paragraph, preserving any already-converted HTML tags
      const processedContent = paragraphs.map(para => {
        // Skip if paragraph is already fully wrapped in HTML
        if (
          (para.startsWith('<h1>') && para.endsWith('</h1>')) ||
          (para.startsWith('<h2>') && para.endsWith('</h2>')) ||
          (para.startsWith('<h3>') && para.endsWith('</h3>'))
        ) {
          return para;
        }
        
        // Handle multiple lines within a paragraph (single newlines)
        const lines = para.split('\n');
        if (lines.length > 1) {
          return lines.map(line => {
            // Skip if line is already in HTML
            if (
              (line.startsWith('<h') && line.endsWith('</h')) ||
              (line.startsWith('<p>') && line.endsWith('</p>'))
            ) {
              return line;
            }
            return `<p>${line}</p>`;
          }).join('');
        }
        
        // Simple paragraph
        return `<p>${para}</p>`;
      }).join('');
      
      // Replace consecutive <p></p> tags that might have been created
      return processedContent.replace(/<\/p>\s*<p>/g, '</p><p>');
    };

    const formattedNewText = processFormattedText(newText);
    
    if (editorRef.current && replaceSelection) {
      const selection = editorRef.current.getEditor().getSelection();
      if (selection && selection.length > 0) {
        // Use the formatted HTML content
        editorRef.current.getEditor().deleteText(selection.index, selection.length);
        editorRef.current.getEditor().clipboard.dangerouslyPasteHTML(selection.index, formattedNewText);
        
        // Update the state with the full content
        setEditableContent(editorRef.current.getEditor().root.innerHTML);
      } else {
        // If no selection, append to the end
        const length = editorRef.current.getEditor().getLength();
        // First add newlines
        editorRef.current.getEditor().insertText(length, '\n\n');
        // Then paste the HTML content
        editorRef.current.getEditor().clipboard.dangerouslyPasteHTML(length + 2, formattedNewText);
        
        // Update the state with the full content
        setEditableContent(editorRef.current.getEditor().root.innerHTML);
      }
    } else {
      // If not replacing, just set the content with formatting
      setEditableContent(formattedNewText);
    }
  }, []);

  const handleCopy = useCallback(() => {
    // Get plain text content from the editor to preserve formatting in a readable way
    const text = editorRef.current?.getEditor().getText() || '';
    
    navigator.clipboard.writeText(text)
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
  }, [toast]);

  const handleExport = useCallback((format: 'pdf' | 'docx') => {
    // For export, we want to get the raw text with newlines preserved
    const text = editorRef.current?.getEditor().getText() || '';
    
    // Extract a potential title from the text (first line if it looks like a title)
    const lines = text.split('\n');
    let title = "Generated Content";
    let contentToExport = text;
    
    // If the first line is short and has "title" in it or is wrapped with asterisks, use it as title
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (
        firstLine.toLowerCase().includes("title:") || 
        (firstLine.startsWith("**") && firstLine.endsWith("**")) ||
        firstLine.length < 50 // Simple heuristic for title length
      ) {
        title = firstLine.replace(/^\*\*|\*\*$/g, '').replace(/^title:\s*/i, '');
        contentToExport = lines.slice(1).join('\n').trim();
      }
    }
    
    if (format === 'pdf') {
      exportAsPDF(contentToExport, title);
    } else {
      exportAsDOCX(contentToExport, title);
    }
  }, []);

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