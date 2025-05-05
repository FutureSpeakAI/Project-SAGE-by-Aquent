import { FallbackProps } from "react-error-boundary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  return (
    <div className="p-6">
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Application Error</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            We encountered an unexpected error. This is a known issue we're working to fix.
          </p>
          <div className="text-xs overflow-auto max-h-[100px] bg-gray-50 p-2 rounded mb-2">
            {error?.message || "Unknown error"}
          </div>
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Button 
          onClick={resetErrorBoundary} 
          className="bg-[#F15A22] hover:bg-[#e04d15]"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset Application
        </Button>
      </div>
    </div>
  );
};