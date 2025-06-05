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

// Define all available research capabilities
export interface ResearchCapability {
  id: string;
  name: string;
  description: string;
  prompt: string;
  benefits: string[];
  optional: boolean;
}

export const RESEARCH_CAPABILITIES: ResearchCapability[] = [
  {
    id: 'competitor_analysis',
    name: 'Competitor Analysis',
    description: 'Analyze competitor strategies, messaging, and market positioning',
    prompt: 'Research competitors in your industry focusing on messaging strategies, positioning, pricing, and recent campaigns',
    benefits: [
      'Identify market gaps and opportunities',
      'Understand competitive messaging landscape',
      'Discover differentiation opportunities'
    ],
    optional: true
  },
  {
    id: 'market_research',
    name: 'Market Research',
    description: 'Current market trends, consumer behavior, and industry insights',
    prompt: 'Analyze current market trends, consumer preferences, and industry developments relevant to your campaign',
    benefits: [
      'Understand market dynamics',
      'Identify emerging opportunities',
      'Validate target audience assumptions'
    ],
    optional: true
  },
  {
    id: 'persona_simulation',
    name: 'Persona Research & Simulation',
    description: 'Deep dive into target audience psychology and behavior patterns',
    prompt: 'Research and simulate your target audience personas, including motivations, pain points, media consumption, and decision-making factors',
    benefits: [
      'Create detailed audience profiles',
      'Understand psychological triggers',
      'Optimize messaging for audience segments'
    ],
    optional: true
  },
  {
    id: 'campaign_analysis',
    name: 'Past Campaign Analysis',
    description: 'Study successful campaigns in your industry or category',
    prompt: 'Analyze successful past campaigns in your industry, examining strategies, execution, and performance metrics',
    benefits: [
      'Learn from proven strategies',
      'Identify successful patterns',
      'Avoid common pitfalls'
    ],
    optional: true
  },
  {
    id: 'design_trends',
    name: 'Design & Creative Trends',
    description: 'Current visual and creative trends relevant to your audience',
    prompt: 'Research current design trends, visual styles, and creative approaches that resonate with your target audience',
    benefits: [
      'Stay visually current',
      'Understand aesthetic preferences',
      'Inspire creative direction'
    ],
    optional: true
  },
  {
    id: 'brand_analysis',
    name: 'Brand Analysis',
    description: 'Deep analysis of your brand positioning and equity',
    prompt: 'Analyze your brand\'s current market position, brand equity, perception, and strategic opportunities',
    benefits: [
      'Understand brand strengths',
      'Identify positioning opportunities',
      'Align campaign with brand values'
    ],
    optional: true
  }
];

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
      'Gather project fundamentals',
      'Define success metrics',
      'Set campaign parameters'
    ],
    completionCriteria: [
      'Project name defined',
      'Brand and industry identified',
      'Target audience specified',
      'Campaign objectives established'
    ]
  },
  {
    id: 'research_planning',
    name: 'Research Planning',
    description: 'Select research areas to strengthen campaign foundation',
    tab: 'sage',
    prerequisites: ['discovery'],
    objectives: [
      'Choose relevant research capabilities',
      'Prioritize research based on campaign needs',
      'Plan comprehensive intelligence gathering'
    ],
    suggestedActions: [
      'Review available research options',
      'Select priority research areas',
      'Plan research sequence'
    ],
    completionCriteria: [
      'Research plan established',
      'Priority areas identified'
    ]
  },
  {
    id: 'research_execution',
    name: 'Research Execution',
    description: 'Conduct selected research using SAGE reasoning engine',
    tab: 'sage',
    prerequisites: ['research_planning'],
    objectives: [
      'Execute selected research capabilities',
      'Gather comprehensive market intelligence',
      'Build strategic foundation'
    ],
    suggestedActions: [
      'Execute chosen research modules',
      'Analyze findings thoroughly',
      'Identify strategic insights'
    ],
    completionCriteria: [
      'Selected research completed',
      'Strategic insights gathered',
      'Market intelligence compiled'
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
  private selectedResearch: Map<string, string[]> = new Map(); // sessionId -> selected research IDs

  createWorkflow(sessionId: string, workflowType: string = 'standard'): CampaignWorkflow {
    const workflow: CampaignWorkflow = {
      id: sessionId,
      name: `Campaign Workflow - ${new Date().toISOString().split('T')[0]}`,
      description: 'Complete campaign development from discovery to delivery',
      stages: CAMPAIGN_WORKFLOW_STAGES,
      currentStage: 0,
      completedStages: [],
      sessionData: {
        selectedResearch: [],
        completedResearch: [],
        researchResults: {}
      }
    };

    this.workflows.set(sessionId, workflow);
    this.selectedResearch.set(sessionId, []);
    return workflow;
  }

  selectResearchCapability(sessionId: string, researchId: string): void {
    const selected = this.selectedResearch.get(sessionId) || [];
    if (!selected.includes(researchId)) {
      selected.push(researchId);
      this.selectedResearch.set(sessionId, selected);
      
      const workflow = this.getWorkflow(sessionId);
      if (workflow) {
        workflow.sessionData.selectedResearch = selected;
      }
    }
  }

  getSelectedResearch(sessionId: string): ResearchCapability[] {
    const selected = this.selectedResearch.get(sessionId) || [];
    return RESEARCH_CAPABILITIES.filter(cap => selected.includes(cap.id));
  }

  markResearchComplete(sessionId: string, researchId: string, results: string): void {
    const workflow = this.getWorkflow(sessionId);
    if (workflow) {
      if (!workflow.sessionData.completedResearch) {
        workflow.sessionData.completedResearch = [];
      }
      if (!workflow.sessionData.researchResults) {
        workflow.sessionData.researchResults = {};
      }
      
      if (!workflow.sessionData.completedResearch.includes(researchId)) {
        workflow.sessionData.completedResearch.push(researchId);
        workflow.sessionData.researchResults[researchId] = results;
      }
    }
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
    
    // Special handling for research planning stage
    if (currentStage.id === 'research_planning') {
      guidance += this.generateResearchOptionsGuidance(sessionId);
    } else if (currentStage.id === 'research_execution') {
      guidance += this.generateResearchExecutionGuidance(sessionId);
    } else {
      guidance += `**Key Objectives:**\n`;
      currentStage.objectives.forEach(objective => {
        guidance += `• ${objective}\n`;
      });
      
      guidance += `\n**Suggested Actions:**\n`;
      currentStage.suggestedActions.forEach(action => {
        guidance += `• ${action}\n`;
      });
    }

    if (nextStage) {
      guidance += `\n**Up Next:** ${nextStage.name} in the ${nextStage.tab.charAt(0).toUpperCase() + nextStage.tab.slice(1)} tab`;
    }

    return guidance;
  }

  generateResearchOptionsGuidance(sessionId: string): string {
    let guidance = 'I can help strengthen your campaign with several research capabilities. Each is optional - choose what\'s most valuable for your project:\n\n';
    
    RESEARCH_CAPABILITIES.forEach(capability => {
      guidance += `**${capability.name}** (Optional)\n`;
      guidance += `${capability.description}\n`;
      guidance += `Benefits: ${capability.benefits.join(', ')}\n\n`;
    });
    
    guidance += 'Simply tell me which research areas interest you, or say "skip research" to move to strategic brief development. You can always add more research later.\n\n';
    guidance += 'Example: "I\'d like competitor analysis and persona research" or "Let\'s do market research and design trends"\n';
    
    return guidance;
  }

  generateResearchExecutionGuidance(sessionId: string): string {
    const selectedResearch = this.getSelectedResearch(sessionId);
    if (selectedResearch.length === 0) {
      return 'No research selected. Moving to strategic brief development.\n';
    }

    let guidance = `Executing your selected research capabilities:\n\n`;
    
    selectedResearch.forEach(capability => {
      guidance += `**${capability.name}**\n`;
      guidance += `${capability.description}\n`;
      guidance += `Research focus: ${capability.prompt}\n\n`;
    });
    
    guidance += 'I\'ll conduct these research sessions using our reasoning engine and deep market analysis.\n';
    
    return guidance;
  }

  parseResearchSelection(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const selectedIds: string[] = [];
    
    RESEARCH_CAPABILITIES.forEach(capability => {
      const nameWords = capability.name.toLowerCase().split(' ');
      const hasAllWords = nameWords.every(word => lowerMessage.includes(word));
      const hasKeyTerms = capability.id.split('_').some(term => lowerMessage.includes(term));
      
      if (hasAllWords || hasKeyTerms) {
        selectedIds.push(capability.id);
      }
    });
    
    // Handle specific phrase mappings
    if (lowerMessage.includes('competitor') || lowerMessage.includes('competition')) {
      selectedIds.push('competitor_analysis');
    }
    if (lowerMessage.includes('market') && lowerMessage.includes('research')) {
      selectedIds.push('market_research');
    }
    if (lowerMessage.includes('persona') || lowerMessage.includes('audience')) {
      selectedIds.push('persona_simulation');
    }
    if (lowerMessage.includes('past campaign') || lowerMessage.includes('campaign analysis')) {
      selectedIds.push('campaign_analysis');
    }
    if (lowerMessage.includes('design') || lowerMessage.includes('creative') || lowerMessage.includes('visual')) {
      selectedIds.push('design_trends');
    }
    if (lowerMessage.includes('brand') && lowerMessage.includes('analysis')) {
      selectedIds.push('brand_analysis');
    }
    
    return [...new Set(selectedIds)]; // Remove duplicates
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