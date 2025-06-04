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
      viewBox="0 0 40 40" 
      className={cn("text-[#F15A22]", className)}
    >
      <path 
        fill="currentColor" 
        d="M20 4c-8 0-12 6-12 14 0 6 3 10 6 12l6-6 6 6c3-2 6-6 6-12 0-8-4-14-12-14zm0 4c2 0 4 1 5 3l-5 9-5-9c1-2 3-3 5-3z"
      />
      <path 
        fill="currentColor" 
        d="M20 20l-3 8c1 1 2 2 3 2s2-1 3-2l-3-8z"
      />
    </svg>
  );
}