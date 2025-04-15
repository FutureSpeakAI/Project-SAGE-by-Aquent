import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Database, AlertCircle, CheckCircle } from "lucide-react";
import { useQuery } from '@tanstack/react-query';

interface DatabaseStatus {
  status: 'ok' | 'error';
  environment: 'development' | 'production';
  database: boolean;
  errorMessage?: string;
}

export function DatabaseStatusAlert() {
  const { data: status, isLoading, error } = useQuery<DatabaseStatus>({
    queryKey: ['/api/status'],
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Alert className="mb-4 border-yellow-400 bg-yellow-50">
        <Database className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800">Checking database connection...</AlertTitle>
        <AlertDescription className="text-yellow-700">
          Verifying database status...
        </AlertDescription>
      </Alert>
    );
  }

  if (error || !status) {
    return (
      <Alert className="mb-4 border-red-400 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800">Database Status Unavailable</AlertTitle>
        <AlertDescription className="text-red-700">
          Unable to determine database status. This might affect data persistence.
        </AlertDescription>
      </Alert>
    );
  }

  // If database is connected, don't show anything
  if (status.database) {
    return null;
  }

  // If there's a problem with the database
  return (
    <Alert className="mb-4 border-amber-400 bg-amber-50">
      <Database className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Using Local Storage Mode</AlertTitle>
      <AlertDescription className="text-amber-700">
        Database connection unavailable. Your data is being stored locally and will not persist between sessions.
        Please use the Data Migration tool to export your data for safekeeping.
      </AlertDescription>
    </Alert>
  );
}