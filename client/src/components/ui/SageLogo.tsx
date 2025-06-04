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
      viewBox="0 0 200 200" 
      className={cn("text-[#F15A22]", className)}
      fill="none"
    >
      {/* Sage leaf inspired by your icon - elongated oval leaf shape */}
      <path
        fill="currentColor"
        d="M100 25C85 25 70 35 60 50C50 65 50 85 55 100C60 115 70 125 80 135C85 140 90 145 95 150C97 152 99 153 100 153C101 153 103 152 105 150C110 145 115 140 120 135C130 125 140 115 145 100C150 85 150 65 140 50C130 35 115 25 100 25Z"
      />
      
      {/* Central vein */}
      <path
        fill="currentColor"
        d="M100 30L100 145"
        stroke="currentColor"
        strokeWidth="2"
        fillOpacity="0.3"
      />
      
      {/* Left side veins */}
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.4"
        d="M100 45L85 55M100 60L80 75M100 75L85 90M100 90L90 105M100 105L95 120"
      />
      
      {/* Right side veins */}
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.4"
        d="M100 45L115 55M100 60L120 75M100 75L115 90M100 90L110 105M100 105L105 120"
      />
      
      {/* Small stem */}
      <path
        fill="currentColor"
        d="M98 150L100 170L102 150Z"
      />
    </svg>
  );
}