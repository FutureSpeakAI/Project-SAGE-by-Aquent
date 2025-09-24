import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import { 
  Upload, 
  FileText, 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileQuestion,
  Sparkles,
  MessageCircle
} from "lucide-react";

interface RFPQuestion {
  question: string;
  pineconeSources: string[];
  generatedAnswer: string;
}

interface RFPResponse {
  uploadedFile: string;
  extractedQuestions: string[];
  responses: RFPQuestion[];
  generatedAt: Date;
}

export function RFPResponseTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [rfpResponse, setRfpResponse] = useState<RFPResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (['pdf', 'docx', 'txt'].includes(fileExt || '')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("Please upload a PDF, DOCX, or TXT file");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (['pdf', 'docx', 'txt'].includes(fileExt || '')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("Please upload a PDF, DOCX, or TXT file");
      }
    }
  };

  const processRFP = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setIsGenerating(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      console.log('Starting RFP processing for file:', selectedFile.name);
      
      // Note: This may take several minutes for documents with many questions
      const response = await fetch('/api/rfp/process', {
        method: 'POST',
        body: formData,
        // No timeout - let it complete
      });

      console.log('Response received:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to process RFP');
      }

      const data = await response.json();
      console.log('RFP Response data:', data);
      
      setRfpResponse(data);
      
      toast({
        title: "RFP Processed Successfully",
        description: `Extracted ${data.extractedQuestions.length} questions and generated responses.`,
      });
    } catch (err) {
      console.error('RFP processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process RFP';
      setError(errorMessage);
      toast({
        title: "Processing Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsGenerating(false);
    }
  };

  const downloadDOCX = async () => {
    if (!rfpResponse) return;

    try {
      const response = await fetch('/api/rfp/generate-docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rfpResponse),
      });

      if (!response.ok) {
        throw new Error('Failed to generate DOCX');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RFP_Response_${Date.now()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: "Your RFP response has been downloaded as a Word document.",
      });
    } catch (err) {
      toast({
        title: "Download Failed",
        description: "Failed to generate DOCX file.",
        variant: "destructive",
      });
    }
  };

  const downloadPDF = async () => {
    if (!rfpResponse) return;

    try {
      const response = await fetch('/api/rfp/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rfpResponse),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RFP_Response_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: "Your RFP response has been downloaded as a PDF.",
      });
    } catch (err) {
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF file.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-50 to-red-50">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <FileQuestion className="h-6 w-6 text-orange-500" />
            RFP/RFI Response Engine
          </CardTitle>
          <CardDescription>
            Upload your RFP document to automatically extract requirements and generate comprehensive responses
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Upload Section */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Upload RFP Document</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-all
              ${isDragging ? 'border-orange-500 bg-orange-50' : 'border-gray-300'}
              ${selectedFile ? 'bg-green-50 border-green-500' : 'hover:border-gray-400'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {selectedFile ? (
              <div className="space-y-2">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-gray-600">
                    Drag and drop your RFP document here, or
                  </p>
                  <Button
                    variant="link"
                    className="text-orange-500"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    browse to upload
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Supports PDF, DOCX, and TXT files up to 20MB
                </p>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {selectedFile && !rfpResponse && (
            <Button
              onClick={processRFP}
              disabled={isGenerating}
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing RFP... This may take 1-2 minutes
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Responses
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {rfpResponse && (
        <>
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Extracted Questions & Responses</span>
                <Badge variant="secondary">
                  {rfpResponse.responses.length} Questions
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {rfpResponse.responses.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <Badge className="mt-1" variant="outline">
                          Q{index + 1}
                        </Badge>
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.question}
                            </p>
                          </div>
                          <Separator />
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Response:</p>
                            <div className="prose prose-sm max-w-none text-gray-700">
                              <ReactMarkdown 
                                components={{
                                  a: ({ href, children }) => (
                                    <a 
                                      href={href} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline font-medium"
                                    >
                                      {children}
                                    </a>
                                  ),
                                  p: ({ children }) => {
                                    // Process children to replace citation markers with superscripts
                                    const processedChildren = Array.isArray(children) 
                                      ? children.map((child, index) => {
                                          if (typeof child === 'string') {
                                            // Replace ^[n] with superscript
                                            const parts = child.split(/\^\[(\d+)\]/g);
                                            return parts.map((part, i) => {
                                              if (i % 2 === 1) {
                                                // This is a citation number
                                                return <sup key={`sup-${index}-${i}`} className="text-blue-600 font-semibold">[{part}]</sup>;
                                              }
                                              return part;
                                            });
                                          }
                                          return child;
                                        })
                                      : children;
                                    return <p className="mb-2 last:mb-0">{processedChildren}</p>;
                                  },
                                  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                  ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                                  li: ({ children }) => {
                                    // Also process list items for citations
                                    const processedChildren = Array.isArray(children) 
                                      ? children.map((child, index) => {
                                          if (typeof child === 'string') {
                                            const parts = child.split(/\^\[(\d+)\]/g);
                                            return parts.map((part, i) => {
                                              if (i % 2 === 1) {
                                                return <sup key={`sup-li-${index}-${i}`} className="text-blue-600 font-semibold">[{part}]</sup>;
                                              }
                                              return part;
                                            });
                                          }
                                          return child;
                                        })
                                      : children;
                                    return <li className="mb-1">{processedChildren}</li>;
                                  }
                                }}
                              >
                                {item.generatedAnswer}
                              </ReactMarkdown>
                            </div>
                          </div>
                          {item.pineconeSources.length > 0 && (
                            <div className="pt-2">
                              <p className="text-xs text-gray-500">
                                Sources: {item.pineconeSources.join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Export Actions */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Export Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  onClick={downloadDOCX}
                  variant="default"
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download as DOCX
                </Button>
                <Button
                  onClick={downloadPDF}
                  variant="outline"
                  className="flex-1"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Download as PDF
                </Button>
              </div>
              <div className="mt-4">
                <Button
                  onClick={() => {
                    setSelectedFile(null);
                    setRfpResponse(null);
                    setError(null);
                  }}
                  variant="ghost"
                  className="w-full"
                >
                  Process Another RFP
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Chat Assistant Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={() => setChatOpen(!chatOpen)}
          size="lg"
          className="rounded-full shadow-lg bg-orange-500 hover:bg-orange-600"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      </div>

      {/* Chat Panel (placeholder for future implementation) */}
      {chatOpen && (
        <Card className="fixed bottom-20 right-6 w-80 shadow-xl">
          <CardHeader>
            <CardTitle className="text-base">RFP Assistant</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Chat assistant coming soon! Ask questions about RFP best practices, get help with responses, or clarify requirements.
            </p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}