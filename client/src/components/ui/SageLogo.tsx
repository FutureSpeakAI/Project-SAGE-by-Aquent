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
      {/* Simple leaf outline */}
      <path d="M12 2C7 2 3 6 3 11c0 3 1.5 5.5 4 7l5-5 5 5c2.5-1.5 4-4 4-7 0-5-4-9-9-9z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7v10" strokeLinecap="round" />
    </svg>
  );
}