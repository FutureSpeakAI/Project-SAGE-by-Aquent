import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Calendar, 
  Target, 
  BarChart3, 
  FileText, 
  Image, 
  Link2, 
  Edit, 
  Trash2,
  DollarSign,
  Clock,
  CheckCircle2,
  BookOpen
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface CampaignDetailViewProps {
  campaignId: number;
  onBack: () => void;
  onShowLinkDialog: () => void;
  onNavigateToContent: (contentId: number) => void;
  onNavigateToVisual: (projectId: number) => void;
}

export function CampaignDetailView({ campaignId, onBack, onShowLinkDialog, onNavigateToContent, onNavigateToVisual }: CampaignDetailViewProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: campaignData, isLoading } = useQuery({
    queryKey: ['/api/campaigns', campaignId],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      if (!response.ok) throw new Error('Failed to fetch campaign');
      return response.json();
    }
  });

  // Campaign deletion mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: () => apiRequest(`/api/campaigns/${campaignId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      onBack();
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            <div className="h-32 bg-gray-300 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-24 bg-gray-300 rounded"></div>
              <div className="h-24 bg-gray-300 rounded"></div>
              <div className="h-24 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!campaignData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Campaign not found</h2>
            <Button onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Campaigns
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { campaign, assets, stats } = campaignData;
  const progressPercentage = stats.totalDeliverables > 0 ? Math.round((stats.completedDeliverables / stats.totalDeliverables) * 100) : 0;

  // Extract brief summary for the overview
  const briefSummary = assets.briefings?.length > 0 ? {
    hasObjectives: campaign.objectives?.length > 0,
    hasTargetAudience: campaign.targetAudience?.primary,
    hasBrandGuidelines: campaign.brandGuidelines?.tone || campaign.brandGuidelines?.voice,
    briefCount: assets.briefings.length
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Campaigns
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
              <p className="text-lg text-gray-600 mt-1">{campaign.description}</p>
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
                  <p className="text-sm font-medium text-gray-600">Brief Summary</p>
                  <p className="text-2xl font-bold">{briefSummary?.briefCount || 0}</p>
                </div>
                <BookOpen className="w-8 h-8 text-orange-500" />
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content ({stats.totalContent})</TabsTrigger>
            <TabsTrigger value="visuals">Visuals ({stats.totalProjects})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Campaign Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Campaign Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                      {campaign.status}
                    </Badge>
                  </div>
                  
                  {campaign.objectives?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Objectives</h4>
                      <ul className="space-y-1">
                        {campaign.objectives.map((objective: string, index: number) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {objective}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {briefSummary && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Brief Status</h4>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className={`w-4 h-4 ${briefSummary.hasObjectives ? 'text-green-500' : 'text-gray-300'}`} />
                          <span className="text-gray-600">Objectives defined</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className={`w-4 h-4 ${briefSummary.hasTargetAudience ? 'text-green-500' : 'text-gray-300'}`} />
                          <span className="text-gray-600">Target audience specified</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className={`w-4 h-4 ${briefSummary.hasBrandGuidelines ? 'text-green-500' : 'text-gray-300'}`} />
                          <span className="text-gray-600">Brand guidelines set</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Target Audience */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Target Audience
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {campaign.targetAudience?.primary && (
                    <div>
                      <h4 className="font-medium text-gray-900">Primary</h4>
                      <p className="text-sm text-gray-600">{campaign.targetAudience.primary}</p>
                    </div>
                  )}
                  {campaign.targetAudience?.secondary && (
                    <div>
                      <h4 className="font-medium text-gray-900">Secondary</h4>
                      <p className="text-sm text-gray-600">{campaign.targetAudience.secondary}</p>
                    </div>
                  )}
                  {campaign.targetAudience?.demographics && (
                    <div>
                      <h4 className="font-medium text-gray-900">Demographics</h4>
                      <p className="text-sm text-gray-600">{campaign.targetAudience.demographics}</p>
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
                  {campaign.brandGuidelines?.tone && (
                    <div>
                      <h4 className="font-medium text-gray-900">Tone</h4>
                      <p className="text-sm text-gray-600">{campaign.brandGuidelines.tone}</p>
                    </div>
                  )}
                  {campaign.brandGuidelines?.voice && (
                    <div>
                      <h4 className="font-medium text-gray-900">Voice</h4>
                      <p className="text-sm text-gray-600">{campaign.brandGuidelines.voice}</p>
                    </div>
                  )}
                  {campaign.brandGuidelines?.imagery && (
                    <div>
                      <h4 className="font-medium text-gray-900">Imagery</h4>
                      <p className="text-sm text-gray-600">{campaign.brandGuidelines.imagery}</p>
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
                    onClick={() => onNavigateToContent(content.id)}
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
                    onClick={() => onNavigateToVisual(project.id)}
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
        </Tabs>
      </div>
    </div>
  );
}