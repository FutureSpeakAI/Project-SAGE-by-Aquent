import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar, Target, Users, BarChart3, FileText, Image, Link2 } from "lucide-react";
import { CampaignCreateDialog } from "@/components/Campaign/CampaignCreateDialog";
import { CampaignDetailView } from "@/components/Campaign/CampaignDetailView";
import { LinkContentDialog } from "@/components/Campaign/LinkContentDialog";
import { apiRequest } from "@/lib/queryClient";

interface SimpleCampaign {
  id: number;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  startDate?: string;
  endDate?: string;
  budget?: string;
  objectives: string[];
  targetAudience: {
    primary?: string;
    secondary?: string;
    demographics?: string;
    psychographics?: string;
  };
  brandGuidelines: {
    voice?: string;
    tone?: string;
    colors?: string[];
    fonts?: string[];
    imagery?: string;
    messaging?: string[];
  };
  deliverables: Array<{
    type: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
    dueDate?: string;
    assignedTo?: string;
    linkedAssets?: number[];
  }>;
  teamMembers: Array<{
    name: string;
    role: string;
    email?: string;
  }>;
  linkedContent: number[];
  linkedProjects: number[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export function CampaignPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['/api/campaigns', searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('query', searchQuery);
      if (statusFilter) params.set('status', statusFilter);
      
      const response = await fetch(`/api/campaigns?${params}`);
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      return response.json() as Promise<SimpleCampaign[]>;
    }
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/campaigns/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      setSelectedCampaign(null);
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'archived': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  if (selectedCampaign) {
    return (
      <CampaignDetailView
        campaignId={selectedCampaign}
        onBack={() => setSelectedCampaign(null)}
        onShowLinkDialog={() => setShowLinkDialog(true)}
        onNavigateToContent={(contentId) => {
          // Navigate to Content tab with specific content loaded
          window.location.hash = '#content';
          localStorage.setItem('loadContentId', contentId.toString());
          setSelectedCampaign(null);
        }}
        onNavigateToVisual={(projectId) => {
          // Navigate to Visual tab with specific project loaded
          window.location.hash = '#visual';
          localStorage.setItem('loadProjectId', projectId.toString());
          setSelectedCampaign(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campaign Management</h1>
            <p className="text-gray-600 mt-1">Coordinate briefings, content, and visuals across campaigns</p>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || statusFilter ? 
                  "Try adjusting your search criteria" : 
                  "Create your first campaign to get started"
                }
              </p>
              {!searchQuery && !statusFilter && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <Card 
                key={campaign.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedCampaign(campaign.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {campaign.description || "No description provided"}
                      </CardDescription>
                    </div>
                    <Badge className={`ml-2 ${getStatusColor(campaign.status)} text-white`}>
                      {campaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Timeline */}
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</span>
                  </div>

                  {/* Objectives */}
                  {campaign.objectives.length > 0 && (
                    <div className="flex items-start text-sm text-gray-600">
                      <Target className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">
                        {campaign.objectives.slice(0, 2).join(", ")}
                        {campaign.objectives.length > 2 && ` +${campaign.objectives.length - 2} more`}
                      </span>
                    </div>
                  )}

                  {/* Team */}
                  {campaign.teamMembers.length > 0 && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      <span>{campaign.teamMembers.length} team member{campaign.teamMembers.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}

                  {/* Assets Summary */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center text-gray-600">
                      <FileText className="w-3 h-3 mr-1" />
                      <span>{campaign.linkedContent.length}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Image className="w-3 h-3 mr-1" />
                      <span>{campaign.linkedProjects.length}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <BarChart3 className="w-3 h-3 mr-1" />
                      <span>{campaign.deliverables.filter(d => d.status === 'completed').length}/{campaign.deliverables.length}</span>
                    </div>
                  </div>

                  {/* Budget */}
                  {campaign.budget && (
                    <div className="text-sm font-medium text-green-600">
                      Budget: {campaign.budget}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialogs */}
        <CampaignCreateDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
            setShowCreateDialog(false);
          }}
        />

        {selectedCampaign && (
          <LinkContentDialog
            open={showLinkDialog}
            onOpenChange={setShowLinkDialog}
            campaignId={selectedCampaign}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
              setShowLinkDialog(false);
            }}
          />
        )}
      </div>
    </div>
  );
}