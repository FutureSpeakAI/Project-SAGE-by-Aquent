import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";

interface HeaderProps {
  onOpenApiKeyModal: () => void;
}

export function Header({ onOpenApiKeyModal }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-black to-gray-800 py-3 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo and title */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg width="40" height="40" viewBox="0 0 24 24" className="text-[#FF6600]">
                <path fill="currentColor" d="M12,2C6.5,2,2,6.5,2,12c0,5.5,4.5,10,10,10s10-4.5,10-10C22,6.5,17.5,2,12,2z"/>
                <path fill="black" d="M12,7c-2.8,0-5,2.2-5,5c0,0.3,0,0.7,0.1,1h9.7c0.1-0.3,0.1-0.7,0.1-1C17,9.2,14.8,7,12,7z"/>
                <path fill="white" d="M9,10c0.6,0,1,0.4,1,1s-0.4,1-1,1s-1-0.4-1-1S8.4,10,9,10z M15,10c0.6,0,1,0.4,1,1s-0.4,1-1,1s-1-0.4-1-1S14.4,10,15,10z"/>
              </svg>
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold text-white">
                <span className="text-[#FF6600]">MyMarketing</span>.Ninja
              </h1>
              <p className="text-gray-300 text-xs">Smart content that cuts through the noise</p>
            </div>
          </div>
          
          {/* API Key button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onOpenApiKeyModal}
            className="text-white hover:bg-[#FF6600] hover:text-white border-white hover:border-[#FF6600]"
          >
            <KeyRound className="h-4 w-4 mr-2" />
            OpenAI API Key
          </Button>
        </div>
      </div>
    </header>
  );
}