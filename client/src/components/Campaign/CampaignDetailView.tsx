import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Calendar, 
  Target, 
  Users, 
  BarChart3, 
  FileText, 
  Image, 
  Link2, 
  Edit, 
  Trash2,
  DollarSign,
  Clock,
  CheckCircle2,
  X
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface CampaignDetailViewProps {
  campaignId: number;
  onBack: () => void;
  onShowLinkDialog: () => void;
}

export function CampaignDetailView({ campaignId, onBack, onShowLinkDialog }: CampaignDetailViewProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Content editing dialog state
  const [contentEditDialog, setContentEditDialog] = useState({ open: false, content: null });
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  
  // Visual project editing dialog state
  const [visualEditDialog, setVisualEditDialog] = useState({ open: false, project: null });
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");

  const { data: campaignData, isLoading } = useQuery({
    queryKey: ['/api/campaigns', campaignId],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      if (!response.ok) throw new Error('Failed to fetch campaign');
      return response.json();
    }
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: () => apiRequest(`/api/campaigns/${campaignId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      onBack();
    }
  });

  // Content update mutation
  const updateContentMutation = useMutation({
    mutationFn: (data: { id: number; title: string; content: string }) => 
      apiRequest(`/api/content/${data.id}`, { 
        method: 'PATCH', 
        body: JSON.stringify({ title: data.title, content: data.content })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId] });
      setContentEditDialog({ open: false, content: null });
    }
  });

  // Visual project update mutation
  const updateProjectMutation = useMutation({
    mutationFn: (data: { id: number; name: string; description: string }) => 
      apiRequest(`/api/projects/${data.id}`, { 
        method: 'PATCH', 
        body: JSON.stringify({ name: data.name, description: data.description })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId] });
      setVisualEditDialog({ open: false, project: null });
    }
  });

  // Handle content edit
  const handleEditContent = (content: any) => {
    setEditTitle(content.title);
    setEditContent(content.content);
    setContentEditDialog({ open: true, content });
  };

  // Handle visual project edit
  const handleEditProject = (project: any) => {
    setEditProjectName(project.name);
    setEditProjectDescription(project.description || "");
    setVisualEditDialog({ open: true, project });
  };

  // Save content changes
  const handleSaveContent = () => {
    if (contentEditDialog.content) {
      updateContentMutation.mutate({
        id: contentEditDialog.content.id,
        title: editTitle,
        content: editContent
      });
    }
  };

  // Save project changes
  const handleSaveProject = () => {
    if (visualEditDialog.project) {
      updateProjectMutation.mutate({
        id: visualEditDialog.project.id,
        name: editProjectName,
        description: editProjectDescription
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            <div className="h-32 bg-gray-300 rounded"></div>
            <div className="grid grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!campaignData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Campaign not found</h2>
          <Button onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  const { campaign, assets, stats } = campaignData;

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

  const progressPercentage = stats.totalDeliverables > 0 
    ? Math.round((stats.completedDeliverables / stats.totalDeliverables) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
                <Badge className={`${getStatusColor(campaign.status)} text-white`}>
                  {campaign.status}
                </Badge>
              </div>
              <p className="text-gray-600 mt-1">{campaign.description || "No description provided"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={onShowLinkDialog}>
              <Link2 className="w-4 h-4 mr-2" />
              Link Assets
            </Button>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteCampaignMutation.mutate()}
              disabled={deleteCampaignMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Content</p>
                  <p className="text-2xl font-bold">{stats.totalContent}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Visual Projects</p>
                  <p className="text-2xl font-bold">{stats.totalProjects}</p>
                </div>
                <Image className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Progress</p>
                  <p className="text-2xl font-bold">{progressPercentage}%</p>
                </div>
                <BarChart3 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Team</p>
                  <p className="text-2xl font-bold">{campaign.teamMembers.length}</p>
                </div>
                <Users className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        {stats.totalDeliverables > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Campaign Progress</h3>
                <span className="text-sm text-gray-600">
                  {stats.completedDeliverables} of {stats.totalDeliverables} deliverables completed
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Detailed Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content ({stats.totalContent})</TabsTrigger>
            <TabsTrigger value="visuals">Visuals ({stats.totalProjects})</TabsTrigger>
            <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Campaign Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Campaign Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Start Date</p>
                      <p className="text-sm">{formatDate(campaign.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">End Date</p>
                      <p className="text-sm">{formatDate(campaign.endDate)}</p>
                    </div>
                  </div>
                  {campaign.budget && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Budget</p>
                      <p className="text-sm font-semibold text-green-600">{campaign.budget}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Objectives */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Objectives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {campaign.objectives.length > 0 ? (
                    <ul className="space-y-2">
                      {campaign.objectives.map((objective: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{objective}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No objectives defined</p>
                  )}
                </CardContent>
              </Card>

              {/* Target Audience */}
              <Card>
                <CardHeader>
                  <CardTitle>Target Audience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {campaign.targetAudience.primary && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Primary</p>
                      <p className="text-sm">{campaign.targetAudience.primary}</p>
                    </div>
                  )}
                  {campaign.targetAudience.secondary && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Secondary</p>
                      <p className="text-sm">{campaign.targetAudience.secondary}</p>
                    </div>
                  )}
                  {campaign.targetAudience.demographics && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Demographics</p>
                      <p className="text-sm">{campaign.targetAudience.demographics}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Brand Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle>Brand Guidelines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {campaign.brandGuidelines.voice && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Voice</p>
                      <p className="text-sm">{campaign.brandGuidelines.voice}</p>
                    </div>
                  )}
                  {campaign.brandGuidelines.tone && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tone</p>
                      <p className="text-sm">{campaign.brandGuidelines.tone}</p>
                    </div>
                  )}
                  {campaign.brandGuidelines.imagery && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Imagery Style</p>
                      <p className="text-sm">{campaign.brandGuidelines.imagery}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            {assets.content.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assets.content.map((content: any) => (
                  <Card 
                    key={content.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleEditContent(content)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        {content.title}
                        <Edit className="w-4 h-4 text-gray-400" />
                      </CardTitle>
                      <CardDescription>
                        {content.contentType} • {new Date(content.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {content.content.substring(0, 150)}...
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No content linked</h3>
                  <p className="text-gray-600 mb-4">Link existing content or briefings to this campaign</p>
                  <Button onClick={onShowLinkDialog}>Link Content</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="visuals" className="space-y-4">
            {assets.projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assets.projects.map((project: any) => (
                  <Card 
                    key={project.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleEditProject(project)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        {project.name}
                        <Edit className="w-4 h-4 text-gray-400" />
                      </CardTitle>
                      <CardDescription>
                        {new Date(project.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {project.description || "No description provided"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No visual projects linked</h3>
                  <p className="text-gray-600 mb-4">Link existing image projects to this campaign</p>
                  <Button onClick={onShowLinkDialog}>Link Projects</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="deliverables" className="space-y-4">
            {campaign.deliverables.length > 0 ? (
              <div className="space-y-3">
                {campaign.deliverables.map((deliverable: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{deliverable.type}</h4>
                          <p className="text-sm text-gray-600">{deliverable.description}</p>
                          {deliverable.assignedTo && (
                            <p className="text-xs text-gray-500 mt-1">Assigned to: {deliverable.assignedTo}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {deliverable.dueDate && (
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Due Date</p>
                              <p className="text-sm">{formatDate(deliverable.dueDate)}</p>
                            </div>
                          )}
                          <Badge 
                            variant={deliverable.status === 'completed' ? 'default' : 'secondary'}
                            className={deliverable.status === 'completed' ? 'bg-green-500' : ''}
                          >
                            {deliverable.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No deliverables defined</h3>
                  <p className="text-gray-600">Add deliverables to track campaign progress</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            {campaign.teamMembers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaign.teamMembers.map((member: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-medium">{member.name}</h4>
                          <p className="text-sm text-gray-600">{member.role}</p>
                          {member.email && (
                            <p className="text-xs text-gray-500">{member.email}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members added</h3>
                  <p className="text-gray-600">Add team members to collaborate on this campaign</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Content Edit Dialog */}
      <Dialog open={contentEditDialog.open} onOpenChange={(open) => setContentEditDialog({ open, content: null })}>
        <DialogContent hideDefaultCloseButton>
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>Edit Content</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-gray-100">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setContentEditDialog({ open: false, content: null })}
              disabled={updateContentMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveContent} disabled={updateContentMutation.isPending}>
              {updateContentMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visual Project Edit Dialog */}
      <Dialog open={visualEditDialog.open} onOpenChange={(open) => setVisualEditDialog({ open, project: null })}>
        <DialogContent hideDefaultCloseButton>
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>Edit Visual Project</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-gray-100">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project-name">Project Name</Label>
              <Input
                id="edit-project-name"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-description">Description</Label>
              <Textarea
                id="edit-project-description"
                value={editProjectDescription}
                onChange={(e) => setEditProjectDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVisualEditDialog({ open: false, project: null })}
              disabled={updateProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveProject} disabled={updateProjectMutation.isPending}>
              {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}