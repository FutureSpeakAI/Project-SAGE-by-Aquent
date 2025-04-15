import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCopy, Download, Upload, RefreshCw, Check, AlertCircle } from 'lucide-react';

interface ImportStats {
  promptsImported: number;
  personasImported: number;
  contentsImported: number;
  conversationsImported: number;
}

export function DataMigrationTool() {
  const [exportedData, setExportedData] = useState('');
  const [importData, setImportData] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const { toast } = useToast();

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const response = await fetch('/api/export-data');
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      const stringified = JSON.stringify(data, null, 2);
      setExportedData(stringified);
      
      toast({
        title: "Data Exported Successfully",
        description: "All your prompts, personas, and content have been exported.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!exportedData) {
      toast({
        title: "Nothing to Copy",
        description: "Please export data first.",
        variant: "destructive",
      });
      return;
    }
    
    navigator.clipboard.writeText(exportedData)
      .then(() => {
        toast({
          title: "Copied to Clipboard",
          description: "Data has been copied to your clipboard.",
        });
      })
      .catch((error) => {
        toast({
          title: "Copy Failed",
          description: "Could not copy to clipboard.",
          variant: "destructive",
        });
      });
  };

  const handleDownloadData = () => {
    if (!exportedData) {
      toast({
        title: "Nothing to Download",
        description: "Please export data first.",
        variant: "destructive",
      });
      return;
    }
    
    const blob = new Blob([exportedData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aquent-content-ai-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Your data file is being downloaded.",
    });
  };

  const handleImportData = async () => {
    try {
      if (!importData.trim()) {
        toast({
          title: "No Data to Import",
          description: "Please paste data to import first.",
          variant: "destructive",
        });
        return;
      }
      
      let dataObj;
      try {
        dataObj = JSON.parse(importData);
      } catch (e) {
        toast({
          title: "Invalid JSON",
          description: "The provided data is not valid JSON.",
          variant: "destructive",
        });
        return;
      }
      
      setIsImporting(true);
      
      const response = await fetch('/api/import-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: importData,
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const result = await response.json();
      setImportStats(result.stats);
      
      toast({
        title: "Data Imported Successfully",
        description: `Imported: ${result.stats.promptsImported} prompts, ${result.stats.personasImported} personas, ${result.stats.contentsImported} contents, ${result.stats.conversationsImported} conversations.`,
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import data",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Data Migration Tool</CardTitle>
        <CardDescription>Transfer your prompts, personas, and generated content between environments</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="export">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Export Data</TabsTrigger>
            <TabsTrigger value="import">Import Data</TabsTrigger>
          </TabsList>
          <TabsContent value="export">
            <div className="space-y-4 pt-4">
              <div className="flex justify-between">
                <Button 
                  onClick={handleExportData} 
                  disabled={isExporting}
                  className="mr-2"
                >
                  {isExporting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  {isExporting ? 'Exporting...' : 'Export All Data'}
                </Button>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCopyToClipboard}
                    disabled={!exportedData || isExporting}
                  >
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleDownloadData}
                    disabled={!exportedData || isExporting}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
              <Textarea 
                placeholder="Exported data will appear here..." 
                className="font-mono text-xs h-[300px]"
                value={exportedData}
                readOnly
              />
              <div className="text-sm text-gray-500">
                <p>Export your data to transfer to another environment or create a backup.</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="import">
            <div className="space-y-4 pt-4">
              <Textarea 
                placeholder="Paste exported data here to import..." 
                className="font-mono text-xs h-[300px]"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                disabled={isImporting}
              />
              <Button 
                onClick={handleImportData} 
                disabled={isImporting || !importData.trim()}
                className="w-full"
              >
                {isImporting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {isImporting ? 'Importing...' : 'Import Data'}
              </Button>
              
              {importStats && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mt-4">
                  <div className="flex">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <h3 className="font-medium text-green-800">Import Successful</h3>
                  </div>
                  <div className="mt-2 text-sm text-green-700">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>{importStats.promptsImported} prompts imported</li>
                      <li>{importStats.personasImported} personas imported</li>
                      <li>{importStats.contentsImported} contents imported</li>
                      <li>{importStats.conversationsImported} conversations imported</li>
                    </ul>
                  </div>
                </div>
              )}
              
              <div className="text-sm text-gray-500">
                <p>Import data from another environment. This will add to your existing data (it will not overwrite existing items).</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="bg-gray-50 border-t p-4">
        <div className="flex items-center text-sm text-gray-500">
          <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
          <p>Use this tool to transfer data between development and production environments.</p>
        </div>
      </CardFooter>
    </Card>
  );
}