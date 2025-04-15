import { Button } from "@/components/ui/button";
import { Key } from "lucide-react";

interface HeaderProps {
  onOpenApiKeyModal: () => void;
}

export function Header({ onOpenApiKeyModal }: HeaderProps) {
  return (
    <header className="bg-black text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            {/* Ninja icon - simple svg */}
            <svg 
              width="28" 
              height="28" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="#FF6600" />
              <path d="M7 12H17M9 9L7.5 7.5M15 9L16.5 7.5M9 15L7.5 16.5M15 15L16.5 16.5" stroke="black" strokeWidth="2" strokeLinecap="round" />
              <path d="M10 14H14" stroke="black" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h1 className="text-xl font-bold">
              <span className="text-[#FF6600]">MyMarketing</span>.Ninja
            </h1>
          </div>
          <span className="hidden md:inline-block text-xs bg-[#FF6600] px-2 py-1 rounded text-white">
            AI-Powered Content
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="border-[#FF6600] text-[#FF6600] hover:bg-[#FF6600] hover:text-white"
            onClick={onOpenApiKeyModal}
          >
            <Key className="mr-2 h-4 w-4" />
            API Key
          </Button>
        </div>
      </div>
    </header>
  );
}