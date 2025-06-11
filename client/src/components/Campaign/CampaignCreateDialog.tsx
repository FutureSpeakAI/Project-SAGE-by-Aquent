import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Target, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CampaignCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CampaignCreateDialog({ open, onOpenChange, onSuccess }: CampaignCreateDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "draft" as "draft" | "active" | "completed" | "archived",
    startDate: "",
    endDate: "",
    budget: "",
    objectives: [] as string[],
    targetAudience: {
      primary: "",
      secondary: "",
      demographics: "",
      psychographics: ""
    },
    brandGuidelines: {
      voice: "",
      tone: "",
      colors: [] as string[],
      fonts: [] as string[],
      imagery: "",
      messaging: [] as string[]
    },
    deliverables: [] as Array<{
      type: string;
      description: string;
      status: "pending" | "in_progress" | "completed";
      dueDate?: string;
      assignedTo?: string;
    }>,
    teamMembers: [] as Array<{
      name: string;
      role: string;
      email?: string;
    }>
  });

  const [newObjective, setNewObjective] = useState("");
  const [newTeamMember, setNewTeamMember] = useState({
    name: "",
    role: "",
    email: ""
  });

  const createCampaignMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    }),
    onSuccess: () => {
      toast({
        title: "Campaign created",
        description: "Your campaign has been created successfully."
      });
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create campaign. Please try again.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      status: "draft",
      startDate: "",
      endDate: "",
      budget: "",
      objectives: [],
      targetAudience: {
        primary: "",
        secondary: "",
        demographics: "",
        psychographics: ""
      },
      brandGuidelines: {
        voice: "",
        tone: "",
        colors: [],
        fonts: [],
        imagery: "",
        messaging: []
      },
      deliverables: [],
      teamMembers: []
    });
    setNewObjective("");
    setNewTeamMember({
      name: "",
      role: "",
      email: ""
    });
  };

  const addObjective = () => {
    if (newObjective.trim()) {
      setFormData(prev => ({
        ...prev,
        objectives: [...prev.objectives, newObjective.trim()]
      }));
      setNewObjective("");
    }
  };

  const removeObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }));
  };

  const addTeamMember = () => {
    if (newTeamMember.name && newTeamMember.role) {
      setFormData(prev => ({
        ...prev,
        teamMembers: [...prev.teamMembers, { ...newTeamMember }]
      }));
      setNewTeamMember({
        name: "",
        role: "",
        email: ""
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Campaign name is required.",
        variant: "destructive"
      });
      return;
    }
    createCampaignMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
          <DialogDescription>
            Set up a new campaign to coordinate briefings, content, and visuals
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="objectives">Objectives & Audience</TabsTrigger>
              <TabsTrigger value="team">Team & Brand</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter campaign name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the campaign"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    value={formData.budget}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                    placeholder="e.g., $10,000"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="objectives" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Campaign Objectives
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newObjective}
                      onChange={(e) => setNewObjective(e.target.value)}
                      placeholder="Add an objective"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                    />
                    <Button type="button" onClick={addObjective}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.objectives.map((objective, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {objective}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeObjective(index)} />
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Target Audience</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Audience</Label>
                    <Input
                      value={formData.targetAudience.primary}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        targetAudience: { ...prev.targetAudience, primary: e.target.value }
                      }))}
                      placeholder="e.g., Marketing professionals"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Audience</Label>
                    <Input
                      value={formData.targetAudience.secondary}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        targetAudience: { ...prev.targetAudience, secondary: e.target.value }
                      }))}
                      placeholder="e.g., Business owners"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Demographics</Label>
                    <Input
                      value={formData.targetAudience.demographics}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        targetAudience: { ...prev.targetAudience, demographics: e.target.value }
                      }))}
                      placeholder="e.g., 25-45 years old"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Psychographics</Label>
                    <Input
                      value={formData.targetAudience.psychographics}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        targetAudience: { ...prev.targetAudience, psychographics: e.target.value }
                      }))}
                      placeholder="e.g., Tech-savvy, ambitious"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team Members
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      value={newTeamMember.name}
                      onChange={(e) => setNewTeamMember(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Name"
                    />
                    <Input
                      value={newTeamMember.role}
                      onChange={(e) => setNewTeamMember(prev => ({ ...prev, role: e.target.value }))}
                      placeholder="Role"
                    />
                    <div className="flex gap-2">
                      <Input
                        value={newTeamMember.email}
                        onChange={(e) => setNewTeamMember(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Email (optional)"
                      />
                      <Button type="button" onClick={addTeamMember}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {formData.teamMembers.map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{member.name}</span>
                          <span className="text-gray-500 ml-2">{member.role}</span>
                          {member.email && <span className="text-gray-400 ml-2">({member.email})</span>}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            teamMembers: prev.teamMembers.filter((_, i) => i !== index)
                          }))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Brand Guidelines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Brand Voice</Label>
                      <Input
                        value={formData.brandGuidelines.voice}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          brandGuidelines: { ...prev.brandGuidelines, voice: e.target.value }
                        }))}
                        placeholder="e.g., Professional, friendly"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Brand Tone</Label>
                      <Input
                        value={formData.brandGuidelines.tone}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          brandGuidelines: { ...prev.brandGuidelines, tone: e.target.value }
                        }))}
                        placeholder="e.g., Confident, approachable"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Imagery Style</Label>
                    <Textarea
                      value={formData.brandGuidelines.imagery}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        brandGuidelines: { ...prev.brandGuidelines, imagery: e.target.value }
                      }))}
                      placeholder="Describe the visual style and imagery preferences"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createCampaignMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}