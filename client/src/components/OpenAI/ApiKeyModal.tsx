import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

export function ApiKeyModal({ 
  open, 
  onOpenChange, 
  apiKey, 
  setApiKey 
}: ApiKeyModalProps) {
  const [inputValue, setInputValue] = useState(apiKey);
  const { toast } = useToast();

  const handleSave = () => {
    const trimmedKey = inputValue.trim();
    
    if (!trimmedKey) {
      toast({
        title: "API Key Required",
        description: "Please enter a valid OpenAI API key.",
        variant: "destructive",
      });
      return;
    }
    
    if (!trimmedKey.startsWith("sk-")) {
      toast({
        title: "Invalid API Key",
        description: "OpenAI API keys typically start with 'sk-'.",
        variant: "destructive",
      });
      return;
    }
    
    setApiKey(trimmedKey);
    onOpenChange(false);
    
    toast({
      title: "API Key Saved",
      description: "Your OpenAI API key has been saved.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>OpenAI API Key</DialogTitle>
          <DialogDescription>
            Enter your OpenAI API key to use the AI Content Generator. 
            Your API key is stored locally in your browser and never sent to our servers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Don't have an API key?{" "}
            <a
              href="https://platform.openai.com/account/api-keys"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:text-primary/80 underline"
            >
              Get one here
            </a>
            .
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save API Key</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
