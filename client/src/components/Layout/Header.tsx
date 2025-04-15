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
              <svg width="40" height="40" viewBox="0 0 24 24" className="text-[#FF6600] animate-spin-slow">
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
            className="bg-white text-[#FF6600] hover:bg-[#FF6600] hover:text-white border-[#FF6600]"
          >
            <KeyRound className="h-4 w-4 mr-2" />
            OpenAI API Key
          </Button>
        </div>
      </div>
    </header>
  );
}