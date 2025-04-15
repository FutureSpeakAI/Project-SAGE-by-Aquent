import { Button } from "@/components/ui/button";
import { Key } from "lucide-react";

interface HeaderProps {
  onOpenApiKeyModal: () => void;
}

export function Header({ onOpenApiKeyModal }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <div className="text-primary text-2xl mr-2">
              <span role="img" aria-label="robot">🤖</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">AI Content Generator</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-sm font-medium text-primary hover:text-primary/80"
              onClick={onOpenApiKeyModal}
            >
              <Key className="h-4 w-4 mr-1" />
              <span>API Key</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
