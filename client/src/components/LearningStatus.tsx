/**
 * Learning Status Component
 * Shows the learning engine status and provides a simple demo
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, CheckCircle, XCircle, Clock, Zap } from "lucide-react";
import { learningTracker } from "../utils/learning-tracker";

interface LearningStatus {
  status: 'healthy' | 'error' | 'initializing';
  message: string;
  timestamp?: string;
}

export function LearningStatus() {
  const [status, setStatus] = useState<LearningStatus>({ status: 'initializing', message: 'Checking...' });
  const [loading, setLoading] = useState(true);
  const [demoRun, setDemoRun] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/learning/health');
      
      if (response.ok) {
        const data = await response.json();
        setStatus({
          status: 'healthy',
          message: data.message || 'Learning engine operational',
          timestamp: data.timestamp
        });
      } else {
        setStatus({
          status: 'error',
          message: 'Learning engine not responding'
        });
      }
    } catch (error) {
      console.error('Learning status check failed:', error);
      setStatus({
        status: 'error',
        message: 'Unable to connect to learning engine'
      });
    } finally {
      setLoading(false);
    }
  };

  const runDemo = async () => {
    setDemoRun(true);
    
    // Simulate some learning events
    await learningTracker.trackWorkflow('demo_started', 'learning_status', { demo: true });
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await learningTracker.trackContentGeneration('demo_content', 'This is a demo prompt', true);
    
    // Wait another moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await learningTracker.trackResearch('demo_research', 'Technology', true);
    
    setDemoRun(false);
  };

  const getStatusIcon = () => {
    if (loading) return <Clock className="h-4 w-4 animate-spin" />;
    
    switch (status.status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5" />
          Learning Engine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">Status</span>
          </div>
          <Badge className={getStatusColor()}>
            {status.status === 'healthy' ? 'Operational' : 
             status.status === 'error' ? 'Offline' : 'Initializing'}
          </Badge>
        </div>

        {/* Message */}
        <div className="text-sm text-gray-600">
          {status.message}
        </div>

        {/* Timestamp */}
        {status.timestamp && (
          <div className="text-xs text-gray-400">
            Last checked: {new Date(status.timestamp).toLocaleTimeString()}
          </div>
        )}

        {/* Demo Section */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Learning Demo</span>
            <Button
              variant="outline"
              size="sm"
              onClick={runDemo}
              disabled={demoRun || status.status !== 'healthy'}
              className="h-8"
            >
              {demoRun ? (
                <>
                  <Clock className="h-3 w-3 mr-1 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 mr-1" />
                  Test Learning
                </>
              )}
            </Button>
          </div>
          <div className="text-xs text-gray-500">
            Simulate user interactions to test the learning system
          </div>
        </div>

        {/* Refresh Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={checkStatus}
          disabled={loading}
          className="w-full text-xs"
        >
          {loading ? 'Checking...' : 'Refresh Status'}
        </Button>
      </CardContent>
    </Card>
  );
}