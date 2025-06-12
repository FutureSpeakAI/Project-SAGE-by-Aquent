import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Save, X, Eye, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AssetEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: number;
  assetType: 'content' | 'visual';
  onSuccess: () => void;
}

export function AssetEditDialog({ open, onOpenChange, assetId, assetType, onSuccess }: AssetEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("edit");

  // Fetch asset data
  const { data: assetData, isLoading } = useQuery({
    queryKey: [assetType === 'content' ? '/api/generated-contents' : '/api/image-projects', assetId],
    queryFn: async () => {
      const endpoint = assetType === 'content' 
        ? `/api/generated-contents/${assetId}` 
        : `/api/image-projects/${assetId}`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch asset');
      return response.json();
    },
    enabled: open && !!assetId
  });

  // Fetch project images if visual asset
  const { data: projectImages } = useQuery({
    queryKey: ['/api/image-projects', assetId, 'images'],
    queryFn: async () => {
      const response = await fetch(`/api/image-projects/${assetId}/images`);
      if (!response.ok) throw new Error('Failed to fetch project images');
      return response.json();
    },
    enabled: open && assetType === 'visual' && !!assetId
  });

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (assetData) {
      setFormData(assetData);
    }
  }, [assetData]);

  // Update mutation for content
  const updateContentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/generated-contents/${assetId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/generated-contents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      toast({ title: "Content updated successfully" });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update content", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Update mutation for visual project
  const updateProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/image-projects/${assetId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/image-projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      toast({ title: "Visual project updated successfully" });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update visual project", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (assetType === 'content') {
      updateContentMutation.mutate(formData);
    } else {
      updateProjectMutation.mutate(formData);
    }
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {assetType === 'content' ? (
              <FileText className="w-5 h-5" />
            ) : (
              <Image className="w-5 h-5" />
            )}
            Edit {assetType === 'content' ? 'Content' : 'Visual Project'}
          </DialogTitle>
          <DialogDescription>
            Modify asset details, content, and campaign context.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="campaign">Campaign Context</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title || formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      [assetType === 'content' ? 'title' : 'name']: e.target.value 
                    }))}
                    required
                  />
                </div>

                {assetType === 'content' && (
                  <div className="space-y-2">
                    <Label htmlFor="contentType">Content Type</Label>
                    <Select 
                      value={formData.contentType || 'blog_post'} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, contentType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blog_post">Blog Post</SelectItem>
                        <SelectItem value="social_media">Social Media</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="press_release">Press Release</SelectItem>
                        <SelectItem value="web_copy">Web Copy</SelectItem>
                        <SelectItem value="ad_copy">Ad Copy</SelectItem>
                        <SelectItem value="newsletter">Newsletter</SelectItem>
                        <SelectItem value="case_study">Case Study</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {assetType === 'content' && (
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the content..."
                  />
                </div>
              )}

              {/* Content/Project Specific Fields */}
              {assetType === 'content' ? (
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="description">Project Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    placeholder="Describe the visual project..."
                  />
                </div>
              )}

              {/* AI Generation Parameters */}
              {assetType === 'content' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="model">AI Model</Label>
                    <Select 
                      value={formData.model || 'claude-sonnet-4-20250514'} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature</Label>
                    <Input
                      id="temperature"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={formData.temperature || '0.7'}
                      onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wordCount">Target Word Count</Label>
                    <Input
                      id="wordCount"
                      type="number"
                      value={formData.wordCount || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, wordCount: e.target.value }))}
                      placeholder="e.g. 800"
                    />
                  </div>
                </div>
              )}

              {/* Prompts */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userPrompt">User Prompt</Label>
                  <Textarea
                    id="userPrompt"
                    value={formData.userPrompt || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, userPrompt: e.target.value }))}
                    rows={3}
                    placeholder="The original user request or prompt..."
                  />
                </div>

                {assetType === 'content' && (
                  <div className="space-y-2">
                    <Label htmlFor="systemPrompt">System Prompt</Label>
                    <Textarea
                      id="systemPrompt"
                      value={formData.systemPrompt || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                      rows={3}
                      placeholder="System instructions for AI generation..."
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateContentMutation.isPending || updateProjectMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateContentMutation.isPending || updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {assetType === 'content' ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{formData.title}</CardTitle>
                    <CardDescription>
                      {formData.contentType?.replace('_', ' ')} • {formData.content?.split(' ').length || 0} words
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownload(formData.content || '', `${formData.title || 'content'}.txt`)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    {formData.content?.split('\n').map((paragraph: string, index: number) => (
                      <p key={index} className="mb-4">{paragraph}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{formData.name}</CardTitle>
                    <CardDescription>{formData.description}</CardDescription>
                  </CardHeader>
                </Card>
                
                {projectImages && projectImages.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectImages.map((image: any, index: number) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <img 
                            src={image.url} 
                            alt={`Generated image ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <div className="mt-2 text-sm text-gray-600">
                            {image.prompt && (
                              <p className="truncate">{image.prompt}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="campaign" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Context</CardTitle>
                <CardDescription>
                  How this asset relates to campaign objectives and deliverables
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.campaignContext ? (
                  <div className="space-y-3">
                    {formData.campaignContext.name && (
                      <div>
                        <Label className="text-sm font-medium">Campaign</Label>
                        <p className="text-sm text-gray-600">{formData.campaignContext.name}</p>
                      </div>
                    )}
                    
                    {formData.campaignContext.deliverableType && (
                      <div>
                        <Label className="text-sm font-medium">Deliverable Type</Label>
                        <Badge variant="secondary">{formData.campaignContext.deliverableType}</Badge>
                      </div>
                    )}
                    
                    {formData.campaignContext.brandGuidelines && (
                      <div>
                        <Label className="text-sm font-medium">Brand Guidelines</Label>
                        <p className="text-sm text-gray-600">{formData.campaignContext.brandGuidelines}</p>
                      </div>
                    )}
                    
                    {formData.campaignContext.briefingReference && (
                      <div>
                        <Label className="text-sm font-medium">Briefing Reference</Label>
                        <p className="text-sm text-gray-600">Brief ID: {formData.campaignContext.briefingReference}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No campaign context available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}