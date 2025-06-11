import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, FileText, Image, Link2, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LinkContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: number;
  onSuccess: () => void;
}

export function LinkContentDialog({ open, onOpenChange, campaignId, onSuccess }: LinkContentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContent, setSelectedContent] = useState<number[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);

  const { data: contentList = [] } = useQuery({
    queryKey: ['/api/generated-contents'],
    queryFn: async () => {
      const response = await fetch('/api/generated-contents');
      if (!response.ok) throw new Error('Failed to fetch content');
      return response.json();
    },
    enabled: open
  });

  const { data: projectList = [] } = useQuery({
    queryKey: ['/api/image-projects'],
    queryFn: async () => {
      const response = await fetch('/api/image-projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
    enabled: open
  });

  const linkContentMutation = useMutation({
    mutationFn: async (contentId: number) => {
      const response = await fetch(`/api/campaigns/${campaignId}/link-content/${contentId}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to link content');
      return response.json();
    }
  });

  const linkProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await fetch(`/api/campaigns/${campaignId}/link-project/${projectId}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to link project');
      return response.json();
    }
  });

  const handleLinkSelected = async () => {
    try {
      // Link selected content
      for (const contentId of selectedContent) {
        await linkContentMutation.mutateAsync(contentId);
      }

      // Link selected projects
      for (const projectId of selectedProjects) {
        await linkProjectMutation.mutateAsync(projectId);
      }

      toast({
        title: "Assets linked successfully",
        description: `Linked ${selectedContent.length} content items and ${selectedProjects.length} projects to campaign.`
      });

      onSuccess();
      setSelectedContent([]);
      setSelectedProjects([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to link some assets. Please try again.",
        variant: "destructive"
      });
    }
  };

  const filteredContent = contentList.filter((content: any) =>
    content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    content.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProjects = projectList.filter((project: any) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleContentToggle = (contentId: number) => {
    setSelectedContent(prev =>
      prev.includes(contentId)
        ? prev.filter(id => id !== contentId)
        : [...prev, contentId]
    );
  };

  const handleProjectToggle = (projectId: number) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Assets to Campaign</DialogTitle>
          <DialogDescription>
            Select existing content and visual projects to link to this campaign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search content and projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selection Summary */}
          {(selectedContent.length > 0 || selectedProjects.length > 0) && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">{selectedContent.length} content selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">{selectedProjects.length} projects selected</span>
                    </div>
                  </div>
                  <Button 
                    onClick={handleLinkSelected}
                    disabled={selectedContent.length === 0 && selectedProjects.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Link Selected
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content">Content ({filteredContent.length})</TabsTrigger>
              <TabsTrigger value="projects">Visual Projects ({filteredProjects.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              {filteredContent.length > 0 ? (
                <div className="space-y-3">
                  {filteredContent.map((content: any) => (
                    <Card 
                      key={content.id} 
                      className={`cursor-pointer transition-all ${
                        selectedContent.includes(content.id) 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => handleContentToggle(content.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={selectedContent.includes(content.id)}
                            onChange={() => handleContentToggle(content.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900 truncate">{content.title}</h4>
                              <div className="flex items-center gap-2 ml-2">
                                <Badge variant="secondary">{content.contentType}</Badge>
                                {selectedContent.includes(content.id) && (
                                  <Check className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {content.content.substring(0, 200)}...
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>Created: {formatDate(content.createdAt)}</span>
                              {content.model && <span>Model: {content.model}</span>}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No content found</h3>
                    <p className="text-gray-600">
                      {searchQuery ? "Try adjusting your search terms" : "Create some content first to link to campaigns"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="projects" className="space-y-4">
              {filteredProjects.length > 0 ? (
                <div className="space-y-3">
                  {filteredProjects.map((project: any) => (
                    <Card 
                      key={project.id} 
                      className={`cursor-pointer transition-all ${
                        selectedProjects.includes(project.id) 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => handleProjectToggle(project.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={selectedProjects.includes(project.id)}
                            onChange={() => handleProjectToggle(project.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900 truncate">{project.name}</h4>
                              <div className="flex items-center gap-2 ml-2">
                                <Badge variant="outline">Visual Project</Badge>
                                {selectedProjects.includes(project.id) && (
                                  <Check className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                            </div>
                            {project.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {project.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>Created: {formatDate(project.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No visual projects found</h3>
                    <p className="text-gray-600">
                      {searchQuery ? "Try adjusting your search terms" : "Create some image projects first to link to campaigns"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleLinkSelected}
            disabled={selectedContent.length === 0 && selectedProjects.length === 0}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            <Link2 className="w-4 h-4 mr-2" />
            Link {selectedContent.length + selectedProjects.length} Assets
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}