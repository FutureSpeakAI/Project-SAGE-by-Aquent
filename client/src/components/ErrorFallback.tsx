import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <Card className="w-full max-w-3xl mx-auto my-12 shadow-lg">
      <CardHeader className="bg-red-50 text-red-900 rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle size={24} />
          <span>Something went wrong</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <p className="text-gray-600">
            An error occurred while trying to perform this operation. Please try again.
          </p>
          
          <div className="bg-gray-100 p-4 rounded-md overflow-auto">
            <p className="font-mono text-sm text-red-600">{error.message}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t p-4">
        <Button 
          onClick={resetErrorBoundary}
          className="bg-[#F15A22] hover:bg-[#e04d15]"
        >
          Try again
        </Button>
      </CardFooter>
    </Card>
  );
}