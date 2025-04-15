import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, BookText } from "lucide-react";

interface UserPromptPanelProps {
  userPrompt: string;
  setUserPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onOpenPromptLibrary?: () => void;
}

export function UserPromptPanel({
  userPrompt,
  setUserPrompt,
  onGenerate,
  isGenerating,
  onOpenPromptLibrary
}: UserPromptPanelProps) {
  return (
    <Card className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <CardHeader className="p-4 bg-gray-50 border-b border-gray-200">
        <CardTitle className="font-semibold text-gray-700">User Prompt</CardTitle>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Enter your prompt below to generate content.
            </p>
            
            {onOpenPromptLibrary && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenPromptLibrary();
                }}
              >
                <BookText className="h-4 w-4" />
                <span>Deploy From Library</span>
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <Textarea
              className="min-h-[160px] resize-none"
              placeholder="Type your prompt here..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end p-4 pt-0">
        <Button 
          onClick={onGenerate} 
          disabled={!userPrompt.trim() || isGenerating}
        >
          <Zap className="mr-2 h-4 w-4" />
          Generate
        </Button>
      </CardFooter>
    </Card>
  );
}
