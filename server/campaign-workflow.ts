// Campaign workflow orchestration system for SAGE
// Guides users through complete campaign development process

export interface WorkflowStage {
  id: string;
  name: string;
  description: string;
  tab: 'sage' | 'briefing' | 'free-prompt' | 'image-generation';
  prerequisites: string[];
  objectives: string[];
  suggestedActions: string[];
  completionCriteria: string[];
}

export interface CampaignWorkflow {
  id: string;
  name: string;
  description: string;
  stages: WorkflowStage[];
  currentStage: number;
  completedStages: string[];
  sessionData: any;
}

// Define the complete campaign workflow stages
export const CAMPAIGN_WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: 'discovery',
    name: 'Campaign Discovery & Setup',
    description: 'Define project scope, brand, audience, and objectives',
    tab: 'sage',
    prerequisites: [],
    objectives: [
      'Establish project name and brand identity',
      'Define target audience and demographics',
      'Set campaign objectives and key messages',
      'Identify budget and timeline constraints'
    ],
    suggestedActions: [
      'Start with project overview conversation',
      'Activate Brand Analysis research mode',
      'Use Competitor Analysis for market positioning'
    ],
    completionCriteria: [
      'Project name defined',
      'Brand and industry identified',
      'Target audience specified',
      'Campaign objectives established'
    ]
  },
  {
    id: 'research',
    name: 'Deep Market Research',
    description: 'Comprehensive research using SAGE reasoning engine',
    tab: 'sage',
    prerequisites: ['discovery'],
    objectives: [
      'Conduct competitor analysis',
      'Research market trends and opportunities',
      'Analyze brand positioning and messaging',
      'Identify design and creative trends'
    ],
    suggestedActions: [
      'Use Competitor Analysis research mode',
      'Activate Market Research for trend analysis',
      'Explore Design Trends for visual direction',
      'Run Campaign Analysis for strategic insights'
    ],
    completionCriteria: [
      'At least 3 research sessions completed',
      'Competitor landscape mapped',
      'Market opportunities identified',
      'Creative direction insights gathered'
    ]
  },
  {
    id: 'strategic_brief',
    name: 'Strategic Brief Development',
    description: 'Compile research into actionable campaign brief',
    tab: 'briefing',
    prerequisites: ['research'],
    objectives: [
      'Synthesize research findings into strategic recommendations',
      'Create comprehensive campaign brief document',
      'Define creative territories and messaging frameworks',
      'Establish success metrics and KPIs'
    ],
    suggestedActions: [
      'Navigate to Briefing tab',
      'Generate strategic brief from research data',
      'Review and refine creative recommendations',
      'Finalize campaign strategy document'
    ],
    completionCriteria: [
      'Strategic brief generated',
      'Creative territories defined',
      'Success metrics established',
      'Timeline and deliverables outlined'
    ]
  },
  {
    id: 'content_creation',
    name: 'Content Generation',
    description: 'Create campaign copy and messaging across channels',
    tab: 'free-prompt',
    prerequisites: ['strategic_brief'],
    objectives: [
      'Generate headlines and taglines',
      'Create social media content',
      'Develop email marketing copy',
      'Write campaign scripts and narratives'
    ],
    suggestedActions: [
      'Move to Free Prompt tab for content generation',
      'Use strategic brief context for brand-aligned copy',
      'Generate multiple content variations',
      'Test different messaging approaches'
    ],
    completionCriteria: [
      'Primary headlines created',
      'Social media content generated',
      'Campaign copy variations developed',
      'Content aligned with strategic brief'
    ]
  },
  {
    id: 'visual_assets',
    name: 'Visual Asset Creation',
    description: 'Generate campaign visuals and creative assets',
    tab: 'image-generation',
    prerequisites: ['content_creation'],
    objectives: [
      'Create hero campaign imagery',
      'Generate social media graphics',
      'Develop brand-consistent visual assets',
      'Produce channel-specific creative materials'
    ],
    suggestedActions: [
      'Navigate to Image Generation tab',
      'Use campaign context for brand-aligned visuals',
      'Create hero images and key art',
      'Generate social media asset variations'
    ],
    completionCriteria: [
      'Hero campaign image created',
      'Social media assets generated',
      'Visual consistency maintained',
      'Channel-specific formats produced'
    ]
  },
  {
    id: 'finalization',
    name: 'Campaign Finalization',
    description: 'Review, optimize, and prepare final deliverables',
    tab: 'sage',
    prerequisites: ['visual_assets'],
    objectives: [
      'Review complete campaign materials',
      'Optimize content and visuals for performance',
      'Prepare final deliverable package',
      'Create campaign execution timeline'
    ],
    suggestedActions: [
      'Return to SAGE tab for final review',
      'Request campaign optimization recommendations',
      'Generate final campaign summary',
      'Export complete campaign package'
    ],
    completionCriteria: [
      'All campaign materials reviewed',
      'Final optimizations applied',
      'Campaign package prepared',
      'Execution plan finalized'
    ]
  }
];

export class CampaignWorkflowOrchestrator {
  private workflows: Map<string, CampaignWorkflow> = new Map();

  createWorkflow(sessionId: string, workflowType: string = 'standard'): CampaignWorkflow {
    const workflow: CampaignWorkflow = {
      id: sessionId,
      name: `Campaign Workflow - ${new Date().toISOString().split('T')[0]}`,
      description: 'Complete campaign development from discovery to delivery',
      stages: CAMPAIGN_WORKFLOW_STAGES,
      currentStage: 0,
      completedStages: [],
      sessionData: {}
    };

    this.workflows.set(sessionId, workflow);
    return workflow;
  }

  getWorkflow(sessionId: string): CampaignWorkflow | null {
    return this.workflows.get(sessionId) || null;
  }

  getCurrentStage(sessionId: string): WorkflowStage | null {
    const workflow = this.getWorkflow(sessionId);
    if (!workflow) return null;
    return workflow.stages[workflow.currentStage] || null;
  }

  getNextStage(sessionId: string): WorkflowStage | null {
    const workflow = this.getWorkflow(sessionId);
    if (!workflow) return null;
    const nextIndex = workflow.currentStage + 1;
    return workflow.stages[nextIndex] || null;
  }

  completeStage(sessionId: string, stageId: string): boolean {
    const workflow = this.getWorkflow(sessionId);
    if (!workflow) return false;

    const currentStage = this.getCurrentStage(sessionId);
    if (!currentStage || currentStage.id !== stageId) return false;

    workflow.completedStages.push(stageId);
    workflow.currentStage++;
    
    return true;
  }

  getStageProgress(sessionId: string): {
    current: WorkflowStage | null;
    next: WorkflowStage | null;
    progress: number;
    completedCount: number;
    totalCount: number;
  } {
    const workflow = this.getWorkflow(sessionId);
    if (!workflow) {
      return {
        current: null,
        next: null,
        progress: 0,
        completedCount: 0,
        totalCount: CAMPAIGN_WORKFLOW_STAGES.length
      };
    }

    return {
      current: this.getCurrentStage(sessionId),
      next: this.getNextStage(sessionId),
      progress: (workflow.completedStages.length / workflow.stages.length) * 100,
      completedCount: workflow.completedStages.length,
      totalCount: workflow.stages.length
    };
  }

  generateStageGuidance(sessionId: string, currentTab: string): string {
    const workflow = this.getWorkflow(sessionId);
    if (!workflow) return '';

    const currentStage = this.getCurrentStage(sessionId);
    if (!currentStage) return '';

    const isOnCorrectTab = currentStage.tab === currentTab;
    const nextStage = this.getNextStage(sessionId);

    let guidance = '';

    if (!isOnCorrectTab) {
      guidance += `You're currently in the ${currentStage.name} stage. To proceed effectively, I recommend switching to the ${currentStage.tab.charAt(0).toUpperCase() + currentStage.tab.slice(1)} tab. `;
    }

    guidance += `**Current Stage: ${currentStage.name}**\n\n`;
    guidance += `${currentStage.description}\n\n`;
    
    guidance += `**Key Objectives:**\n`;
    currentStage.objectives.forEach(objective => {
      guidance += `• ${objective}\n`;
    });
    
    guidance += `\n**Suggested Actions:**\n`;
    currentStage.suggestedActions.forEach(action => {
      guidance += `• ${action}\n`;
    });

    if (nextStage) {
      guidance += `\n**Up Next:** ${nextStage.name} in the ${nextStage.tab.charAt(0).toUpperCase() + nextStage.tab.slice(1)} tab`;
    }

    return guidance;
  }

  shouldAdvanceStage(sessionId: string, sessionContext: any): boolean {
    const workflow = this.getWorkflow(sessionId);
    const currentStage = this.getCurrentStage(sessionId);
    
    if (!workflow || !currentStage) return false;

    // Check completion criteria based on session context
    const criteriaChecks = currentStage.completionCriteria.map(criteria => {
      switch (criteria) {
        case 'Project name defined':
          return sessionContext?.projectName && sessionContext.projectName.trim() !== '';
        case 'Brand and industry identified':
          return sessionContext?.brand && sessionContext?.industry;
        case 'Target audience specified':
          return sessionContext?.targetAudience && sessionContext.targetAudience.trim() !== '';
        case 'At least 3 research sessions completed':
          return sessionContext?.researchData && sessionContext.researchData.length >= 3;
        case 'Strategic brief generated':
          return sessionContext?.briefingData && sessionContext.briefingData.brandGuidelines;
        case 'Primary headlines created':
          return sessionContext?.generatedContent && 
                 sessionContext.generatedContent.some((c: any) => c.type === 'headline');
        case 'Hero campaign image created':
          return sessionContext?.visualAssets && 
                 sessionContext.visualAssets.some((a: any) => a.type === 'hero_image');
        default:
          return false;
      }
    });

    // Advance if at least 80% of criteria are met
    const completionRate = criteriaChecks.filter(Boolean).length / criteriaChecks.length;
    return completionRate >= 0.8;
  }
}

export const workflowOrchestrator = new CampaignWorkflowOrchestrator();