import React, { useState, useMemo, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Trash2, 
  Filter, 
  Tag, 
  Upload, 
  FileText, 
  Calendar, 
  ExternalLink,
  X
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ContentType, GeneratedContent } from "@shared/schema";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Define interface for metadata structure
interface BriefingMetadata {
  category: string;
  [key: string]: any;
}

interface BriefingLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBriefing: (content: GeneratedContent) => void;
  onUploadDocument: () => void;
}

export function BriefingLibrary({ 
  open, 
  onOpenChange, 
  onSelectBriefing,
  onUploadDocument
}: BriefingLibraryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBriefing, setSelectedBriefing] = useState<GeneratedContent | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  
  // Fetch briefing content
  const { data: briefings = [], isLoading } = useQuery({
    queryKey: ['/api/generated-contents', ContentType.BRIEFING],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/generated-contents?contentType=${ContentType.BRIEFING}`);
      const data = await response.json();
      return data as GeneratedContent[];
    },
    enabled: open,
  });

  // Extract categories from metadata (or create "General" if none)
  const extractCategory = useCallback((briefing: GeneratedContent): string => {
    if (briefing.metadata && typeof briefing.metadata === 'string') {
      try {
        // Need to typecast to any to avoid type checking issues
        const metadataObj = JSON.parse(briefing.metadata) as any;
        if (metadataObj && metadataObj.category) {
          return metadataObj.category;
        }
      } catch (e) {
        // If metadata can't be parsed, fall back to default
      }
    }
    return "General";
  }, []);

  // Extract unique categories from briefings
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>(
      briefings.map(briefing => extractCategory(briefing))
    );
    return ["all", ...Array.from(uniqueCategories)];
  }, [briefings, extractCategory]);

  // Filter briefings by category
  const filteredBriefings = useMemo(() => {
    if (activeCategory === "all") {
      return briefings;
    }
    return briefings.filter(briefing => extractCategory(briefing) === activeCategory);
  }, [briefings, activeCategory, extractCategory]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/generated-contents/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/generated-contents'] });
      toast({
        title: "Briefing deleted",
        description: "The briefing has been successfully deleted.",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete briefing.",
        variant: "destructive",
      });
    }
  });

  // Format date for display
  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get a preview of the HTML content
  const getContentPreview = (htmlContent: string): string => {
    // Strip HTML tags to get plain text
    const plainText = htmlContent.replace(/<[^>]*>/g, '');
    return plainText;
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 overflow-hidden" hideDefaultCloseButton>
        <DialogHeader className="p-4 md:p-6 border-b bg-[#FF6600]/5">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl font-bold text-[#FF6600]">Briefing Library</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-[#FF6600]/10">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <DialogDescription className="text-sm mt-1">
            Browse and select from your saved creative briefs
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-[calc(90vh-90px)] overflow-hidden">
          <div className="flex justify-between items-center gap-4 bg-white p-4 border-b">
            <div className="flex-1">
              <Select
                value={activeCategory}
                onValueChange={setActiveCategory}
              >
                <SelectTrigger className="w-[180px] border-[#FF6600]/20 focus:ring-[#FF6600]/20">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-[#FF6600]" />
                    <SelectValue placeholder="Filter by category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={onUploadDocument} 
              className="flex items-center gap-2 bg-[#FF6600] hover:bg-[#FF6600]/90"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Briefing</span>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-[#FF6600]" />
              </div>
            ) : filteredBriefings.length === 0 ? (
              <div className="border rounded-lg p-8 text-center bg-white shadow-sm">
                <FileText className="h-16 w-16 mx-auto text-[#FF6600]/30 mb-4" />
                <h3 className="text-xl font-medium mb-2">
                  {briefings.length === 0 
                    ? "No saved briefings" 
                    : `No briefings found in "${activeCategory === "all" ? "All Categories" : activeCategory}"`}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {briefings.length === 0 
                    ? "Create and save briefings to quickly use them for content generation."
                    : "Try selecting a different category or upload a new briefing document."}
                </p>
                <Button 
                  onClick={onUploadDocument} 
                  className="bg-[#FF6600] hover:bg-[#FF6600]/90"
                >
                  Upload {briefings.length === 0 ? "Your First" : "A New"} Briefing
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredBriefings.map((briefing) => (
                    <Card key={briefing.id} className="flex flex-col overflow-hidden border hover:border-[#FF6600]/70 transition-all shadow-sm hover:shadow-md bg-white group">
                      <CardHeader className="pb-3 bg-gray-50 group-hover:bg-[#FF6600]/5">
                        <div className="flex justify-between items-start">
                          <div className="w-4/5">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <CardTitle className="text-lg font-bold truncate" title={briefing.title}>
                                {briefing.title}
                              </CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-[#FF6600]/10 text-[#FF6600] border-[#FF6600]/20 capitalize">
                                <Tag className="h-3 w-3 mr-1" />
                                {extractCategory(briefing)}
                              </Badge>
                              <CardDescription className="text-xs flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(briefing.createdAt)}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              onClick={() => {
                                setSelectedBriefing(briefing);
                                setIsDeleteDialogOpen(true);
                              }} 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 rounded-full hover:bg-red-100 text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="py-3 flex-grow">
                        <div className="flex flex-col gap-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-xs mb-1.5 text-[#FF6600] flex items-center">
                              Briefing Content:
                            </h4>
                            <div className="bg-gray-50 p-2.5 rounded-md border min-h-[100px] max-h-[150px] overflow-y-auto">
                              <p className="text-xs leading-relaxed line-clamp-6">{getContentPreview(briefing.content)}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-1 pb-3 flex justify-end">
                        <Button 
                          onClick={() => onSelectBriefing(briefing)} 
                          className="bg-white text-[#FF6600] hover:bg-[#FF6600] hover:text-white border-[#FF6600] border w-full sm:w-auto"
                        >
                          <ExternalLink className="h-4 w-4 mr-1.5" />
                          <span>Use Briefing</span>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>

                {filteredBriefings.length > 0 && (
                  <div className="flex justify-center mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredBriefings.length} {filteredBriefings.length === 1 ? 'briefing' : 'briefings'} 
                      {activeCategory !== 'all' ? ` in category "${activeCategory}"` : ''}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog - Outside main dialog to prevent overflow */}
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent className="max-w-sm mx-4 max-h-screen overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">Delete Briefing?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm break-words">
            Delete "{selectedBriefing?.title?.substring(0, 50) || ''}{selectedBriefing?.title && selectedBriefing.title.length > 50 ? '...' : ''}"?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel 
            onClick={() => setIsDeleteDialogOpen(false)}
            className="flex-1"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => {
              if (selectedBriefing) {
                deleteMutation.mutate(selectedBriefing.id);
              }
            }}
            className="bg-red-500 hover:bg-red-600 flex-1"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}