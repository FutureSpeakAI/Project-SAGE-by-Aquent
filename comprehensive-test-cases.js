/**
 * SAGE Platform Comprehensive Test Cases
 * 
 * These test cases exercise every feature across all modules:
 * - Free Prompt (Research, Personas, Context Controls, Prompt Router)
 * - Briefing (Document Upload, Library, Generation, Processing)
 * - Content (Generation, Library, Editing, Export)
 * - Visual (Agent Conversation, Brief Interpreter, Image Generation, Processing)
 * - Campaign Workflow (Stage Management, Research Capabilities, Progress Tracking)
 */

const TEST_CASES = {
  
  /**
   * TEST CASE 1: Global Tech Product Launch Campaign
   * Tests: Full campaign workflow from research to final deliverables
   * Features: All research capabilities, multi-persona interaction, complete briefing workflow
   */
  case1: {
    name: "Global Tech Product Launch Campaign",
    description: "Complete end-to-end campaign development for a new AI-powered fitness tracker",
    workflow: [
      // Phase 1: Initial Research & Strategy Development
      {
        module: "free_prompt",
        action: "research_initiation",
        steps: [
          "Navigate to Free Prompt tab",
          "Select 'Brand Tone Research' persona",
          "Enable context controls: Workflow tracking, Smart routing",
          "Research Query: 'Analyze the competitive landscape for AI-powered fitness trackers targeting millennials and Gen Z. Focus on positioning opportunities, pricing strategies, and key differentiators.'",
          "Verify Perplexity routing for web-enabled research",
          "Test prompt router switching between models based on query complexity"
        ],
        expected_results: [
          "Perplexity model automatically selected for research query",
          "Comprehensive competitive analysis with real market data",
          "Context preserved across multiple research iterations",
          "Workflow stage advancement tracked"
        ]
      },
      
      // Phase 2: Multi-Persona Strategic Planning
      {
        module: "free_prompt", 
        action: "persona_switching",
        steps: [
          "Switch to 'Strategic Marketing Consultant' persona",
          "Query: 'Based on the competitive research, develop a positioning strategy and key messaging pillars for our AI fitness tracker launch'",
          "Switch to 'Data & Analytics Specialist' persona", 
          "Query: 'What metrics should we track for this campaign and what would constitute success?'",
          "Switch to 'Creative Content Strategist' persona",
          "Query: 'Outline the content strategy and creative themes for this campaign across digital and traditional channels'"
        ],
        expected_results: [
          "Persona context switching maintains conversation continuity",
          "Different expertise reflected in responses",
          "Cross-persona insights building cohesive strategy",
          "Model routing adapts to different query types"
        ]
      },
      
      // Phase 3: Campaign Workflow Initiation
      {
        module: "campaign_workflow",
        action: "workflow_setup",
        steps: [
          "Initiate campaign workflow from research insights",
          "Select multiple research capabilities: Target Audience Analysis, Competitive Intelligence, Market Trends",
          "Execute selected research modules",
          "Advance to strategic briefing stage",
          "Track completion criteria and stage progress"
        ],
        expected_results: [
          "Workflow stages properly initiated",
          "Research capabilities execute with real data",
          "Progress tracking functions correctly",
          "Stage advancement logic works"
        ]
      },
      
      // Phase 4: Document-Based Briefing Creation
      {
        module: "briefing",
        action: "document_processing",
        steps: [
          "Navigate to Briefing tab",
          "Upload mock product specification document (PDF)",
          "Process document through PDF text extraction",
          "Generate comprehensive briefing from processed content",
          "Save briefing to library with proper metadata",
          "Edit and refine briefing content"
        ],
        expected_results: [
          "PDF text extraction works correctly",
          "Document content properly processed",
          "Briefing generation creates comprehensive output",
          "Library storage and retrieval functions",
          "Editing interface responsive and functional"
        ]
      },
      
      // Phase 5: Content Asset Development
      {
        module: "content",
        action: "asset_generation",
        steps: [
          "Navigate to Content tab",
          "Load briefing from library",
          "Generate multiple content types: Press release, social media copy, email campaign",
          "Test different AI models for content generation",
          "Edit generated content using rich text editor",
          "Export content in multiple formats",
          "Save content variations to library"
        ],
        expected_results: [
          "Briefing library integration works",
          "Multiple content types generated successfully", 
          "Model selection impacts content style/quality",
          "Rich text editor functions properly",
          "Export functionality works across formats",
          "Content library storage operational"
        ]
      },
      
      // Phase 6: Visual Asset Creation via Agent
      {
        module: "visual",
        action: "agent_conversation",
        steps: [
          "Navigate to Visual tab",
          "Access Brief Interpreter",
          "Load campaign briefing from library",
          "Verify agent acknowledges briefing receipt",
          "Engage in conversation to develop hero image concept",
          "Generate product lifestyle shot specifications",
          "Create social media visual variants",
          "Test conversation history persistence across tab switches"
        ],
        expected_results: [
          "Brief Interpreter loads briefings correctly",
          "Agent acknowledges briefing with context awareness",
          "Conversational flow builds comprehensive prompts",
          "Multiple image concepts developed iteratively",
          "Conversation history persists across sessions",
          "Professional advertising prompts generated"
        ]
      },
      
      // Phase 7: Image Generation & Processing
      {
        module: "visual",
        action: "image_creation",
        steps: [
          "Switch to standard image generation mode",
          "Verify GPT-image-1 model available in dropdown",
          "Generate hero product image using developed prompt",
          "Create variations using image processing tools",
          "Generate social media sized variants",
          "Save generated images to library with metadata",
          "Test image editing and enhancement features"
        ],
        expected_results: [
          "GPT-image-1 model accessible and functional",
          "High-quality product images generated",
          "Image processing tools work correctly",
          "Multiple format generation successful",
          "Image library storage and retrieval operational",
          "Metadata preservation across operations"
        ]
      }
    ],
    success_criteria: [
      "Complete campaign development from research to assets",
      "All AI models route correctly based on task",
      "Data persistence across all modules",
      "Professional-quality outputs generated",
      "Workflow progression logical and intuitive"
    ]
  },

  /**
   * TEST CASE 2: Multi-Brand Partnership Campaign
   * Tests: Complex briefing scenarios, cross-tab workflows, advanced features
   */
  case2: {
    name: "Multi-Brand Partnership Campaign", 
    description: "Develop campaign for Nike x Volkswagen collaboration with multiple stakeholders",
    workflow: [
      // Phase 1: Research-Heavy Strategic Foundation
      {
        module: "free_prompt",
        action: "advanced_research",
        steps: [
          "Execute comprehensive brand analysis using multiple research modes",
          "Test consensus engine with conflicting brand values",
          "Utilize prompt router's advanced model selection",
          "Generate strategic recommendations using reasoning models",
          "Test context panel with complex scenarios"
        ]
      },
      
      // Phase 2: Complex Briefing Development
      {
        module: "briefing",
        action: "multi_source_briefing",
        steps: [
          "Create briefing from multiple uploaded documents",
          "Test briefing library search and filtering",
          "Generate briefing requiring multiple visual assets",
          "Test briefing editing with rich formatting",
          "Validate briefing export functionality"
        ]
      },
      
      // Phase 3: Collaborative Content Creation
      {
        module: "content",
        action: "collaborative_workflow",
        steps: [
          "Generate content for multiple brand voices",
          "Test content editing with tracked changes",
          "Create content variations for different markets",
          "Test content library organization and tagging",
          "Validate content export in professional formats"
        ]
      },
      
      // Phase 4: Complex Visual Development
      {
        module: "visual",
        action: "multi_asset_creation",
        steps: [
          "Process briefing requiring 3+ distinct visual assets",
          "Test automatic tab switching for multiple prompts",
          "Generate advertising layouts with text placement zones",
          "Create co-branded visual materials",
          "Test advanced image processing features"
        ]
      }
    ]
  },

  /**
   * TEST CASE 3: Crisis Communication Response Campaign
   * Tests: Real-time features, emergency workflows, system stress testing
   */
  case3: {
    name: "Crisis Communication Response Campaign",
    description: "Rapid response campaign development under time pressure with real-time research",
    workflow: [
      // Phase 1: Real-Time Research & Analysis
      {
        module: "free_prompt",
        action: "real_time_research",
        steps: [
          "Execute real-time news monitoring queries",
          "Test rapid persona switching for crisis perspectives",
          "Utilize web-enabled models for current events",
          "Generate rapid strategic recommendations",
          "Test system performance under rapid query loads"
        ]
      },
      
      // Phase 2: Rapid Briefing Development
      {
        module: "briefing", 
        action: "emergency_briefing",
        steps: [
          "Create crisis communication briefing rapidly",
          "Test briefing generation speed and quality",
          "Validate briefing under time constraints",
          "Test emergency briefing templates",
          "Stress test document processing pipeline"
        ]
      },
      
      // Phase 3: Rapid Content Deployment
      {
        module: "content",
        action: "crisis_content",
        steps: [
          "Generate multiple crisis response messages",
          "Test rapid content iteration and refinement",
          "Create content for multiple channels simultaneously",
          "Validate content approval workflows",
          "Test emergency content export processes"
        ]
      },
      
      // Phase 4: Urgent Visual Assets
      {
        module: "visual",
        action: "rapid_visual_response", 
        steps: [
          "Generate crisis response visual materials quickly",
          "Test image generation under time pressure",
          "Create multiple format visuals rapidly",
          "Validate visual approval workflows",
          "Test emergency visual deployment features"
        ]
      }
    ]
  }
};

module.exports = { TEST_CASES };