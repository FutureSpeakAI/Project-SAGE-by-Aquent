import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Upload, Database, Save, ClipboardCopy, CheckCircle2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface DataMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataMigrationDialog({ open, onOpenChange }: DataMigrationDialogProps) {
  const [exportedData, setExportedData] = useState('');
  const [importData, setImportData] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export-data');
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      const data = await response.json();
      setExportedData(JSON.stringify(data, null, 2));
      toast({
        title: 'Data Exported',
        description: 'Your data has been successfully exported.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export data.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(exportedData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied to Clipboard',
      description: 'Data has been copied to your clipboard.',
    });
  };

  const handleImportData = async () => {
    if (!importData.trim()) {
      toast({
        title: 'Import Failed',
        description: 'Please paste the exported data first.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    try {
      let dataToImport;
      try {
        dataToImport = JSON.parse(importData);
      } catch (e) {
        throw new Error('Invalid JSON format. Please make sure you paste the entire exported data.');
      }

      const response = await fetch('/api/import-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToImport),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import data');
      }

      toast({
        title: 'Data Imported',
        description: 'Your data has been successfully imported.',
      });
      
      // Reset input field after successful import
      setImportData('');
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import data.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-[#F15A22]" />
            Data Migration Tool
          </DialogTitle>
          <DialogDescription>
            Export your prompts, personas, and saved content from this environment and import them into another.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Export Data</TabsTrigger>
            <TabsTrigger value="import">Import Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="export" className="space-y-4">
            <div className="flex flex-col space-y-2">
              <p className="text-sm text-muted-foreground">
                Click the button below to export all your saved data. Copy the exported text and save it somewhere safe.
              </p>
              
              <Button 
                variant="outline" 
                onClick={handleExportData}
                disabled={isExporting}
                className="bg-white text-[#F15A22] hover:bg-[#F15A22] hover:text-white border-[#F15A22] w-full"
              >
                {isExporting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-[#F15A22] border-t-transparent" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export All Data
                  </>
                )}
              </Button>
              
              {exportedData && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Exported Data:</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleCopyToClipboard}
                      className="text-[#F15A22] hover:text-[#F15A22]/80"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                      ) : (
                        <ClipboardCopy className="h-4 w-4 mr-1" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <Textarea 
                    value={exportedData} 
                    readOnly 
                    className="h-[200px] font-mono text-xs resize-none"
                  />
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="import" className="space-y-4">
            <div className="flex flex-col space-y-2">
              <p className="text-sm text-muted-foreground">
                Paste the exported data below and click Import to load your saved prompts, personas, and content.
              </p>
              
              <Textarea 
                value={importData} 
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste your exported data here..."
                className="h-[200px] font-mono text-xs resize-none"
              />
              
              <Button 
                variant="outline" 
                onClick={handleImportData}
                disabled={isImporting || !importData.trim()}
                className="bg-white text-[#F15A22] hover:bg-[#F15A22] hover:text-white border-[#F15A22] w-full"
              >
                {isImporting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-[#F15A22] border-t-transparent" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            This tool helps you transfer your data between development and deployed environments.
          </p>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}