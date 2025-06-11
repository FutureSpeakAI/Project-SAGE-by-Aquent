import { storage } from "./storage";
import type { Campaign, InsertCampaign, GeneratedContent, GeneratedImage, ImageProject } from "@shared/schema";

/**
 * Campaign Management Service
 * Coordinates campaign activities without breaking existing workflows
 */
export class CampaignManager {
  
  // Create a new campaign
  async createCampaign(campaignData: InsertCampaign): Promise<Campaign> {
    return await storage.saveCampaign(campaignData);
  }

  // Get all campaigns
  async getAllCampaigns(): Promise<Campaign[]> {
    return await storage.getCampaigns();
  }

  // Get campaign with all associated assets
  async getCampaignWithAssets(campaignId: number) {
    const campaign = await storage.getCampaign(campaignId);
    if (!campaign) return null;

    const assets = await storage.getCampaignAssets(campaignId);
    
    return {
      campaign,
      assets,
      stats: {
        totalBriefings: assets.briefings.length,
        totalContent: assets.content.length,
        totalImages: assets.images.length,
        totalProjects: assets.projects.length,
        completedDeliverables: campaign.deliverables?.filter(d => d.status === 'completed').length || 0,
        totalDeliverables: campaign.deliverables?.length || 0
      }
    };
  }

  // Associate existing content with a campaign
  async linkContentToCampaign(contentId: number, campaignId: number, role: 'primary_brief' | 'supporting_content' | 'reference_material' = 'supporting_content') {
    const content = await storage.getGeneratedContent(contentId);
    if (!content) throw new Error('Content not found');

    const campaign = await storage.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    // Update content with campaign association
    await storage.updateGeneratedContent(contentId, {
      campaignId,
      campaignContext: {
        name: campaign.name,
        role,
        status: 'draft'
      }
    });

    return true;
  }

  // Associate existing image project with campaign
  async linkImageProjectToCampaign(projectId: number, campaignId: number, deliverableType?: string) {
    const project = await storage.getImageProject(projectId);
    if (!project) throw new Error('Project not found');

    const campaign = await storage.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    // Update project with campaign association
    await storage.updateImageProject(projectId, {
      campaignId,
      campaignContext: {
        name: campaign.name,
        deliverableType,
        brandGuidelines: campaign.brandGuidelines?.voice || ''
      }
    });

    return true;
  }

  // Generate campaign brief template
  generateCampaignBrief(campaign: Campaign): string {
    return `# ${campaign.name} - Campaign Brief

## Campaign Overview
${campaign.description || 'Campaign description not provided'}

## Objectives
${campaign.objectives?.map(obj => `- ${obj}`).join('\n') || 'No objectives defined'}

## Target Audience
**Primary:** ${campaign.targetAudience?.primary || 'Not defined'}
**Secondary:** ${campaign.targetAudience?.secondary || 'Not defined'}
**Demographics:** ${campaign.targetAudience?.demographics || 'Not defined'}

## Brand Guidelines
**Voice:** ${campaign.brandGuidelines?.voice || 'Not defined'}
**Tone:** ${campaign.brandGuidelines?.tone || 'Not defined'}
**Key Messages:** ${campaign.brandGuidelines?.messaging?.join(', ') || 'Not defined'}

## Timeline
**Start Date:** ${campaign.startDate?.toDateString() || 'Not set'}
**End Date:** ${campaign.endDate?.toDateString() || 'Not set'}

## Deliverables
${campaign.deliverables?.map(d => `- ${d.type}: ${d.description} (Status: ${d.status})`).join('\n') || 'No deliverables defined'}

## Budget
${campaign.budget || 'Not specified'}

---
Generated on ${new Date().toLocaleString()}`;
  }

  // Update campaign progress
  async updateCampaignProgress(campaignId: number, deliverableIndex: number, status: 'pending' | 'in_progress' | 'completed') {
    const campaign = await storage.getCampaign(campaignId);
    if (!campaign || !campaign.deliverables) throw new Error('Campaign or deliverables not found');

    const deliverables = [...campaign.deliverables];
    if (deliverableIndex >= 0 && deliverableIndex < deliverables.length) {
      deliverables[deliverableIndex].status = status;
      
      await storage.updateCampaign(campaignId, {
        deliverables,
        status: this.calculateCampaignStatus(deliverables)
      });
    }

    return true;
  }

  // Calculate overall campaign status based on deliverables
  private calculateCampaignStatus(deliverables: any[]): 'draft' | 'active' | 'completed' | 'archived' {
    if (!deliverables.length) return 'draft';
    
    const completed = deliverables.filter(d => d.status === 'completed').length;
    const inProgress = deliverables.filter(d => d.status === 'in_progress').length;
    
    if (completed === deliverables.length) return 'completed';
    if (inProgress > 0 || completed > 0) return 'active';
    
    return 'draft';
  }

  // Search campaigns by status or name
  async searchCampaigns(query?: string, status?: string): Promise<Campaign[]> {
    const allCampaigns = await storage.getCampaigns();
    
    return allCampaigns.filter(campaign => {
      const matchesQuery = !query || 
        campaign.name.toLowerCase().includes(query.toLowerCase()) ||
        campaign.description?.toLowerCase().includes(query.toLowerCase());
      
      const matchesStatus = !status || campaign.status === status;
      
      return matchesQuery && matchesStatus;
    });
  }

  // Get campaign insights
  async getCampaignInsights(campaignId: number) {
    const campaignData = await this.getCampaignWithAssets(campaignId);
    if (!campaignData) return null;

    const { campaign, assets, stats } = campaignData;
    
    return {
      overview: stats,
      timeline: {
        daysRemaining: campaign.endDate ? 
          Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
        progress: stats.totalDeliverables > 0 ? 
          Math.round((stats.completedDeliverables / stats.totalDeliverables) * 100) : 0
      },
      contentBreakdown: {
        briefings: assets.briefings.map(b => ({
          id: b.id,
          title: b.title,
          role: b.campaignContext?.role || 'supporting_content',
          status: b.campaignContext?.status || 'draft'
        })),
        content: assets.content.map(c => ({
          id: c.id,
          title: c.title,
          type: c.campaignContext?.deliverableType || 'general',
          status: c.campaignContext?.status || 'draft'
        })),
        visuals: assets.projects.map(p => ({
          id: p.id,
          name: p.name,
          type: p.campaignContext?.deliverableType || 'general',
          imageCount: assets.images.filter(i => i.projectId === p.id).length
        }))
      }
    };
  }
}

export const campaignManager = new CampaignManager();