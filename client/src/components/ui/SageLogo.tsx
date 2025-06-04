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
      fill="currentColor"
    >
      {/* Simple branch/tree icon based on your image */}
      <path d="M12 2C10.9 2 10 2.9 10 4s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
      <path d="M12 6c-1.1 0-2 .9-2 2v4h-2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2c0-.55-.22-1.05-.59-1.41L12 10l2.59 2.59c-.37.36-.59.86-.59 1.41 0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2h-2V8c0-1.1-.9-2-2-2z"/>
      <path d="M11 16v4c0 1.1.9 2 2 2s2-.9 2-2v-4h-3z"/>
    </svg>
  );
}