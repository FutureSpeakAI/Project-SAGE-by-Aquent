import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

export function ApiKeyModal({ 
  open, 
  onOpenChange
}: ApiKeyModalProps) {
  const { toast } = useToast();

  const handleClose = () => {
    onOpenChange(false);
    
    toast({
      title: "System Configuration",
      description: "API Key is managed by server environment variables.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-orange-500" />
            OpenAI API Key Update
          </DialogTitle>
          <DialogDescription>
            The application now uses API keys configured on the server through environment variables.
            This provides better security as API keys are no longer stored in the browser.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Information</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    This change improves security by centralizing API key management.
                    Your requests will still work as before, but now the API key is
                    managed by the server administrator.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
