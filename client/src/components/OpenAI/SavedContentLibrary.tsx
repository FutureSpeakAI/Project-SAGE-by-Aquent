import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Trash2, ExternalLink, Plus, X, Loader2, FileText, Calendar } from "lucide-react";
import { GeneratedContent } from "@shared/schema";

interface SavedContentLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectContent: (content: GeneratedContent) => void;
}

export function SavedContentLibrary({ open, onOpenChange, onSelectContent }: SavedContentLibraryProps) {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<GeneratedContent | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Fetch saved content - only non-briefing content for the content library
  const { data: allContents = [], isLoading } = useQuery<GeneratedContent[]>({
    queryKey: ['/api/generated-contents'],
    enabled: open,
  });

  // Filter to only show general content (not briefing documents)
  const savedContents = allContents.filter(content => 
    content.contentType !== 'briefing' && content.contentType !== 'visual'
  );

  // Delete content mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/generated-contents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/generated-contents'] });
      toast({
        title: "Content deleted",
        description: "The content has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update content mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      return await apiRequest('PUT', `/api/generated-contents/${id}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/generated-contents'] });
      setEditDialogOpen(false);
      toast({
        title: "Content updated",
        description: "The content has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle edit button click
  const handleEditContent = (content: GeneratedContent) => {
    setSelectedContent(content);
    setEditTitle(content.title);
    setEditDialogOpen(true);
  };

  // Handle save edit
  const handleSaveEdit = () => {
    if (!selectedContent) return;
    updateMutation.mutate({ id: selectedContent.id, title: editTitle });
  };

  // Handle delete
  const handleDeleteContent = (id: number) => {
    if (confirm("Are you sure you want to delete this content? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 overflow-hidden" hideDefaultCloseButton>
        <DialogHeader className="p-4 md:p-6 border-b bg-[#FF6600]/5">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl font-bold text-[#FF6600]">Content Library</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-[#FF6600]/10">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <DialogDescription className="text-sm mt-1">
            Browse and select from your saved generated content
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-[calc(90vh-90px)] overflow-hidden">
          {/* Header with filter options could go here later */}

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-[#FF6600]" />
              </div>
            ) : savedContents.length === 0 ? (
              <div className="border rounded-lg p-8 text-center bg-white shadow-sm">
                <FileText className="h-16 w-16 mx-auto text-[#FF6600]/30 mb-4" />
                <h3 className="text-xl font-medium mb-2">No saved content yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Generate content and save it to build your library.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {savedContents.map((content: GeneratedContent) => (
                    <Card key={content.id} className="flex flex-col overflow-hidden border hover:border-[#FF6600]/70 transition-all shadow-sm hover:shadow-md bg-white group">
                      <CardHeader className="pb-3 bg-gray-50 group-hover:bg-[#FF6600]/5">
                        <div className="flex justify-between items-start">
                          <div className="w-4/5">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <CardTitle className="text-lg font-bold truncate" title={content.title}>
                                {content.title}
                              </CardTitle>
                            </div>
                            <CardDescription className="text-xs flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(content.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditContent(content);
                              }}
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 rounded-full hover:bg-[#FF6600]/10 text-[#FF6600]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteContent(content.id);
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
                              Content Preview:
                            </h4>
                            <div className="bg-gray-50 p-2.5 rounded-md border min-h-[100px] max-h-[150px] overflow-y-auto">
                              <p className="text-xs leading-relaxed line-clamp-6">{content.content.replace(/<[^>]*>/g, '').substring(0, 300)}...</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-1 pb-3 flex justify-end">
                        <Button 
                          onClick={() => onSelectContent(content)} 
                          className="bg-white text-[#FF6600] hover:bg-[#FF6600] hover:text-white border-[#FF6600] border w-full sm:w-auto"
                        >
                          <ExternalLink className="h-4 w-4 mr-1.5" />
                          <span>Load Content</span>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>

                {savedContents.length > 0 && (
                  <div className="flex justify-center mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing {savedContents.length} {savedContents.length === 1 ? 'content' : 'contents'}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent hideDefaultCloseButton>
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>Edit Content Title</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-gray-100">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}