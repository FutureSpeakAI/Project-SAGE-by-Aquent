import { useEffect, useState } from 'react';
import { getQueryFn } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface DatabaseStatus {
  status: string;
  environment: string;
  database: {
    available: boolean;
    type: string;
  };
  timestamp: string;
}

export function DatabaseStatusAlert() {
  const [show, setShow] = useState(false);
  
  // Fetch database status
  const { data: status, isLoading, error } = useQuery<DatabaseStatus>({
    queryKey: ['/api/status'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    refetchOnWindowFocus: false,
    retry: 2,
  });

  useEffect(() => {
    // Only show the alert if there's actually a problem with the database
    if (!isLoading && (error || (status && !status.database.available))) {
      setShow(true);
    }
  }, [status, isLoading, error]);

  // Don't render anything if everything is fine or still loading
  if (!show) return null;

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4 mr-2" />
        <AlertTitle>Database Connection Issue</AlertTitle>
        <AlertDescription>
          Unable to connect to the database. Some features may not work correctly.
          <div className="text-xs mt-1 opacity-80">
            Error: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (status && !status.database.available) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4 mr-2" />
        <AlertTitle>Using Memory Storage</AlertTitle>
        <AlertDescription>
          The app is running with temporary in-memory storage. Your data will not persist between sessions.
          <div className="text-xs mt-1 opacity-80">
            Environment: {status.environment}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (status && status.database.available) {
    return (
      <Alert variant="default" className="mb-4 bg-green-50 text-green-800 border-green-200">
        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
        <AlertTitle>Database Connected</AlertTitle>
        <AlertDescription>
          Connected to {status.database.type} database. Your data will persist between sessions.
          <div className="text-xs mt-1 opacity-80">
            Environment: {status.environment}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}