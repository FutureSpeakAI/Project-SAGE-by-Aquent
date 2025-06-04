import { cn } from "@/lib/utils";

interface SageLogoProps {
  className?: string;
  size?: number;
}

export function SageLogo({ className, size = 24 }: SageLogoProps) {
  const finalSize = Math.round(size * 0.8); // Make the square slightly smaller than the requested size
  
  return (
    <div 
      className={cn("flex items-center justify-center bg-[#F15A22] rounded", className)}
      style={{ width: finalSize, height: finalSize }}
    >
      <span className="text-white font-bold" style={{ fontSize: Math.round(finalSize * 0.6) }}>A</span>
    </div>
  );
}