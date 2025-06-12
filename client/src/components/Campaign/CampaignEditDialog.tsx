import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CampaignEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: any;
  onSuccess: () => void;
}

export function CampaignEditDialog({ open, onOpenChange, campaign, onSuccess }: CampaignEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    description: campaign?.description || '',
    status: campaign?.status || 'draft',
    budget: campaign?.budget || '',
    startDate: campaign?.startDate || '',
    endDate: campaign?.endDate || '',
    objectives: campaign?.objectives || [],
    targetAudience: {
      primary: campaign?.targetAudience?.primary || '',
      secondary: campaign?.targetAudience?.secondary || '',
      demographics: campaign?.targetAudience?.demographics || '',
      psychographics: campaign?.targetAudience?.psychographics || ''
    },
    brandGuidelines: {
      voice: campaign?.brandGuidelines?.voice || '',
      tone: campaign?.brandGuidelines?.tone || '',
      colors: campaign?.brandGuidelines?.colors || [],
      messaging: campaign?.brandGuidelines?.messaging || []
    },
    teamMembers: campaign?.teamMembers || []
  });

  const [newObjective, setNewObjective] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newTeamMember, setNewTeamMember] = useState({ name: '', role: '', email: '' });

  const updateCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaign.id] });
      toast({ title: "Campaign updated successfully" });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update campaign", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCampaignMutation.mutate(formData);
  };

  const addObjective = () => {
    if (newObjective.trim()) {
      setFormData(prev => ({
        ...prev,
        objectives: [...prev.objectives, newObjective.trim()]
      }));
      setNewObjective('');
    }
  };

  const removeObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }));
  };

  const addColor = () => {
    if (newColor.trim()) {
      setFormData(prev => ({
        ...prev,
        brandGuidelines: {
          ...prev.brandGuidelines,
          colors: [...prev.brandGuidelines.colors, newColor.trim()]
        }
      }));
      setNewColor('');
    }
  };

  const removeColor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      brandGuidelines: {
        ...prev.brandGuidelines,
        colors: prev.brandGuidelines.colors.filter((_, i) => i !== index)
      }
    }));
  };

  const addMessage = () => {
    if (newMessage.trim()) {
      setFormData(prev => ({
        ...prev,
        brandGuidelines: {
          ...prev.brandGuidelines,
          messaging: [...prev.brandGuidelines.messaging, newMessage.trim()]
        }
      }));
      setNewMessage('');
    }
  };

  const removeMessage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      brandGuidelines: {
        ...prev.brandGuidelines,
        messaging: prev.brandGuidelines.messaging.filter((_, i) => i !== index)
      }
    }));
  };

  const addTeamMember = () => {
    if (newTeamMember.name.trim() && newTeamMember.role.trim()) {
      setFormData(prev => ({
        ...prev,
        teamMembers: [...prev.teamMembers, newTeamMember]
      }));
      setNewTeamMember({ name: '', role: '', email: '' });
    }
  };

  const removeTeamMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Campaign</DialogTitle>
          <DialogDescription>
            Update campaign details, objectives, and team settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                placeholder="e.g. $50,000"
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
              />
            </div>

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
          </div>

          {/* Objectives */}
          <div className="space-y-3">
            <Label>Campaign Objectives</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add objective..."
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
              />
              <Button type="button" onClick={addObjective} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.objectives.map((objective, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {objective}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => removeObjective(index)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Target Audience</Label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary Audience</Label>
                <Textarea
                  placeholder="Describe primary target audience..."
                  value={formData.targetAudience.primary}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    targetAudience: { ...prev.targetAudience, primary: e.target.value }
                  }))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Secondary Audience</Label>
                <Textarea
                  placeholder="Describe secondary target audience..."
                  value={formData.targetAudience.secondary}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    targetAudience: { ...prev.targetAudience, secondary: e.target.value }
                  }))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Demographics</Label>
                <Textarea
                  placeholder="Age, gender, location, income..."
                  value={formData.targetAudience.demographics}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    targetAudience: { ...prev.targetAudience, demographics: e.target.value }
                  }))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Psychographics</Label>
                <Textarea
                  placeholder="Interests, values, lifestyle..."
                  value={formData.targetAudience.psychographics}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    targetAudience: { ...prev.targetAudience, psychographics: e.target.value }
                  }))}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Brand Guidelines */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Brand Guidelines</Label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand Voice</Label>
                <Input
                  placeholder="Professional, friendly, authoritative..."
                  value={formData.brandGuidelines.voice}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    brandGuidelines: { ...prev.brandGuidelines, voice: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Brand Tone</Label>
                <Input
                  placeholder="Confident, approachable, innovative..."
                  value={formData.brandGuidelines.tone}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    brandGuidelines: { ...prev.brandGuidelines, tone: e.target.value }
                  }))}
                />
              </div>
            </div>

            {/* Brand Colors */}
            <div className="space-y-3">
              <Label>Brand Colors</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add color (hex, name, or RGB)..."
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                />
                <Button type="button" onClick={addColor} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.brandGuidelines.colors.map((color, index) => (
                  <Badge key={index} variant="outline" className="gap-1">
                    {color}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeColor(index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Key Messages */}
            <div className="space-y-3">
              <Label>Key Messages</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add key message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMessage())}
                />
                <Button type="button" onClick={addMessage} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.brandGuidelines.messaging.map((message, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {message}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeMessage(index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Team Members</Label>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
              <Input
                placeholder="Name"
                value={newTeamMember.name}
                onChange={(e) => setNewTeamMember(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="Role"
                value={newTeamMember.role}
                onChange={(e) => setNewTeamMember(prev => ({ ...prev, role: e.target.value }))}
              />
              <Input
                placeholder="Email (optional)"
                value={newTeamMember.email}
                onChange={(e) => setNewTeamMember(prev => ({ ...prev, email: e.target.value }))}
              />
              <Button type="button" onClick={addTeamMember} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {formData.teamMembers.map((member, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-gray-600">{member.role}</p>
                    {member.email && <p className="text-sm text-gray-500">{member.email}</p>}
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeTeamMember(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateCampaignMutation.isPending}
            >
              {updateCampaignMutation.isPending ? 'Updating...' : 'Update Campaign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}