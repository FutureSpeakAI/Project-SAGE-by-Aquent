import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Trash2, ExternalLink, Plus } from "lucide-react";
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

  // Fetch saved content
  const { data: savedContents = [], isLoading } = useQuery<GeneratedContent[]>({
    queryKey: ['/api/generated-contents'],
    enabled: open,
  });

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
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <svg width="24" height="24" viewBox="0 0 24 24" className="mr-2 text-[#FF6600]">
              <path fill="currentColor" d="M3,3h18v18H3V3z M13,15l3-3l-3-3v6z M9,9l-3,3l3,3V9z"/>
            </svg>
            <span className="text-xl">Content Library</span>
          </DialogTitle>
          <DialogDescription>
            View and manage your saved generated content. Click on any content to load it into the editor.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin mb-2"></div>
            <p>Loading saved content...</p>
          </div>
        ) : savedContents && savedContents.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {savedContents.map((content: GeneratedContent) => (
                <Card key={content.id} className="relative hover:shadow-md transition-shadow group">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-center">
                      <span className="truncate">{content.title}</span>
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-[#FF6600]"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditContent(content);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContent(content.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {new Date(content.createdAt).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm text-gray-600 line-clamp-2">{content.content.substring(0, 150)}...</p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-[#FF6600] text-[#FF6600] hover:bg-[#FF6600] hover:text-white"
                      onClick={() => onSelectContent(content)}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Load this content
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium mb-1">No saved content yet</h3>
            <p className="text-gray-500 mb-4">
              Generate content and save it to build your library.
            </p>
          </div>
        )}
      </DialogContent>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Content Title</DialogTitle>
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