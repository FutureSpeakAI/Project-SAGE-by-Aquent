/**
 * Simplified Campaign Storage
 * Works without database schema changes for immediate functionality
 */

export interface SimpleCampaign {
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
  linkedContent: number[]; // IDs of linked generated content
  linkedProjects: number[]; // IDs of linked image projects
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export class SimpleCampaignStorage {
  private campaigns: SimpleCampaign[] = [];
  private nextId = 1;

  // Load campaigns from localStorage in browser environment
  constructor() {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('sage_campaigns');
        if (stored) {
          const data = JSON.parse(stored);
          this.campaigns = data.campaigns || [];
          this.nextId = data.nextId || 1;
        }
      } catch (error) {
        console.warn('Failed to load campaigns from localStorage:', error);
      }
    }
  }

  private save() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('sage_campaigns', JSON.stringify({
          campaigns: this.campaigns,
          nextId: this.nextId
        }));
      } catch (error) {
        console.warn('Failed to save campaigns to localStorage:', error);
      }
    }
  }

  async getAllCampaigns(): Promise<SimpleCampaign[]> {
    return [...this.campaigns].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getCampaign(id: number): Promise<SimpleCampaign | undefined> {
    return this.campaigns.find(c => c.id === id);
  }

  async createCampaign(data: Omit<SimpleCampaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<SimpleCampaign> {
    const now = new Date().toISOString();
    const campaign: SimpleCampaign = {
      ...data,
      id: this.nextId++,
      createdAt: now,
      updatedAt: now
    };
    
    this.campaigns.push(campaign);
    this.save();
    return campaign;
  }

  async updateCampaign(id: number, data: Partial<Omit<SimpleCampaign, 'id' | 'createdAt'>>): Promise<SimpleCampaign | undefined> {
    const index = this.campaigns.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    const updated = {
      ...this.campaigns[index],
      ...data,
      updatedAt: new Date().toISOString()
    };

    this.campaigns[index] = updated;
    this.save();
    return updated;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    const index = this.campaigns.findIndex(c => c.id === id);
    if (index === -1) return false;

    this.campaigns.splice(index, 1);
    this.save();
    return true;
  }

  async linkContentToCampaign(campaignId: number, contentId: number): Promise<boolean> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) return false;

    if (!campaign.linkedContent.includes(contentId)) {
      campaign.linkedContent.push(contentId);
      await this.updateCampaign(campaignId, { linkedContent: campaign.linkedContent });
    }
    return true;
  }

  async linkProjectToCampaign(campaignId: number, projectId: number): Promise<boolean> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) return false;

    if (!campaign.linkedProjects.includes(projectId)) {
      campaign.linkedProjects.push(projectId);
      await this.updateCampaign(campaignId, { linkedProjects: campaign.linkedProjects });
    }
    return true;
  }

  async searchCampaigns(query?: string, status?: string): Promise<SimpleCampaign[]> {
    let filtered = this.campaigns;

    if (status) {
      filtered = filtered.filter(c => c.status === status);
    }

    if (query) {
      const searchTerm = query.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchTerm) ||
        c.description?.toLowerCase().includes(searchTerm) ||
        c.objectives.some(obj => obj.toLowerCase().includes(searchTerm))
      );
    }

    return filtered.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
}

export const simpleCampaignStorage = new SimpleCampaignStorage();