import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

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
                An error occurred in the application. This is likely due to a temporary issue.
              </p>
              
              {this.state.error && (
                <div className="bg-gray-100 p-4 rounded-md overflow-auto">
                  <p className="font-mono text-sm text-red-600">{this.state.error.toString()}</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t p-4">
            <Button 
              onClick={this.handleReset}
              className="bg-[#F15A22] hover:bg-[#e04d15]"
            >
              Reset Application
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;