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
      fill="currentColor"
    >
      {/* Head */}
      <ellipse
        cx="100"
        cy="55"
        rx="30"
        ry="35"
      />
      
      {/* Body/Torso with curved bottom opening */}
      <path
        d="M65 95C65 85 80 75 100 75C120 75 135 85 135 95L135 130C135 140 130 145 120 145L115 145C115 150 110 155 100 155C90 155 85 150 85 145L80 145C70 145 65 140 65 130L65 95Z"
      />
      
      {/* Cross-legged sitting position */}
      <ellipse
        cx="75"
        cy="170"
        rx="40"
        ry="18"
        transform="rotate(-8 75 170)"
      />
      <ellipse
        cx="125"
        cy="170"
        rx="40"
        ry="18"
        transform="rotate(8 125 170)"
      />
    </svg>
  );
}