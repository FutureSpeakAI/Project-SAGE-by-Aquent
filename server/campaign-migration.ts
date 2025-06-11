import { storage } from './storage';
import { simpleCampaignStorage } from './simple-campaign-storage';

interface CampaignMigrationResult {
  campaignsCreated: number;
  contentLinked: number;
  visualsLinked: number;
  campaigns: Array<{
    id: number;
    name: string;
    contentCount: number;
    visualCount: number;
  }>;
}

/**
 * Semantic similarity calculation using simple keyword matching
 * and common marketing terms
 */
function calculateSimilarity(text1: string, text2: string): number {
  const normalize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  
  const words1 = normalize(text1);
  const words2 = normalize(text2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Calculate Jaccard similarity
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set(Array.from(set1).filter(x => set2.has(x)));
  const union = new Set([...Array.from(set1), ...Array.from(set2)]);
  
  const jaccardSimilarity = intersection.size / union.size;
  
  // Bonus for marketing-related keywords
  const marketingKeywords = [
    'brand', 'marketing', 'campaign', 'product', 'launch', 'social', 'media',
    'advertising', 'promotion', 'content', 'strategy', 'creative', 'design',
    'digital', 'email', 'website', 'logo', 'banner', 'post', 'video', 'image'
  ];
  
  const marketingBonus = marketingKeywords.filter(keyword => 
    set1.has(keyword) && set2.has(keyword)
  ).length * 0.1;
  
  return Math.min(1, jaccardSimilarity + marketingBonus);
}

/**
 * Extract campaign themes from project names and content
 */
function extractCampaignTheme(projectName: string, description?: string): string {
  const text = `${projectName} ${description || ''}`.toLowerCase();
  
  // Common campaign patterns
  const patterns = [
    { regex: /(\w+)\s+(launch|campaign|promotion)/i, theme: 'Product Launch' },
    { regex: /(social|instagram|facebook|twitter|linkedin)/i, theme: 'Social Media' },
    { regex: /(email|newsletter|marketing)/i, theme: 'Email Marketing' },
    { regex: /(brand|logo|identity)/i, theme: 'Brand Identity' },
    { regex: /(web|website|digital)/i, theme: 'Digital Marketing' },
    { regex: /(health|medical|healthcare)/i, theme: 'Healthcare' },
    { regex: /(tech|technology|software)/i, theme: 'Technology' },
    { regex: /(food|restaurant|culinary)/i, theme: 'Food & Beverage' },
    { regex: /(fashion|clothing|apparel)/i, theme: 'Fashion' },
    { regex: /(real\s*estate|property)/i, theme: 'Real Estate' }
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(text)) {
      return pattern.theme;
    }
  }
  
  // Extract first meaningful word as theme
  const words = projectName.split(/\s+/).filter(w => w.length > 2);
  return words.length > 0 ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : 'General';
}

/**
 * Migrate existing projects to campaigns and organize content
 */
export async function migrateToCampaignSystem(): Promise<CampaignMigrationResult> {
  try {
    console.log('Starting campaign migration...');
    
    // Get all existing data
    const projects = await storage.getImageProjects();
    const content = await storage.getGeneratedContents();
    
    console.log(`Found ${projects.length} projects and ${content.length} content items`);
    
    let campaignsCreated = 0;
    let contentLinked = 0;
    let visualsLinked = 0;
    const campaignSummary: Array<{
      id: number;
      name: string;
      contentCount: number;
      visualCount: number;
    }> = [];
    
    // Create campaigns from existing projects
    for (const project of projects) {
      const theme = extractCampaignTheme(project.name, project.description);
      
      // Create campaign from project
      const campaignData = {
        name: `${theme} - ${project.name}`,
        description: project.description || `Campaign based on ${project.name} project`,
        status: 'active' as const,
        objectives: [
          `Create compelling visuals for ${project.name}`,
          'Develop consistent brand messaging',
          'Optimize content for target audience'
        ],
        targetAudience: {
          primary: 'Target demographic for ' + project.name,
          secondary: 'Secondary audience',
          demographics: 'To be defined based on project requirements',
          psychographics: 'Interest-based targeting'
        },
        brandGuidelines: {
          voice: 'Professional and engaging',
          tone: 'Confident and approachable',
          colors: [],
          fonts: [],
          imagery: 'High-quality, brand-consistent visuals',
          messaging: [`Key messaging for ${project.name}`]
        },
        deliverables: [
          {
            type: 'Visual Content',
            description: `Visual assets for ${project.name}`,
            status: 'completed' as const,
            assignedTo: 'Design Team'
          }
        ],
        teamMembers: [
          {
            name: 'Content Creator',
            role: 'Content Development'
          },
          {
            name: 'Visual Designer',
            role: 'Visual Assets'
          }
        ],
        linkedContent: [],
        linkedProjects: [],
        metadata: {}
      };
      
      const campaign = await simpleCampaignStorage.createCampaign(campaignData);
      campaignsCreated++;
      
      // Link the original project to this campaign using simple campaign storage
      await simpleCampaignStorage.linkProjectToCampaign(campaign.id, project.id);
      visualsLinked++;
      
      // Find and link related content based on similarity
      let projectContentCount = 0;
      const projectText = `${project.name} ${project.description || ''}`;
      
      for (const contentItem of content) {
        if (contentItem.campaignId) continue; // Already assigned
        
        const contentText = `${contentItem.title} ${contentItem.content}`;
        const similarity = calculateSimilarity(projectText, contentText);
        
        // Link content with similarity > 0.3 or if it contains project name keywords
        if (similarity > 0.3 || contentText.toLowerCase().includes(project.name.toLowerCase())) {
          await storage.updateGeneratedContent(contentItem.id, {
            ...contentItem,
            campaignId: campaign.id,
            campaignContext: {
              name: campaign.name,
              role: 'supporting_content',
              deliverableType: contentItem.contentType,
              brandGuidelines: campaignData.brandGuidelines.voice
            }
          });
          contentLinked++;
          projectContentCount++;
        }
      }
      
      campaignSummary.push({
        id: campaign.id,
        name: campaign.name,
        contentCount: projectContentCount,
        visualCount: 1
      });
      
      console.log(`Created campaign: ${campaign.name} with ${projectContentCount} content items`);
    }
    
    // Handle orphaned content by creating generic campaigns
    const orphanedContent = content.filter(c => !c.campaignId);
    
    if (orphanedContent.length > 0) {
      // Group orphaned content by theme
      const contentGroups = new Map<string, typeof orphanedContent>();
      
      for (const contentItem of orphanedContent) {
        const theme = extractCampaignTheme(contentItem.title, contentItem.content);
        if (!contentGroups.has(theme)) {
          contentGroups.set(theme, []);
        }
        contentGroups.get(theme)!.push(contentItem);
      }
      
      // Create campaigns for content groups
      for (const [theme, items] of contentGroups) {
        if (items.length > 0) {
          const campaignData = {
            name: `${theme} Content Campaign`,
            description: `Campaign for ${theme.toLowerCase()} content and assets`,
            status: 'active' as const,
            objectives: [
              `Organize ${theme.toLowerCase()} content`,
              'Maintain content consistency',
              'Optimize content performance'
            ],
            targetAudience: {
              primary: `${theme} audience`,
              secondary: 'General audience',
              demographics: 'To be refined based on content analysis',
              psychographics: 'Interest-based targeting'
            },
            brandGuidelines: {
              voice: 'Professional and informative',
              tone: 'Engaging and trustworthy',
              colors: [],
              fonts: [],
              imagery: 'Relevant and high-quality',
              messaging: [`Consistent ${theme.toLowerCase()} messaging`]
            },
            deliverables: [
              {
                type: 'Content Collection',
                description: `${theme} content assets`,
                status: 'completed' as const,
                assignedTo: 'Content Team'
              }
            ],
            teamMembers: [
              {
                name: 'Content Manager',
                role: 'Content Organization'
              }
            ]
          };
          
          const campaign = await storage.saveCampaign(campaignData);
          campaignsCreated++;
          
          // Link all items in this group
          for (const item of items) {
            await storage.updateGeneratedContent(item.id, {
              ...item,
              campaignId: campaign.id,
              campaignContext: {
                name: campaign.name,
                role: 'primary_brief',
                deliverableType: item.contentType,
                brandGuidelines: campaignData.brandGuidelines.voice
              }
            });
            contentLinked++;
          }
          
          campaignSummary.push({
            id: campaign.id,
            name: campaign.name,
            contentCount: items.length,
            visualCount: 0
          });
          
          console.log(`Created content campaign: ${campaign.name} with ${items.length} items`);
        }
      }
    }
    
    console.log('Campaign migration completed successfully');
    
    return {
      campaignsCreated,
      contentLinked,
      visualsLinked,
      campaigns: campaignSummary
    };
    
  } catch (error) {
    console.error('Campaign migration failed:', error);
    throw error;
  }
}

/**
 * Reset all campaign assignments (for testing/re-migration)
 */
export async function resetCampaignAssignments(): Promise<void> {
  try {
    const content = await storage.getGeneratedContents();
    const projects = await storage.getImageProjects();
    
    // Clear campaign assignments from content
    for (const item of content) {
      if (item.campaignId) {
        await storage.updateGeneratedContent(item.id, {
          ...item,
          campaignId: null,
          campaignContext: null
        });
      }
    }
    
    // Clear campaign assignments from projects
    for (const project of projects) {
      if (project.campaignId) {
        await storage.updateImageProject(project.id, {
          ...project,
          campaignId: null,
          campaignContext: null
        });
      }
    }
    
    console.log('Campaign assignments reset successfully');
  } catch (error) {
    console.error('Failed to reset campaign assignments:', error);
    throw error;
  }
}