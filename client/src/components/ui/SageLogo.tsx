import { cn } from "@/lib/utils";

interface SageLogoProps {
  className?: string;
  size?: number;
}

export function SageLogo({ className, size = 24 }: SageLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      className={cn("text-[#F15A22]", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      {/* AI Robot face outline */}
      <rect x="5" y="6" width="14" height="12" rx="3" />
      <circle cx="9" cy="11" r="1" fill="currentColor" />
      <circle cx="15" cy="11" r="1" fill="currentColor" />
      <path d="M9 15h6" strokeLinecap="round" />
      <path d="M12 3v3" strokeLinecap="round" />
      <path d="M8 3h8" strokeLinecap="round" />
    </svg>
  );
}