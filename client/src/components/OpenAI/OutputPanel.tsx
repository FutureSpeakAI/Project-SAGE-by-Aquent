import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface OutputPanelProps {
  content: string;
  isLoading: boolean;
  error: string | null;
  onClear: () => void;
  onRetry: () => void;
}

export function OutputPanel({
  content,
  isLoading,
  error,
  onClear,
  onRetry
}: OutputPanelProps) {
  const hasContent = content.trim().length > 0;
  const showEmptyState = !isLoading && !error && !hasContent;
  const showErrorState = !isLoading && error !== null;
  const showContent = !isLoading && !error && hasContent;

  return (
    <Card className="w-full h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      <CardHeader className="p-4 bg-gray-50 border-b border-gray-200 flex flex-row items-center justify-between">
        <CardTitle className="font-semibold text-gray-700">Generated Output</CardTitle>
        
        {showContent && (
          <div className="flex gap-2">
            <CopyButton text={content} />
            <Button variant="ghost" size="icon" onClick={onClear}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-4 flex-1 overflow-auto relative">
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
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
              Try Again
            </Button>
          </div>
        )}
        
        {/* Content */}
        {showContent && (
          <div className="prose prose-sm max-w-none">
            {content.split('\n').map((line, i) => (
              <p key={i}>{line || <br />}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
