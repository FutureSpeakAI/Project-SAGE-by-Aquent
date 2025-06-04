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
      {/* Happy robot icon */}
      <rect x="6" y="4" width="12" height="8" rx="2" />
      <circle cx="9" cy="7" r="1" />
      <circle cx="15" cy="7" r="1" />
      <path d="M8 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <rect x="8" y="12" width="8" height="6" rx="1" />
      <rect x="6" y="14" width="2" height="3" rx="0.5" />
      <rect x="16" y="14" width="2" height="3" rx="0.5" />
      <rect x="10" y="18" width="4" height="2" rx="0.5" />
      <circle cx="7" cy="2" r="1" />
      <circle cx="17" cy="2" r="1" />
      <line x1="7" y1="3" x2="7" y2="4" stroke="currentColor" strokeWidth="1" />
      <line x1="17" y1="3" x2="17" y2="4" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}