import { Button } from "@/components/ui/button";
import { Library, Database } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { SageLogo } from "@/components/ui/SageLogo";

interface HeaderProps {
  onOpenSavedContentLibrary?: () => void;
  onOpenDataMigration?: () => void;
  // Keeping this to avoid breaking existing code, but we won't use it anymore
  onOpenApiKeyModal?: () => void;
}

export function Header({ onOpenSavedContentLibrary, onOpenDataMigration, onOpenApiKeyModal }: HeaderProps) {
  const isMobile = useIsMobile();
  return (
    <header className="bg-black py-3 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo and title */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <SageLogo size={40} />
            </div>
            <div className="ml-3">
              <h1 className="text-2xl font-bold text-white">
                S<span className="text-[#F15A22]">A</span>GE
              </h1>
              <p className="text-gray-300 text-xs">Strategic Adaptive Generative Engine</p>
            </div>
          </div>
          
          {/* Right side buttons */}
          <div className="flex space-x-2 md:space-x-3">
            {/* Saved Content Library button */}
            {onOpenSavedContentLibrary && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onOpenSavedContentLibrary}
                className="bg-white text-[#F15A22] hover:bg-[#F15A22] hover:text-white border-[#F15A22]"
              >
                <Library className="h-4 w-4 mr-1 flex-shrink-0" />
                {!isMobile && <span>Content Library</span>}
                {isMobile && <span className="sr-only">Content Library</span>}
              </Button>
            )}
            
            {/* Data Migration button */}
            {onOpenDataMigration && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onOpenDataMigration}
                className="bg-white text-[#F15A22] hover:bg-[#F15A22] hover:text-white border-[#F15A22]"
              >
                <Database className="h-4 w-4 mr-1 flex-shrink-0" />
                {!isMobile && <span>Data Migration</span>}
                {isMobile && <span className="sr-only">Data Migration</span>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}