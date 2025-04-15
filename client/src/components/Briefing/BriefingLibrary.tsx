import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ContentType, GeneratedContent } from "@shared/schema";

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
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch briefing content
  const { data: briefings = [], isLoading } = useQuery({
    queryKey: ['/api/generated-contents', ContentType.BRIEFING],
    queryFn: () => apiRequest<GeneratedContent[]>('GET', `/api/generated-contents?type=${ContentType.BRIEFING}`),
    enabled: open,
  });

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
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete briefing.",
        variant: "destructive",
      });
    }
  });

  // Filter briefings based on search term
  const filteredBriefings = briefings.filter(briefing => 
    briefing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    briefing.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteBriefing = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Briefing Library</DialogTitle>
          <DialogDescription>
            Select a briefing to use as a reference for content creation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-between items-center mb-4">
          <div className="relative flex-grow mr-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search briefings..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={onUploadDocument}>
            Upload Document
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 pr-2">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredBriefings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No briefings found matching your search." : "No briefings saved yet."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredBriefings.map((briefing) => (
                <div
                  key={briefing.id}
                  onClick={() => onSelectBriefing(briefing)}
                  className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors relative group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{briefing.title}</h3>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => handleDeleteBriefing(briefing.id, e)}
                        className="h-7 w-7 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {briefing.content}
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(briefing.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}