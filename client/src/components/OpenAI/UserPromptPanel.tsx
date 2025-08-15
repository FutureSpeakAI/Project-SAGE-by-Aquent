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
  console.log('[UserPromptPanel] Rendered with userPrompt:', userPrompt);
  return (
    <Card className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden min-h-[230px]">
      <CardHeader className="p-4 bg-gradient-to-r from-black to-gray-800 border-b border-gray-200">
        <CardTitle className="font-semibold text-white">User Prompt</CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 overflow-auto">
        <div className="space-y-4">
          <div className="flex justify-end items-center">
            {onOpenPromptLibrary && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1 border-[#FF6600] text-[#FF6600] hover:bg-[#FF6600] hover:text-white"
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
              className="min-h-[160px] resize-vertical"
              placeholder="Type your prompt here..."
              value={userPrompt}
              onChange={(e) => {
                console.log('[UserPromptPanel] onChange called with:', e.target.value);
                setUserPrompt(e.target.value);
              }}
            />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end p-4 pt-0">
        <Button 
          onClick={onGenerate} 
          disabled={!userPrompt.trim() || isGenerating}
          className="bg-white text-[#FF6600] hover:bg-[#FF6600] hover:text-white border border-[#FF6600]"
        >
          {isGenerating ? (
            <span className="flex items-center">
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating...
            </span>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Generate Content
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
