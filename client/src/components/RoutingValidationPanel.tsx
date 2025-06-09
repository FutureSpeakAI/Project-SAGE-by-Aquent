import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, XCircle, Clock, Zap, Activity, AlertTriangle } from 'lucide-react';

interface ValidationResult {
  testId: string;
  passed: boolean;
  actualProvider: string;
  expectedProvider: string;
  actualReasoning: boolean;
  expectedReasoning: boolean;
  rationale: string;
  responseTime: number;
  errors: string[];
}

interface ValidationSummary {
  totalTests: number;
  passed: number;
  failed: number;
  successRate: number;
  avgResponseTime: number;
}

interface ProviderHealth {
  provider: string;
  isHealthy: boolean;
  lastChecked: string;
  responseTime: number;
  errorCount: number;
  lastError?: string;
}

export function RoutingValidationPanel() {
  const [isRunningValidation, setIsRunningValidation] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    summary: ValidationSummary;
    results: ValidationResult[];
  } | null>(null);
  const [providerHealth, setProviderHealth] = useState<{
    healthStatus: ProviderHealth[];
    healthyProviders: string[];
  } | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const [customContext, setCustomContext] = useState('');
  const [testConfig, setTestConfig] = useState({
    enabled: true,
    manualProvider: '',
    forceReasoning: false
  });
  const [customTestResult, setCustomTestResult] = useState<any>(null);

  const runValidationSuite = async () => {
    setIsRunningValidation(true);
    try {
      const response = await fetch('/api/validate-routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      setValidationResults(data);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsRunningValidation(false);
    }
  };

  const checkProviderHealth = async () => {
    try {
      const response = await fetch('/api/provider-health');
      const data = await response.json();
      setProviderHealth(data);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const testCustomQuery = async () => {
    if (!customQuery.trim()) return;
    
    try {
      const response = await fetch('/api/test-routing-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: customQuery,
          context: customContext,
          config: testConfig.enabled ? {
            enabled: true,
            ...(testConfig.manualProvider && { manualProvider: testConfig.manualProvider }),
            forceReasoning: testConfig.forceReasoning
          } : { enabled: false }
        })
      });
      const data = await response.json();
      setCustomTestResult(data);
    } catch (error) {
      console.error('Custom test failed:', error);
    }
  };

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'openai': return 'bg-green-500';
      case 'anthropic': return 'bg-blue-500';
      case 'gemini': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthBadgeColor = (isHealthy: boolean) => {
    return isHealthy ? 'bg-green-500' : 'bg-red-500';
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Smart AI Routing Validation</h2>
        <div className="flex gap-2">
          <Button onClick={checkProviderHealth} variant="outline">
            <Activity className="w-4 h-4 mr-2" />
            Check Health
          </Button>
          <Button 
            onClick={runValidationSuite} 
            disabled={isRunningValidation}
            className="bg-gradient-to-r from-blue-500 to-purple-600"
          >
            {isRunningValidation ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Run Full Suite
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Provider Health Status */}
      {providerHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Provider Health Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {providerHealth.healthStatus.map((provider) => (
                <div key={provider.provider} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold capitalize">{provider.provider}</span>
                    <Badge className={getHealthBadgeColor(provider.isHealthy)}>
                      {provider.isHealthy ? 'Healthy' : 'Unhealthy'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>Response Time: {provider.responseTime}ms</div>
                    <div>Error Count: {provider.errorCount}</div>
                    <div>Last Checked: {new Date(provider.lastChecked).toLocaleTimeString()}</div>
                    {provider.lastError && (
                      <div className="text-red-500 mt-1">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        {provider.lastError.slice(0, 50)}...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Label>Healthy Providers: </Label>
              <div className="flex gap-2 mt-1">
                {providerHealth.healthyProviders.map(provider => (
                  <Badge key={provider} className={getProviderBadgeColor(provider)}>
                    {provider}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Query Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Test Custom Query</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="customQuery">Query</Label>
            <Textarea
              id="customQuery"
              placeholder="Enter your test query here..."
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="customContext">Research Context (Optional)</Label>
            <Textarea
              id="customContext"
              placeholder="Additional context for research..."
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={testConfig.enabled}
                onCheckedChange={(checked) => setTestConfig(prev => ({ ...prev, enabled: checked }))}
              />
              <Label>Smart Routing Enabled</Label>
            </div>
            <div>
              <Label>Manual Provider</Label>
              <Select 
                value={testConfig.manualProvider} 
                onValueChange={(value) => setTestConfig(prev => ({ ...prev, manualProvider: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto Select</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={testConfig.forceReasoning}
                onCheckedChange={(checked) => setTestConfig(prev => ({ ...prev, forceReasoning: checked }))}
              />
              <Label>Force Reasoning</Label>
            </div>
          </div>
          <Button onClick={testCustomQuery} className="w-full">
            Test Routing Decision
          </Button>
          
          {customTestResult && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Routing Decision:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Provider:</strong> 
                  <Badge className={`ml-2 ${getProviderBadgeColor(customTestResult.decision.provider)}`}>
                    {customTestResult.decision.provider}
                  </Badge>
                </div>
                <div><strong>Model:</strong> {customTestResult.decision.model}</div>
                <div><strong>Use Reasoning:</strong> {customTestResult.decision.useReasoning ? 'Yes' : 'No'}</div>
                <div><strong>Response Time:</strong> {customTestResult.responseTime}ms</div>
              </div>
              <div className="mt-2">
                <strong>Rationale:</strong> {customTestResult.decision.rationale}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Validation Results
              <Badge variant={validationResults.summary.successRate >= 90 ? "default" : "destructive"}>
                {validationResults.summary.successRate.toFixed(1)}% Success Rate
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{validationResults.summary.totalTests}</div>
                <div className="text-sm text-muted-foreground">Total Tests</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{validationResults.summary.passed}</div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{validationResults.summary.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{validationResults.summary.avgResponseTime.toFixed(0)}ms</div>
                <div className="text-sm text-muted-foreground">Avg Response</div>
              </div>
            </div>

            <div className="mb-4">
              <Progress 
                value={validationResults.summary.successRate} 
                className="h-3"
              />
            </div>

            <div className="space-y-3">
              {validationResults.results.map((result) => (
                <div 
                  key={result.testId} 
                  className={`p-4 rounded-lg border ${result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.passed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-semibold">{result.testId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getProviderBadgeColor(result.actualProvider)}>
                        {result.actualProvider}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{result.responseTime}ms</span>
                    </div>
                  </div>
                  
                  {!result.passed && (
                    <div className="text-sm space-y-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <strong>Expected:</strong> {result.expectedProvider} 
                          {result.expectedReasoning && ' + Reasoning'}
                        </div>
                        <div>
                          <strong>Actual:</strong> {result.actualProvider}
                          {result.actualReasoning && ' + Reasoning'}
                        </div>
                      </div>
                      {result.errors.length > 0 && (
                        <div className="text-red-600 mt-2">
                          <strong>Errors:</strong> {result.errors.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="text-sm text-muted-foreground mt-2">
                    <strong>Rationale:</strong> {result.rationale}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}