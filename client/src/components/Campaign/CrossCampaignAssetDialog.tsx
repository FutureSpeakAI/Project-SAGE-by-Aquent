import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Image, Move, Link2, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CrossCampaignAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCampaignId: number;
  onSuccess: () => void;
}

export function CrossCampaignAssetDialog({ open, onOpenChange, currentCampaignId, onSuccess }: CrossCampaignAssetDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("content");
  const [searchQuery, setSearchQuery] = useState("");
  const [targetCampaignId, setTargetCampaignId] = useState<string>("");
  const [selectedAssets, setSelectedAssets] = useState<Array<{ id: number; type: 'content' | 'visual' }>>([]);

  // Fetch all campaigns for target selection
  const { data: campaigns } = useQuery({
    queryKey: ['/api/campaigns'],
    queryFn: async () => {
      const response = await fetch('/api/campaigns');
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      return response.json();
    },
    enabled: open
  });

  // Fetch content assets
  const { data: contentAssets } = useQuery({
    queryKey: ['/api/generated-contents'],
    queryFn: async () => {
      const response = await fetch('/api/generated-contents');
      if (!response.ok) throw new Error('Failed to fetch content');
      return response.json();
    },
    enabled: open
  });

  // Fetch visual projects
  const { data: visualAssets } = useQuery({
    queryKey: ['/api/image-projects'],
    queryFn: async () => {
      const response = await fetch('/api/image-projects');
      if (!response.ok) throw new Error('Failed to fetch visual projects');
      return response.json();
    },
    enabled: open
  });

  // Link assets to campaign mutation
  const linkAssetsMutation = useMutation({
    mutationFn: async ({ targetCampaignId, assetIds }: { targetCampaignId: number; assetIds: Array<{ id: number; type: string }> }) => {
      const promises = assetIds.map(asset => {
        if (asset.type === 'content') {
          return apiRequest(`/api/campaigns/${targetCampaignId}/link-content/${asset.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          return apiRequest(`/api/campaigns/${targetCampaignId}/link-project/${asset.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
        }
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      toast({ title: `Successfully linked ${selectedAssets.length} assets to campaign` });
      onSuccess();
      onOpenChange(false);
      setSelectedAssets([]);
      setTargetCampaignId("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to link assets", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleAssetToggle = (assetId: number, assetType: 'content' | 'visual') => {
    const assetKey = `${assetType}-${assetId}`;
    const isSelected = selectedAssets.some(asset => asset.id === assetId && asset.type === assetType);
    
    if (isSelected) {
      setSelectedAssets(prev => prev.filter(asset => !(asset.id === assetId && asset.type === assetType)));
    } else {
      setSelectedAssets(prev => [...prev, { id: assetId, type: assetType }]);
    }
  };

  const handleLinkAssets = () => {
    if (!targetCampaignId || selectedAssets.length === 0) return;
    
    linkAssetsMutation.mutate({
      targetCampaignId: parseInt(targetCampaignId),
      assetIds: selectedAssets
    });
  };

  const filterAssets = (assets: any[]) => {
    if (!searchQuery) return assets;
    return assets.filter(asset => 
      asset.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const availableCampaigns = campaigns?.filter((campaign: any) => campaign.id !== currentCampaignId) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="w-5 h-5" />
            Assign Assets to Campaign
          </DialogTitle>
          <DialogDescription>
            Select assets to link to another campaign. Assets can be linked to multiple campaigns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Target Campaign Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetCampaign">Target Campaign</Label>
              <Select value={targetCampaignId} onValueChange={setTargetCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign to link assets to..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCampaigns.map((campaign: any) => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Search Assets</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by title, name, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Selected Assets Summary */}
          {selectedAssets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Selected Assets ({selectedAssets.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedAssets.map((asset, index) => (
                    <Badge key={`${asset.type}-${asset.id}`} variant="secondary">
                      {asset.type === 'content' ? <FileText className="w-3 h-3 mr-1" /> : <Image className="w-3 h-3 mr-1" />}
                      {asset.type} #{asset.id}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Asset Selection Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content">
                Content Assets ({contentAssets?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="visual">
                Visual Assets ({visualAssets?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              {contentAssets && contentAssets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {filterAssets(contentAssets).map((content: any) => {
                    const isSelected = selectedAssets.some(asset => asset.id === content.id && asset.type === 'content');
                    return (
                      <Card 
                        key={content.id} 
                        className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}`}
                        onClick={() => handleAssetToggle(content.id, 'content')}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-sm font-medium line-clamp-2">
                                {content.title}
                              </CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {content.contentType?.replace('_', ' ')} • {content.content?.split(' ').length || 0} words
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                              <Checkbox 
                                checked={isSelected}
                                onChange={() => handleAssetToggle(content.id, 'content')}
                              />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-xs text-gray-600 line-clamp-3">
                            {content.content?.substring(0, 150)}...
                          </p>
                          {content.campaignContext?.name && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              Currently in: {content.campaignContext.name}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="text-center py-8">
                  <CardContent>
                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No content assets available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="visual" className="space-y-4">
              {visualAssets && visualAssets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {filterAssets(visualAssets).map((project: any) => {
                    const isSelected = selectedAssets.some(asset => asset.id === project.id && asset.type === 'visual');
                    return (
                      <Card 
                        key={project.id} 
                        className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}`}
                        onClick={() => handleAssetToggle(project.id, 'visual')}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-sm font-medium line-clamp-2">
                                {project.name}
                              </CardTitle>
                              <CardDescription className="text-xs mt-1">
                                Visual project • {project.images?.length || 0} images
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                              <Checkbox 
                                checked={isSelected}
                                onChange={() => handleAssetToggle(project.id, 'visual')}
                              />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-xs text-gray-600 line-clamp-3">
                            {project.description || 'No description available'}
                          </p>
                          {project.campaignContext?.name && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              Currently in: {project.campaignContext.name}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="text-center py-8">
                  <CardContent>
                    <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No visual assets available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleLinkAssets}
            disabled={!targetCampaignId || selectedAssets.length === 0 || linkAssetsMutation.isPending}
          >
            <Link2 className="w-4 h-4 mr-2" />
            {linkAssetsMutation.isPending ? 'Linking...' : `Link ${selectedAssets.length} Asset${selectedAssets.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}