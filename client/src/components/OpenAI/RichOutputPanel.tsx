import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AIContextMenu } from "./AIContextMenu";
import { SavedContentLibrary } from "./SavedContentLibrary";
import { 
  Trash2, AlertCircle, Download, FileText, 
  File, Copy, RotateCcw, Code, Users, Save,
  BookmarkIcon, Bookmark, Maximize2, Minimize2
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
import { exportAsPDF, exportAsDOCX, exportAsHTML } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import { GeneratedContent } from "@shared/schema";
import { SavedPersona } from "@/lib/types";

interface RichOutputPanelProps {
  content: string;
  isLoading: boolean;
  error: string | null;
  onClear: () => void;
  onRetry: () => void;
  model: string;
  temperature: number;
  onOpenPersonaLibrary?: () => void;
  personas?: SavedPersona[];
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  userPrompt?: string; // Add user prompt to detect briefing content
  systemPrompt?: string; // Add system prompt for metadata
}

export function RichOutputPanel({
  content,
  isLoading,
  error,
  onClear,
  onRetry,
  model,
  temperature,
  onOpenPersonaLibrary,
  personas = [],
  isFullScreen = false,
  onToggleFullScreen,
  userPrompt = '',
  systemPrompt = ''
}: RichOutputPanelProps) {
  const [editableContent, setEditableContent] = useState(content);
  const [selectedText, setSelectedText] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [contentTitle, setContentTitle] = useState("");
  const [savedContentLibraryOpen, setSavedContentLibraryOpen] = useState(false);
  const editorRef = useRef<ReactQuill>(null);
  const { toast } = useToast();

  // Manage body scroll state for full-screen mode
  useEffect(() => {
    if (isFullScreen) {
      // Prevent body scrolling when in full-screen mode
      document.body.classList.add('no-scroll');
      // Prevent scrolling on the html element as well
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Restore body scrolling when exiting full-screen mode
      document.body.classList.remove('no-scroll');
      document.documentElement.style.overflow = '';
    }

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.classList.remove('no-scroll');
      document.documentElement.style.overflow = '';
    };
  }, [isFullScreen]);

  // Update editable content when content prop changes
  useEffect(() => {
    // Process the content to preserve formatting
    if (content) {
      // First, clean any markdown code blocks and trailing commentary
      let cleanedContent = content;
      
      // Remove starting ```html or ``` if present (common with code-like responses)
      cleanedContent = cleanedContent.replace(/^```(?:html|markdown|md|json|javascript|js|typescript|ts|css|jsx|tsx|python|py)?\s*\n?/i, '');
      
      // Handle any code block endings and remove everything after them (often commentary)
      const codeBlockEndMatch = cleanedContent.match(/```[\s\S]*$/i);
      if (codeBlockEndMatch && codeBlockEndMatch.index) {
        cleanedContent = cleanedContent.slice(0, codeBlockEndMatch.index);
      }
      
      // Remove common AI commentary that can appear after the main output
      const commentPatterns = [
        /\n+[\s\n]*In summary[\s\S]*$/i,
        /\n+[\s\n]*To summarize[\s\S]*$/i,
        /\n+[\s\n]*I hope (this|these|that)[\s\S]*$/i, 
        /\n+[\s\n]*Hope (this|these|that)[\s\S]*$/i,
        /\n+[\s\n]*Let me know[\s\S]*$/i,
        /\n+[\s\n]*Please let me know[\s\S]*$/i,
        /\n+[\s\n]*Is there anything else[\s\S]*$/i,
        /\n+[\s\n]*Would you like me to[\s\S]*$/i,
        /\n+[\s\n]*Feel free to[\s\S]*$/i,
        /\n+[\s\n]*Do you want me to[\s\S]*$/i,
        /\n+[\s\n]*If you need any changes[\s\S]*$/i,
        /\n+[\s\n]*If you have any questions[\s\S]*$/i,
        /\n+[\s\n]*If you need more[\s\S]*$/i,
        /\n+[\s\n]*These (templates|examples|samples)[\s\S]*$/i
      ];
      
      // Apply each pattern
      for (const pattern of commentPatterns) {
        const match = cleanedContent.match(pattern);
        if (match && match.index) {
          cleanedContent = cleanedContent.slice(0, match.index);
        }
      }
      
      // Now format with HTML
      let enhancedContent = cleanedContent
        // Handle titles with asterisks (bold)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Handle emphasis with single asterisks (italic)
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Handle titles that start with "Title:" or "# "
        .replace(/^(Title:)(.*?)$/gim, '<h1>$2</h1>')
        .replace(/^(#{1}\s+)(.*?)$/gim, '<h1>$2</h1>')
        .replace(/^(#{2}\s+)(.*?)$/gim, '<h2>$2</h2>')
        .replace(/^(#{3}\s+)(.*?)$/gim, '<h3>$3</h3>');

      // Fix lists - convert plain bullet lists into HTML lists
      
      // Convert bullet points to list items
      enhancedContent = enhancedContent.replace(/\n\s*•\s*(.*?)(?=\n|$)/g, '\n<li>$1</li>');
      
      // Convert numbered points to list items (1. 2. 3. etc)
      enhancedContent = enhancedContent.replace(/\n\s*(\d+)\.\s*(.*?)(?=\n|$)/g, '\n<li>$2</li>');
      
      // Helper function to wrap list items in proper list tags
      const wrapListItems = (content: string): string => {
        let modified = content;
        // Find potential list items
        const listItemRegex = /<li>.*?<\/li>/g;
        const listItems = content.match(listItemRegex);
        
        if (listItems) {
          // Identify consecutive list items
          let consecutiveItems = '';
          let count = 0;
          
          for (let i = 0; i < listItems.length; i++) {
            if (i > 0 && content.indexOf(listItems[i]) - 
                (content.indexOf(listItems[i-1]) + listItems[i-1].length) < 10) {
              // These list items are consecutive or close
              if (count === 0) {
                consecutiveItems = listItems[i-1];
                count = 1;
              }
              consecutiveItems += listItems[i];
              count++;
            } else if (count > 0) {
              // We found the end of a sequence - wrap it
              if (count > 1) {
                // Determine if these were numbered items originally
                const originalContext = content.substring(
                  Math.max(0, content.indexOf(consecutiveItems) - 20),
                  content.indexOf(consecutiveItems)
                );
                
                const isNumbered = /\d+\.\s/.test(originalContext);
                const tagName = isNumbered ? 'ol' : 'ul';
                
                modified = modified.replace(consecutiveItems, 
                  `<${tagName}>\n${consecutiveItems}\n</${tagName}>`);
              }
              consecutiveItems = '';
              count = 0;
            }
          }
          
          // Handle the last sequence if there is one
          if (count > 1) {
            const originalContext = content.substring(
              Math.max(0, content.indexOf(consecutiveItems) - 20),
              content.indexOf(consecutiveItems)
            );
            
            const isNumbered = /\d+\.\s/.test(originalContext);
            const tagName = isNumbered ? 'ol' : 'ul';
            
            modified = modified.replace(consecutiveItems, 
              `<${tagName}>\n${consecutiveItems}\n</${tagName}>`);
          }
        }
        
        return modified;
      };
      
      enhancedContent = wrapListItems(enhancedContent);

      // Split by paragraphs - looking for either single or double newlines
      const paragraphs = enhancedContent.split(/\n{2,}/).filter(p => p.trim());
      
      // Process each paragraph, preserving any already-converted HTML tags
      const processedContent = paragraphs.map(para => {
        // Skip if paragraph is already fully wrapped in HTML
        if (
          (para.startsWith('<h1>') && para.endsWith('</h1>')) ||
          (para.startsWith('<h2>') && para.endsWith('</h2>')) ||
          (para.startsWith('<h3>') && para.endsWith('</h3>')) ||
          (para.startsWith('<ul>') && para.endsWith('</ul>')) ||
          (para.startsWith('<ol>') && para.endsWith('</ol>'))
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
              (line.startsWith('<p>') && line.endsWith('</p>')) ||
              (line.startsWith('<li>') && line.endsWith('</li>'))
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
      const finalContent = processedContent.replace(/<\/p>\s*<p>/g, '</p><p>');
      
      setEditableContent(finalContent);
    } else {
      setEditableContent('');
    }
  }, [content]);

  // Store the current selection for use in context menu
  const [currentSelection, setCurrentSelection] = useState<{ index: number, length: number } | null>(null);
  
  // Handle text selection in the editor
  const handleTextSelection = useCallback(() => {
    if (editorRef.current) {
      const selection = editorRef.current.getEditor().getSelection();
      if (selection && selection.length > 0) {
        const text = editorRef.current.getEditor().getText(selection.index, selection.length);
        // Save both the selected text and the selection range
        setSelectedText(text);
        setCurrentSelection({ index: selection.index, length: selection.length });
        console.log("Selection saved:", { index: selection.index, length: selection.length, text });
      } else {
        setSelectedText("");
        setCurrentSelection(null);
      }
    }
  }, []);

  // Process text from AI operations
  const handleProcessedText = useCallback((newText: string, replaceSelection: boolean) => {
    console.log("handleProcessedText called with:", {
      textLength: newText.length, 
      replaceSelection,
      hasSelectedText: !!selectedText,
      selectedTextLength: selectedText.length
    });

    // Process the text to convert markdown to HTML
    const processFormattedText = (text: string) => {
      // First, clean any markdown code blocks and trailing commentary
      let cleanedContent = text;
      
      // Remove starting ```html or ``` if present (common with code-like responses)
      cleanedContent = cleanedContent.replace(/^```(?:html|markdown|md|json|javascript|js|typescript|ts|css|jsx|tsx|python|py)?\s*\n?/i, '');
      
      // Handle any code block endings and remove everything after them (often commentary)
      const codeBlockEndMatch = cleanedContent.match(/```[\s\S]*$/i);
      if (codeBlockEndMatch && codeBlockEndMatch.index) {
        cleanedContent = cleanedContent.slice(0, codeBlockEndMatch.index);
      }
      
      // Remove common AI commentary that can appear after the main output
      const commentPatterns = [
        /\n+[\s\n]*In summary[\s\S]*$/i,
        /\n+[\s\n]*To summarize[\s\S]*$/i,
        /\n+[\s\n]*I hope (this|these|that)[\s\S]*$/i, 
        /\n+[\s\n]*Hope (this|these|that)[\s\S]*$/i,
        /\n+[\s\n]*Let me know[\s\S]*$/i,
        /\n+[\s\n]*Please let me know[\s\S]*$/i,
        /\n+[\s\n]*Is there anything else[\s\S]*$/i,
        /\n+[\s\n]*Would you like me to[\s\S]*$/i,
        /\n+[\s\n]*Feel free to[\s\S]*$/i,
        /\n+[\s\n]*Do you want me to[\s\S]*$/i,
        /\n+[\s\n]*If you need any changes[\s\S]*$/i,
        /\n+[\s\n]*If you have any questions[\s\S]*$/i,
        /\n+[\s\n]*If you need more[\s\S]*$/i,
        /\n+[\s\n]*These (templates|examples|samples)[\s\S]*$/i
      ];
      
      // Apply each pattern
      for (const pattern of commentPatterns) {
        const match = cleanedContent.match(pattern);
        if (match && match.index) {
          cleanedContent = cleanedContent.slice(0, match.index);
        }
      }
      
      // Now format with HTML
      let enhancedContent = cleanedContent
        // Handle titles with asterisks (bold)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Handle emphasis with single asterisks (italic)
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Handle titles that start with "Title:" or "# "
        .replace(/^(Title:)(.*?)$/gim, '<h1>$2</h1>')
        .replace(/^(#{1}\s+)(.*?)$/gim, '<h1>$2</h1>')
        .replace(/^(#{2}\s+)(.*?)$/gim, '<h2>$2</h2>')
        .replace(/^(#{3}\s+)(.*?)$/gim, '<h3>$3</h3>');

      // Fix lists - convert plain bullet lists into HTML lists
      
      // Convert bullet points to list items
      enhancedContent = enhancedContent.replace(/\n\s*•\s*(.*?)(?=\n|$)/g, '\n<li>$1</li>');
      
      // Convert numbered points to list items (1. 2. 3. etc)
      enhancedContent = enhancedContent.replace(/\n\s*(\d+)\.\s*(.*?)(?=\n|$)/g, '\n<li>$2</li>');
      
      // Helper function to wrap list items in proper list tags
      const wrapListItems = (content: string): string => {
        let modified = content;
        // Find potential list items
        const listItemRegex = /<li>.*?<\/li>/g;
        const listItems = content.match(listItemRegex);
        
        if (listItems) {
          // Identify consecutive list items
          let consecutiveItems = '';
          let count = 0;
          
          for (let i = 0; i < listItems.length; i++) {
            if (i > 0 && content.indexOf(listItems[i]) - 
                (content.indexOf(listItems[i-1]) + listItems[i-1].length) < 10) {
              // These list items are consecutive or close
              if (count === 0) {
                consecutiveItems = listItems[i-1];
                count = 1;
              }
              consecutiveItems += listItems[i];
              count++;
            } else if (count > 0) {
              // We found the end of a sequence - wrap it
              if (count > 1) {
                // Determine if these were numbered items originally
                const originalContext = content.substring(
                  Math.max(0, content.indexOf(consecutiveItems) - 20),
                  content.indexOf(consecutiveItems)
                );
                
                const isNumbered = /\d+\.\s/.test(originalContext);
                const tagName = isNumbered ? 'ol' : 'ul';
                
                modified = modified.replace(consecutiveItems, 
                  `<${tagName}>\n${consecutiveItems}\n</${tagName}>`);
              }
              consecutiveItems = '';
              count = 0;
            }
          }
          
          // Handle the last sequence if there is one
          if (count > 1) {
            const originalContext = content.substring(
              Math.max(0, content.indexOf(consecutiveItems) - 20),
              content.indexOf(consecutiveItems)
            );
            
            const isNumbered = /\d+\.\s/.test(originalContext);
            const tagName = isNumbered ? 'ol' : 'ul';
            
            modified = modified.replace(consecutiveItems, 
              `<${tagName}>\n${consecutiveItems}\n</${tagName}>`);
          }
        }
        
        return modified;
      };
      
      enhancedContent = wrapListItems(enhancedContent);

      // Split by paragraphs - looking for either single or double newlines
      const paragraphs = enhancedContent.split(/\n{2,}/).filter(p => p.trim());
      
      // Process each paragraph, preserving any already-converted HTML tags
      const processedContent = paragraphs.map(para => {
        // Skip if paragraph is already fully wrapped in HTML
        if (
          (para.startsWith('<h1>') && para.endsWith('</h1>')) ||
          (para.startsWith('<h2>') && para.endsWith('</h2>')) ||
          (para.startsWith('<h3>') && para.endsWith('</h3>')) ||
          (para.startsWith('<ul>') && para.endsWith('</ul>')) ||
          (para.startsWith('<ol>') && para.endsWith('</ol>'))
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
              (line.startsWith('<p>') && line.endsWith('</p>')) ||
              (line.startsWith('<li>') && line.endsWith('</li>'))
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

    // Format the new text with HTML for proper display
    const formattedNewText = processFormattedText(newText);
    
    // Check if we have a valid editor reference 
    if (!editorRef.current) {
      console.log("No editor reference, setting content directly");
      setEditableContent(formattedNewText);
      return;
    }
    
    const editor = editorRef.current.getEditor();
    
    // Determine the action based on context
    if (replaceSelection) {
      // This is a context menu operation that should replace selected text
      const selection = editor.getSelection();
      
      console.log("Current selection:", selection);
      console.log("Saved selection:", currentSelection);
      
      if (selection && selection.length > 0) {
        // We have an active selection, replace it
        console.log("Replacing current active selection at index:", selection.index, "length:", selection.length);
        
        // Delete the selected text
        editor.deleteText(selection.index, selection.length);
        
        // Insert the HTML content at the position where text was deleted
        editor.clipboard.dangerouslyPasteHTML(selection.index, formattedNewText);
        
        // Update state with the updated content
        setEditableContent(editor.root.innerHTML);
      }
      // If we don't have a current selection but have a saved one, use that
      else if (currentSelection) {
        console.log("Using saved selection for replacement at index:", currentSelection.index, "length:", currentSelection.length);
        
        // Delete the saved selection text
        editor.deleteText(currentSelection.index, currentSelection.length);
        
        // Insert the HTML content at the saved position
        editor.clipboard.dangerouslyPasteHTML(currentSelection.index, formattedNewText);
        
        // Update state with the updated content
        setEditableContent(editor.root.innerHTML);
        
        // Clear the saved selection after using it
        setCurrentSelection(null);
      } 
      else {
        // No current or saved selection, but this was supposed to replace text
        // This might happen if selection was completely lost between right-click and API response
        console.warn("No selection available (current or saved) but replaceSelection is true");
        
        // Insert at the beginning as a fallback
        if (editor.getText().trim() === '') {
          // If editor is empty, just set the content
          console.log("Editor is empty, setting full content");
          setEditableContent(formattedNewText);
        } else {
          // Otherwise, append to the end with a clear separation
          console.log("Appending at the end with separation");
          const length = editor.getLength();
          editor.insertText(length, '\n\n');
          editor.clipboard.dangerouslyPasteHTML(length + 2, formattedNewText);
          setEditableContent(editor.root.innerHTML);
        }
      }
    } else {
      // Not a selection replacement - usually initial content loading
      console.log("Setting full content (not replacing selection)");
      setEditableContent(formattedNewText);
    }
  }, [selectedText, currentSelection]);

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

  const handleExport = useCallback((format: 'pdf' | 'docx' | 'html') => {
    // For export, we want to get the raw text with newlines preserved for PDF/DOCX
    // For HTML we want the rich content with formatting
    const text = editorRef.current?.getEditor().getText() || '';
    const htmlContent = editorRef.current?.getEditor().root.innerHTML || '';
    
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
    } else if (format === 'docx') {
      exportAsDOCX(contentToExport, title);
    } else if (format === 'html') {
      // For HTML export, we use the rich content with all formatting preserved
      exportAsHTML(htmlContent, title);
    }
  }, []);

  // Save content mutation
  const saveContentMutation = useMutation({
    mutationFn: async ({ title, content, contentType, model, temperature }: { 
      title: string; 
      content: string; 
      contentType: string;
      model: string;
      temperature: number;
    }) => {
      return await apiRequest('POST', '/api/generated-contents', { 
        title, 
        content, 
        contentType: contentType || 'general',
        model,
        temperature: temperature.toString()
      });
    },
    onSuccess: () => {
      setSaveDialogOpen(false);
      toast({
        title: "Content saved",
        description: "Your content has been saved to the library.",
      });
      setContentTitle(""); // Reset title input
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle saving content
  const handleSaveContent = () => {
    if (!contentTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your content.",
        variant: "destructive",
      });
      return;
    }

    // Get the content from the editor
    const contentToSave = editorRef.current?.getEditor().getText() || '';
    
    if (!contentToSave.trim()) {
      toast({
        title: "No content to save",
        description: "There is no content to save.",
        variant: "destructive",
      });
      return;
    }

    saveContentMutation.mutate({ 
      title: contentTitle, 
      content: contentToSave,
      contentType: 'general',
      model: model,
      temperature: temperature
    });
  };

  // Handle loading content from library
  const handleLoadContent = (content: GeneratedContent) => {
    setSavedContentLibraryOpen(false);
    handleProcessedText(content.content, false);
    toast({
      title: "Content loaded",
      description: `"${content.title}" has been loaded into the editor.`,
    });
  };

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
    <>
      <Card className={`w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col ${
        isFullScreen 
          ? 'fixed inset-0 z-50 rounded-none h-screen max-h-screen' 
          : 'min-h-[470px] max-h-[calc(100vh-200px)]'
      }`}>
        <CardHeader className="p-4 bg-gradient-to-r from-black to-gray-800 border-b border-gray-200 flex flex-row items-center justify-between">
          <CardTitle className="font-semibold text-white">Generated Content</CardTitle>
          
          {(showContent || isFullScreen) && (
            <div className="flex gap-2">
              {showContent && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={handleCopy} className="text-white hover:bg-black/20">
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
                            <Button variant="ghost" size="icon" className="text-white hover:bg-black/20">
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
                      <DropdownMenuItem onClick={() => handleExport('html')}>
                        <Code className="h-4 w-4 mr-2" />
                        Export as HTML
                      </DropdownMenuItem>
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setSaveDialogOpen(true)}
                          className="text-[#FF6600] hover:bg-black/20"
                        >
                          <Bookmark className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Save to library</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSavedContentLibraryOpen(true)}
                      className="text-white hover:bg-black/20"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open content library</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {onToggleFullScreen && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onToggleFullScreen} 
                        className="text-white hover:bg-black/20"
                      >
                        {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isFullScreen ? 'Exit full screen' : 'Full screen'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {showContent && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={onClear} className="text-white hover:bg-black/20">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear content</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent className={`p-0 flex-1 relative border-b border-gray-200 ${
          isFullScreen ? 'overflow-hidden' : 'overflow-auto'
        }`}>
          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10 animate-fade-in">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <svg width="60" height="60" viewBox="0 0 24 24" className="text-[#FF6600] animate-spin-slow">
                    <g transform="translate(12, 12)">
                      {/* Main star shape */}
                      <path fill="currentColor" d="M0,-8 L2,-2 L8,0 L2,2 L0,8 L-2,2 L-8,0 L-2,-2 Z" />
                      {/* Inner details */}
                      <path fill="black" d="M0,-4 L1,-1 L4,0 L1,1 L0,4 L-1,1 L-4,0 L-1,-1 Z" />
                      {/* Center circle */}
                      <circle fill="white" cx="0" cy="0" r="1.5" />
                    </g>
                  </svg>
                </div>
                <p className="mt-4 text-[#FF6600] text-base font-medium animate-pulse-subtle">Generating content...</p>
                <p className="text-xs text-gray-500 mt-1">Please wait while the AI works its magic</p>
              </div>
            </div>
          )}
          
          {/* Empty state */}
          {showEmptyState && (
            <div className="text-center py-12 h-full flex flex-col items-center justify-center">
              <div className="rounded-full bg-gray-100 p-3 mb-4">
                <svg width="36" height="36" viewBox="0 0 24 24" className="text-[#FF6600]">
                  <path fill="currentColor" d="M12,2C6.5,2,2,6.5,2,12c0,5.5,4.5,10,10,10s10-4.5,10-10C22,6.5,17.5,2,12,2z M12,14c-1.1,0-2-0.9-2-2c0-0.6,0.4-1,1-1s1,0.4,1,1c0,0,0,0,0,0c0.6,0,1,0.4,1,1S12.6,14,12,14z"/>
                </svg>
              </div>
              <p className="text-gray-500 mb-1">Your generated content will appear here</p>
              <p className="text-xs text-gray-400">Configure your prompts and click "Generate"</p>
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
              {error && (error.includes("API key") || error.includes("Invalid key")) && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md max-w-md">
                  <p className="text-amber-700 text-sm">
                    <strong>Note:</strong> The OpenAI API key is now managed by the server.
                    This error indicates a server configuration issue and not a problem with your account.
                    Please contact the administrator to verify that a valid API key is configured.
                  </p>
                </div>
              )}
              
              {error && error.includes("fetch failed") && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md max-w-md">
                  <p className="text-amber-700 text-sm">
                    <strong>Connection error:</strong> The server is having trouble connecting to OpenAI's API.
                    This could be due to a temporary network issue or server configuration problem.
                    Please try again in a few moments or contact the administrator if the issue persists.
                  </p>
                </div>
              )}
              <Button 
                variant="outline" 
                className="mt-4 border-[#FF6600] text-[#FF6600] hover:bg-[#FF6600] hover:text-white"
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
              model={model}
              temperature={temperature}
              onOpenPersonaLibrary={onOpenPersonaLibrary}
              personas={personas}
            >
              <div 
                className={`p-4 ${isFullScreen ? 'h-full overflow-hidden' : ''}`} 
                onMouseUp={handleTextSelection} 
                onKeyUp={handleTextSelection}
              >
                <ReactQuill
                  ref={editorRef}
                  value={editableContent}
                  onChange={setEditableContent}
                  modules={modules}
                  placeholder="Generated content will appear here and can be edited..."
                  className={`${isFullScreen ? 'full-screen h-full' : 'min-h-[400px]'}`}
                />
                
                {/* Save Button - Added for easier saving */}
                <div className="mt-6 mb-4 flex justify-center">
                  <Button 
                    onClick={() => setSaveDialogOpen(true)}
                    className="bg-white text-[#FF6600] hover:bg-[#FF6600] hover:text-white border-[#FF6600] border-2"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save to Content Library
                  </Button>
                </div>
              </div>
            </AIContextMenu>
          )}
        </CardContent>
        <div className="p-3 bg-white border-t border-gray-200"></div>
      </Card>

      {/* Save Content Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Content to Library</DialogTitle>
            <DialogDescription>
              Enter a title for this content to save it to your content library.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="content-title" className="text-right">
                Title
              </Label>
              <Input
                id="content-title"
                value={contentTitle}
                onChange={(e) => setContentTitle(e.target.value)}
                placeholder="Enter a descriptive title"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setSaveDialogOpen(false)}
              disabled={saveContentMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleSaveContent}
              disabled={saveContentMutation.isPending}
              className="bg-[#FF6600] hover:bg-[#E65800]"
            >
              {saveContentMutation.isPending ? "Saving..." : "Save Content"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Library Dialog */}
      <SavedContentLibrary
        open={savedContentLibraryOpen}
        onOpenChange={setSavedContentLibraryOpen}
        onSelectContent={handleLoadContent}
      />
    </>
  );
}